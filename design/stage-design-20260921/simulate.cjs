const {make}=require('./harness.cjs');
const fs=require('fs'),crypto=require('crypto');
const mode=process.argv[2]||'candidates';
const configs=mode==='candidates'?[1,2,4,8,16,32,64].flatMap(mult=>[1,2,3].map(seed=>({mult,seed,cycles:1,crates:false}))):mode==='costpilot'?[1.18,1.20,1.22].map(costGrowth=>({mult:1,seed:1,cycles:6,crates:false,costGrowth})):
 mode==='stages'||mode==='gate'?[1,1.5,2,3,4].map(mult=>({mult,seed:1,cycles:12,crates:false,costGrowth:1.18,gatePreset:mode==='gate'})):[1,4,16].map(mult=>({mult,seed:1,cycles:8,crates:false}));
const results=[];
for(const config of configs){
 const g=make(config.seed,config.mult,config.costGrowth||1.25,config.gatePreset);
 const row=g.json(`(()=>{
 S.sfxOn=false;S.speed2=true;openingRunIn();
 let runs=[],steps=0,nextAction=Date.now(),runStart=Date.now(),firstFloorCrate=0;
 const ranks=['fire','nano','neuro','shield','subdermal','blackmarket','overclock','fatal','resonance','adrenaline','ghoststep','lowhp','critsurge','killcycle','soulrush'];
 while(runs.length<${config.cycles}&&steps++<1200000){
  __advance(1000/30);
  if(skillOfferOpen){pickSkill(curOffer.slice().sort((a,b)=>ranks.indexOf(a)-ranks.indexOf(b))[0]);}
  if(Date.now()>=nextAction&&!wall&&!skillOfferOpen){
   for(const slot of Object.keys(SLOTS))while(fuseInfo(slot))fuseSlot(slot);
   if(${config.crates}&&S.floor%5===0&&firstFloorCrate!==S.floor){openCrate();firstFloorCrate=S.floor;}
   for(let k=0;k<200;k++){const a=cost(S.atkLv)/1.5<=cost(S.hpLv);if(S.gold<cost(a?S.atkLv:S.hpLv))break;$(a?'btnAtk':'btnHp').onclick();}
   nextAction=Date.now()+2000;
  }
  loop(performance.now());
  if(![S.gold,player.hp,calcStats().hp,calcStats().atk].every(Number.isFinite))throw Error('non-finite');
  if(wall||S.floor>100){
   runs.push({run:runs.length+1,floor:S.floor,cleared100:S.floor>100,reason:S.floor>100?'clear100':player.hp<=0?'hp_zero':'timeout',minutes:(Date.now()-runStart)/60000,atkLv:S.atkLv,hpLv:S.hpLv,tree:{...S.tree},souls:S.runSouls,gear:Object.fromEntries(Object.entries(S.equip).map(([k,it])=>[k,it?.q??null]))});
   if(S.floor>100||runs.length>=${config.cycles})break;
   applyPrestige(1);
   // Keep a reproducible stage-internal growth policy; no ad doubling.
   let guard=0;
   while(guard++<10000){
    const candidates=['dmg','gold','soul'].filter(k=>S.souls>=treeCost(k));
    if(!candidates.length)break;
    candidates.sort((a,b)=>(S.tree[a]+1)/({dmg:2,gold:2,soul:1}[a])-(S.tree[b]+1)/({dmg:2,gold:2,soul:1}[b]));
    buyTree(candidates[0]);
   }
   runStart=Date.now();firstFloorCrate=0;
  }
 }
 return {runs,capHit:runs.length<${config.cycles}&&S.floor<=100,steps};
})()`);
 results.push({...config,...row});
 fs.writeFileSync(__dirname+'/'+mode+'-results.json',JSON.stringify({mode,version:'v2.43',sourceSha256:crypto.createHash('sha256').update(fs.readFileSync(__dirname+'/baseline.html')).digest('hex'),assumptions:['Only disposable VM overrides: initial attack/HP multiplier, optional costGrowth, optional gatePreset (100-layer boss HP8/ATK2/shield0.8)','No crates or ad double souls','Stage entry: empty gear, zero tree and souls, no carried currency','Actual combat and skill/gear functions, 30fps virtual clock, actions every 2 seconds','Upgrade cost bias attack:HP = 1.5; fixed skill priority','Cycles mode: deaths use existing prestige within the same stage; buy tree toward dmg:gold:soul=2:2:1','Clear100 means floor becomes101; no actual stage transition implementation','Three-seed candidate screen; one-seed cycle diagnostic, not population estimates'],results},null,2));
 console.log(config.mult+'x cost '+(config.costGrowth||1.25)+' seed '+config.seed+': '+row.runs.map(x=>x.floor+(x.cleared100?' clear':'')).join(' → ')+(row.capHit?' CAP':''));
}
