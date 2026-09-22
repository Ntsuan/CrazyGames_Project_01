const {make}=require('./harness.cjs');const fs=require('fs'),path=require('path');
const results=[];
for(const target of [10,20,Infinity])for(let seed=1;seed<=5;seed++){
 const g=make(seed);
 const cycles=g.run(`
  S.speed2=true;S.sfxOn=false;renderPanels=renderCombat=()=>{};openingRunIn();
  let cycles=[],start=Date.now(),nextAction=Date.now(),iterations=0;
  while(cycles.length<3&&iterations++<500000){
    __advance(1000/30);
    const po=S.prestigeOffer;
    if(po&&$("overlay").classList.contains("show")&&!deathWait){
      if(po.stage==="choice") {if(po.floor>=${target})doPrestige();else continueMilestone();}
      else if(po.stage==="blocked")doPrestige();
      if(S.prestigeOffer&&S.prestigeOffer.stage==="preview"){
        const p=S.prestigeOffer;
        cycles.push({floor:p.floor,source:p.source,souls:p.souls,seconds:(Date.now()-start)/1000});
        applyPrestige(1);while(S.souls>=treeCost('dmg'))buyTree('dmg');start=Date.now();
      }
    }
    if(skillOfferOpen)pickSkill(curOffer[0]);
    if(Date.now()>=nextAction&&!wall&&!paused&&!skillOfferOpen&&!S.prestigeOffer){
      Object.keys(SLOTS).forEach(fuseSlot);
      for(let k=0;k<200;k++){const a=cost(S.atkLv)/1.5<=cost(S.hpLv);if(S.gold<cost(a?S.atkLv:S.hpLv))break;$(a?'btnAtk':'btnHp').onclick();}
      nextAction=Date.now()+2000;
    }
    loop(performance.now());
    if(![S.gold,S.souls,player.hp,cur.hp].every(Number.isFinite))throw Error('non-finite state');
    if(S.gold<0||S.souls<0)throw Error('negative balance');
  }
  cycles;
 `);
 if(cycles.length!==3)throw Error('incomplete strategy run');
 results.push({target:Number.isFinite(target)?target:'wall',seed,cycles});console.log(target,seed,cycles.map(x=>[x.floor,x.source,Math.round(x.seconds)]));
}
const summary=[10,20,'wall'].map(target=>{const c=results.filter(x=>x.target===target).flatMap(x=>x.cycles);const souls=c.reduce((a,x)=>a+x.souls,0),seconds=c.reduce((a,x)=>a+x.seconds,0);return {target,cycles:c.length,totalSouls:souls,totalSeconds:seconds,soulsPerMinute:souls/seconds*60,firstCycleFloors:results.filter(x=>x.target===target).map(x=>x.cycles[0].floor)};});
const report={note:'5 seeds x 3 policies x 3 cycles = 45 cycles. Actual game functions in Node VM at 30FPS, upgrade ratio1.5, first skill option, fuse promptly, damage tree, previously-cleared floors2x. No crate, no ad bonus or ad duration, no human input delay. Policy20 falls back to death when unable to reach20. Not real-device or long-term balance approval.',summary,results};
fs.writeFileSync(path.join(__dirname,'strategy-results.json'),JSON.stringify(report,null,2));console.log(summary);
