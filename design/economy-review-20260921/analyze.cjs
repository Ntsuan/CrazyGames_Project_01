const fs=require('node:fs'),crypto=require('node:crypto');
const {make}=require('./harness.cjs');
const g=make();
const curves=g.json(`(()=>{
 S=freshState();
 const floors=[1,5,10,15,20,25,30,40,50,75,100].map(f=>{
  S.floor=f;S.cratesRun=0;S.gold=0;adRelease();openCrate();
  return {floor:f,mob:calcGold(f,false),boss:calcGold(f,true),clear:5*calcGold(f,false)+calcGold(f,true),firstCrate:S.gold};
 });
 const levels=[0,5,10,15,20,25,30,40,50,75,100].map(n=>({level:n,next:cost(n),total:COST0*(COST_G**n-1)/(COST_G-1),baseAttack:ATK0*GROWTH**n,baseHp:HP0*GROWTH**n}));
 const boxes=[1,2,5,9,10,11,19,20,21,50,100].map(k=>{
  S=freshState();S.floor=20;S.cratesRun=k-1;adRelease();openCrate();
  return {box:k,gold:S.gold,floorEquivalent:S.gold/(5*calcGold(20,false)+calcGold(20,true))};
 });
 const flatBudget=(gold)=>{let a=0,h=0,spent=0;while(gold>=cost(Math.min(a,h))){if(a<=h){gold-=cost(a);spent+=cost(a++);}else{gold-=cost(h);spent+=cost(h++);}}return {atkLv:a,hpLv:h,spent};};
 // Controlled reference only: fixed goldMult=1, no gear sales, no skills, all kills successful.
 let cumulative=0;const naturalBudget=[];
 for(let f=1;f<=100;f++){cumulative+=20*MOB_G**f;if([10,20,30,40,50,75,100].includes(f))naturalBudget.push({floor:f,cumulative,...flatBudget(cumulative)});}
 S=freshState();S.floor=20;adRelease();for(let i=0;i<10;i++)openCrate();
 return {floors,levels,boxes,naturalBudget,tenInstantBoxes:{gold:S.gold,count:S.cratesRun},costGrowth:COST_G,statGrowth:GROWTH,enemyGrowth:MOB_G,levelPerFloorToMatchEnemy:Math.log(MOB_G)/Math.log(GROWTH),matchedCostGrowth:Math.pow(COST_G,Math.log(MOB_G)/Math.log(GROWTH))};
})()`);
const policies=[{id:'none',name:'不领补给'},{id:'once15',name:'仅15层领1箱'},{id:'every5',name:'每5层领1箱'},{id:'every1',name:'每层领1箱'}];
const seeds=Number(process.env.SEEDS||8),runs=[];
for(const policy of policies){
 for(let seed=1;seed<=seeds;seed++){
  const sim=make(seed);
  const row=sim.json(`(()=>{
   const policy=${JSON.stringify(policy.id)};
   S.sfxOn=false;openingRunIn();
   let combatGold=0,crateGold=0,conversionGold=0,spent=0,lastCrateFloor=0,steps=0,nextAction=Date.now(),reason=null;
   const trace=[];
   const originalKill=onKill,originalLog=logEvent;
   onKill=()=>{combatGold+=calcGold(S.floor,isBoss());originalKill();};
   logEvent=(type,data)=>{if(type==='crate')crateGold+=data.gold;if(type==='drop_convert')conversionGold+=data.value;originalLog(type,data);};
   const ranks=['fire','nano','neuro','shield','subdermal','blackmarket','overclock','fatal','resonance','adrenaline','ghoststep','lowhp','critsurge','killcycle','soulrush'];
   while(!wall&&S.floor<=200&&steps++<200000){
    __advance(1000/30);
    if(skillOfferOpen){const choices=curOffer.slice().sort((a,b)=>ranks.indexOf(a)-ranks.indexOf(b));pickSkill(choices[0]);}
    if(Date.now()>=nextAction&&!wall&&!skillOfferOpen){
     for(const slot of Object.keys(SLOTS))while(fuseInfo(slot))fuseSlot(slot);
     const eligible=policy==='every1'||policy==='every5'&&S.floor%5===0||policy==='once15'&&S.floor===15;
     if(eligible&&lastCrateFloor!==S.floor){openCrate();lastCrateFloor=S.floor;}
     for(let k=0;k<200;k++){
      const a=cost(S.atkLv)/1.5<=cost(S.hpLv),c=cost(a?S.atkLv:S.hpLv);
      if(S.gold<c)break;
      spent+=c;$(a?'btnAtk':'btnHp').onclick();
     }
     if(trace.at(-1)?.floor!==S.floor)trace.push({floor:S.floor,atkLv:S.atkLv,hpLv:S.hpLv,nextAtk:cost(S.atkLv),nextHp:cost(S.hpLv),goldMult:calcStats().goldMult,clearGold:10*mobGold(S.floor)*calcStats().goldMult,crates:S.cratesRun,combatGold,crateGold});
     nextAction=Date.now()+2000;
    }
    loop(performance.now());
    if(![S.gold,player.hp,calcStats().atk,calcStats().hp].every(Number.isFinite))throw Error('Non-finite state');
   }
   reason=wall?(player.hp<=0?'hp_zero':'timeout'):(S.floor>200?'floor_cap':'step_cap');
   const income=combatGold+crateGold+conversionGold;
   if(Math.abs(income-spent-S.gold)>1e-7*Math.max(1,income))throw Error('Income/spend reconciliation failed');
   return {floor:S.floor,reason,atkLv:S.atkLv,hpLv:S.hpLv,crates:S.cratesRun,combatGold,crateGold,conversionGold,spent,balance:S.gold,crateShare:crateGold/income,trace};
  })()`);
  runs.push({policy:policy.id,seed,...row});
 }
 console.log(policy.name,'finished',seeds,'runs');
}
const quant=(xs,p)=>{xs=[...xs].sort((a,b)=>a-b);if(p===.5&&xs.length%2===0)return (xs[xs.length/2-1]+xs[xs.length/2])/2;return xs[Math.floor((xs.length-1)*p)];};
const summary=policies.map(p=>{const r=runs.filter(x=>x.policy===p.id);return {...p,n:r.length,floorP10:quant(r.map(x=>x.floor),.1),floorP50:quant(r.map(x=>x.floor),.5),floorP90:quant(r.map(x=>x.floor),.9),cratesP50:quant(r.map(x=>x.crates),.5),crateShareP50:quant(r.map(x=>x.crateShare),.5),atkLvP50:quant(r.map(x=>x.atkLv),.5),hpLvP50:quant(r.map(x=>x.hpLv),.5),completedDeaths:r.filter(x=>['hp_zero','timeout'].includes(x.reason)).length};});
const html=fs.readFileSync(__dirname+'/source-v2.43.html','utf8');
const output={version:html.match(/const VERSION="([^"]+)"/)[1],sha256:crypto.createHash('sha256').update(html).digest('hex'),seeds,assumptions:['Node VM actual game code with UI/audio stubs, virtual 30fps','First run only; no prestige; no ad duration or real ad SDK','Actions every 2 seconds, immediate skill choice using fixed ranks, repeated manual fusion','Attack preference 1.5 relative to HP upgrade price; no sales or salvage','Identical initial seeds; later RNG consumption may diverge across policies','Floor cap 200; step cap 200000; capped samples must not be treated as deaths'],curves,summary,runs};
fs.writeFileSync(__dirname+'/results.json',JSON.stringify(output,null,2));
console.table(summary);
console.table(curves.naturalBudget);
