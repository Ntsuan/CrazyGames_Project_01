const fs=require('node:fs'),assert=require('node:assert'),crypto=require('node:crypto');
const {make}=require('./harness.cjs');
const stages=[1,1.5,2,3,4],seeds=Number(process.env.SEEDS||5),results=[];
const sourceSha256=crypto.createHash('sha256').update(fs.readFileSync(__dirname+'/baseline.html')).digest('hex');
// Model interpretation: 60 seconds of online runtime, including normal transitions;
// battle speed does not accelerate the supply timer. Ad playback/waiting is excluded.
// First box at 60s; timer survives deaths, resets on entry to a new stage.
for(const [stageIndex,mult] of stages.entries()){
 for(let seed=1;seed<=seeds;seed++){
  const g=make(seed,mult,1.18,true);
  const row=g.json(`(()=>{
   S.sfxOn=false;S.speed2=true;openingRunIn();
   const start=Date.now();let nextCrateAt=start+60000,nextAction=Date.now(),runStart=start,steps=0;
   let crateGold=0,killGold=0,convertGold=0,earnedSouls=0,receivedSouls=0,totalCrates=0;
   const boxes=[],prestiges=[],runs=[];
   const realLog=logEvent,realKill=onKill;
   logEvent=(type,data)=>{if(type==='crate'){crateGold+=data.gold;totalCrates++;boxes.push({seconds:(Date.now()-start)/1000,run:runs.length+1,floor:S.floor,...data});}if(type==='drop_convert')convertGold+=data.value;realLog(type,data);};
   onKill=()=>{killGold+=calcGold(S.floor,isBoss());realKill();};
   const ranks=['fire','nano','neuro','shield','subdermal','blackmarket','overclock','fatal','resonance','adrenaline','ghoststep','lowhp','critsurge','killcycle','soulrush'];
   while(runs.length<20&&steps++<1800000){
    __advance(1000/30);
    if(skillOfferOpen){pickSkill(curOffer.slice().sort((a,b)=>ranks.indexOf(a)-ranks.indexOf(b))[0]);}
    if(!wall&&!skillOfferOpen&&Date.now()>=nextCrateAt){
     const before=S.cratesRun;openCrate();
     if(S.cratesRun===before+1)nextCrateAt=Date.now()+60000;
    }
    if(Date.now()>=nextAction&&!wall&&!skillOfferOpen){
     for(const slot of Object.keys(SLOTS))while(fuseInfo(slot))fuseSlot(slot);
     for(let k=0;k<200;k++){const a=cost(S.atkLv)/1.5<=cost(S.hpLv);if(S.gold<cost(a?S.atkLv:S.hpLv))break;$(a?'btnAtk':'btnHp').onclick();}
     nextAction=Date.now()+2000;
    }
    loop(performance.now());
    if(![S.gold,player.hp,calcStats().atk,calcStats().hp].every(Number.isFinite))throw Error('Non-finite');
    if(wall||S.floor>100){
     runs.push({run:runs.length+1,floor:S.floor,cleared100:S.floor>100,reason:S.floor>100?'clear100':player.hp<=0?'hp_zero':'timeout',minutes:(Date.now()-runStart)/60000,atkLv:S.atkLv,hpLv:S.hpLv,tree:{...S.tree},souls:S.runSouls,crates:S.cratesRun});
     if(S.floor>100||runs.length>=20)break;
     const raw=S.runSouls,before=S.souls;
     applyPrestige(2);
     if(S.floor!==1||S.runSouls!==0||S.souls-before!==raw*2)throw Error('Ad prestige did not credit double souls');
     prestiges.push({raw,received:S.souls-before,seconds:(Date.now()-start)/1000});earnedSouls+=raw;receivedSouls+=S.souls-before;
     let guard=0;
     while(guard++<10000){const choices=['dmg','gold','soul'].filter(k=>S.souls>=treeCost(k));if(!choices.length)break;choices.sort((a,b)=>(S.tree[a]+1)/({dmg:2,gold:2,soul:1}[a])-(S.tree[b]+1)/({dmg:2,gold:2,soul:1}[b]));buyTree(choices[0]);}
     runStart=Date.now();
    }
   }
   return {runs,boxes,prestiges,clear100:S.floor>100,minutes:(Date.now()-start)/60000,crates:totalCrates,crateGold,killGold,convertGold,crateShare:crateGold/(crateGold+killGold+convertGold),earnedSouls,receivedSouls,steps};
  })()`);
  assert(row.clear100,'Stage did not complete within model caps');
  assert.equal(row.prestiges.length,row.runs.length-1);
  assert.equal(row.receivedSouls,row.earnedSouls*2);
  assert(row.boxes[0].seconds>=60);
  for(let i=1;i<row.boxes.length;i++)assert(row.boxes[i].seconds-row.boxes[i-1].seconds>=60-1e-6);
  results.push({stage:stageIndex+1,mult,seed,...row});
  console.log(`Stage ${stageIndex+1} seed ${seed}: ${row.runs.length} runs, ${row.crates} boxes, ${row.minutes.toFixed(1)}min, ${(row.crateShare*100).toFixed(2)}% supply gold`);
 }
 fs.writeFileSync(__dirname+'/ads-results.json',JSON.stringify({status:'simulation_only',baselineVersion:'v2.43',sourceSha256,seeds,parameters:{initialMultipliers:stages,costGrowth:1.18,stageBoss:{hp:8,attack:2,shield:.8},crateIntervalSeconds:60,prestigeSoulMultiplier:2,crateFormula:'Existing 60x normal-mob gold × goldMult × (1+0.25n+0.02n²), each tenth ×2'},assumptions:['Each stage starts at floor1 with zero gear/upgrades/gold/skills/tree/souls','Runtime is online elapsed time including run-in and transitions, not multiplied by battle speed','First crate after60s; next60s from successful claim; timer continues through ordinary prestige; stage entry resets timer','No advertising playback duration, no failed ads or no-fill, no manual pause or waiting','Actual game combat/equipment/skill/upgrade/prestige functions; fixed skill priority; actions every2s; tree dmg:gold:soul=2:2:1','Independent fresh VM per stage; no actual stage-transition implementation or endless simulation','Existing quadratic box-count bonus and tenth-box bonus retained; count resets on ordinary prestige'],results},null,2));
}
// Directly check ad prestige even if every sample clears without dying.
const check=make(29,1,1.18,true);
check.run('S.floor=20;S.runSouls=25;S.souls=7;S.cratesRun=9;applyPrestige(2)');
assert.deepStrictEqual(check.json('[S.floor,S.souls,S.runSouls,S.cratesRun]'),[1,57,0,0]);
fs.writeFileSync(__dirname+'/ads-checks.json',JSON.stringify({allStagesCleared:true,totalSamples:results.length,crateSpacingAtLeast60Seconds:true,ordinaryPrestigeDoublesSouls:true,directPrestigeCheck:{rawSouls:25,previousSouls:7,finalSouls:57,crateCounterAfter:0},advertisingSdkIntegrated:false},null,2));
