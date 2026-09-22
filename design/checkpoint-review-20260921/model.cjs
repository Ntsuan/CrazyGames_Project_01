const {make}=require('./harness.cjs');
const assert=require('node:assert');
function run(c){
 const g=make(c.seed||1,c.mult||1,c.costGrowth,true);
 // UI rendering and localStorage writes do not affect simulated combat.
 g.run('renderPanels=()=>{};save=()=>{};');
 if(c.base!==60||c.flat)g.run(`openCrate=eval('('+openCrate.toString().replace('mobGold(S.floor)*60*','mobGold(S.floor)*${c.base}*')${c.flat?`.replace('const mult=1+0.25*n+0.02*n*n;','const mult=1;').replace('const milestone=(n+1)%10===0?2:1;','const milestone=1;')`:''}+')')`);
 const result=g.json(`(()=>{
  const policy=${JSON.stringify(c.policy)},farmResets=${c.farmResets||0},maxRuns=${c.maxRuns||20},maxMinutes=${c.maxMinutes||360};
  S.sfxOn=false;S.speed2=true;openingRunIn();
  const start=Date.now();let nextCrateAt=start+60000,nextAction=Date.now(),runStart=start,steps=0;
  let crateGold=0,killGold=0,convertGold=0,recycledGold=0,totalCrates=0,creditedSouls=0,active=0,deaths=0,nextTarget=10,lastActiveFloor=0;
  let pending=null,firstWall=null;
  const runs=[],boxes=[],resets=[],choices=[];
  const realLog=logEvent,realKill=onKill;
  logEvent=(type,data)=>{if(type==='crate'){crateGold+=data.gold;totalCrates++;boxes.push({seconds:(Date.now()-start)/1000,floor:S.floor,n:data.n,gold:data.gold});}if(type==='drop_convert')convertGold+=data.value;realLog(type,data);};
  onKill=()=>{
   const f=S.floor,boss=isBoss(),hp=player.hp/calcStats().hp,fight=cur.fightT;
   killGold+=calcGold(f,boss);realKill();
   if(boss&&f%10===0&&f<100)pending={floor:f,hpRatio:hp,bossSeconds:fight,rawSouls:S.runSouls};
  };
  const ranks=${JSON.stringify(c.skillRanks||['fire','nano','neuro','shield','subdermal','blackmarket','overclock','fatal','resonance','adrenaline','ghoststep','lowhp','critsurge','killcycle','soulrush'])};
  function settle(reason,checkpoint){
   const raw=S.runSouls,before=S.souls,completed=S.maxFloor,sv=salvageAllGold().g;
   runs.push({run:runs.length+1,reason,floor:S.floor,completed,checkpoint,minutes:(Date.now()-runStart)/60000,crates:S.cratesRun,atkLv:S.atkLv,hpLv:S.hpLv,tree:{...S.tree},rawSouls:raw});
   if(reason==='active')active++;else deaths++;
   if(firstWall===null&&reason==='death')firstWall=S.floor;
   // Disposable integration: abandon the old skill choice and queued transition.
   S.pendingOffer=null;skillOfferOpen=false;curOffer=[];pendingSkillOffer=null;pendingTransit=false;confirmOpen=false;
   applyPrestige(2);
   if(S.floor!==1||S.souls-before!==raw*2)throw Error('Prestige reward mismatch');
   recycledGold+=sv;creditedSouls+=raw*2;
   resets.push({reason,completed,checkpoint,raw,received:S.souls-before,seconds:(Date.now()-start)/1000});
   let guard=0;
   while(guard++<10000){const keys=['dmg','gold','soul'].filter(k=>S.souls>=treeCost(k));if(!keys.length)break;keys.sort((a,b)=>(S.tree[a]+1)/({dmg:2,gold:2,soul:1}[a])-(S.tree[b]+1)/({dmg:2,gold:2,soul:1}[b]));buyTree(keys[0]);}
   runStart=Date.now();pending=null;
  }
  while(runs.length<maxRuns&&Date.now()-start<maxMinutes*60000&&steps++<1800000){
   __advance(1000/30);
   if(pending&&skillOfferOpen){
    const d=pending;pending=null;
    const accept=policy==='every10'||policy==='farm_then_push'&&active<farmResets||policy==='ladder'&&d.floor>=nextTarget||policy==='cautious'&&d.floor>lastActiveFloor&&(d.hpRatio<.35||d.bossSeconds>12);
    choices.push({...d,accept,seconds:(Date.now()-start)/1000});
    if(accept){lastActiveFloor=d.floor;if(policy==='ladder')nextTarget=d.floor+10;settle('active',d.floor);continue;}
   }
   if(skillOfferOpen)pickSkill(curOffer.slice().sort((a,b)=>ranks.indexOf(a)-ranks.indexOf(b))[0]);
   if(!wall&&!skillOfferOpen&&Date.now()>=nextCrateAt){const before=S.cratesRun;openCrate();if(S.cratesRun===before+1)nextCrateAt=Date.now()+60000;}
   if(Date.now()>=nextAction&&!wall&&!skillOfferOpen){
    for(const slot of Object.keys(SLOTS))while(fuseInfo(slot))fuseSlot(slot);
    for(let i=0;i<200;i++){const a=cost(S.atkLv)/1.5<=cost(S.hpLv);if(S.gold<cost(a?S.atkLv:S.hpLv))break;$(a?'btnAtk':'btnHp').onclick();}
    nextAction=Date.now()+2000;
   }
   loop(performance.now());
   if(![S.gold,player.hp,calcStats().atk,calcStats().hp].every(Number.isFinite))throw Error('Non-finite');
   if(S.floor>100){runs.push({run:runs.length+1,reason:'clear100',floor:S.floor,minutes:(Date.now()-runStart)/60000,crates:S.cratesRun,atkLv:S.atkLv,hpLv:S.hpLv,tree:{...S.tree},rawSouls:S.runSouls});break;}
   if(wall)settle('death',null);
  }
  const earned=crateGold+killGold+convertGold;
  return {clear100:S.floor>100,endReason:S.floor>100?'clear100':runs.length>=maxRuns?'run_cap':'time_or_step_cap',minutes:(Date.now()-start)/60000,crates:totalCrates,crateGold,killGold,convertGold,recycledGold,crateShare:crateGold/earned,active,deaths,creditedSouls,firstWall,finalTree:{...S.tree},runs,boxes,resets,choices};
 })()`);
 for(let i=0;i<result.boxes.length;i++)assert(result.boxes[i].seconds-(i?result.boxes[i-1].seconds:0)>=60-1e-6);
 for(const reset of result.resets){assert.equal(reset.received,reset.raw*2);if(reset.reason==='active')assert(reset.checkpoint>0&&reset.checkpoint<100&&reset.checkpoint%10===0);}
 return {...c,...result};
}
module.exports={run};
