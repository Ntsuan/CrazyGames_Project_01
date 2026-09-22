const {make}=require('./core-tests.cjs');const fs=require('fs'),path=require('path');
const results=[];
for(let seed=1;seed<=10;seed++){
 const g=make(seed);
 const cycles=g.run(`
  S.speed2=true;S.sfxOn=false;openingRunIn();
  let cycles=[],start=Date.now(),nextAction=Date.now(),iterations=0;
  while(cycles.length<3&&iterations++<400000){
    __advance(1000/30);
    if(skillOfferOpen)pickSkill(curOffer[0]);
    if(Date.now()>=nextAction&&!wall&&!skillOfferOpen){
      Object.keys(SLOTS).forEach(fuseSlot);
      for(let k=0;k<200;k++){const a=cost(S.atkLv)/1.5<=cost(S.hpLv);if(S.gold<cost(a?S.atkLv:S.hpLv))break;$(a?'btnAtk':'btnHp').onclick();}
      nextAction=Date.now()+2000;
    }
    loop(performance.now());
    if(![S.gold,S.souls,player.hp,cur.hp,calcStats().atk,calcStats().hp].every(Number.isFinite))throw Error('non-finite state');
    if(S.gold<0||S.souls<0)throw Error('negative balance');
    if([...S.inv,...Object.values(S.equip).filter(Boolean)].some(x=>x.q<0||x.q>9))throw Error('invalid quality');
    if(wall){cycles.push({floor:S.floor,seconds:(Date.now()-start)/1000,events:curSession.events.length});applyPrestige(1);while(S.souls>=treeCost('dmg'))buyTree('dmg');start=Date.now();}
  }
  cycles;
 `);
 results.push({seed,passed:cycles.length===3,cycles});console.log(seed,cycles.map(x=>x.floor));
}
fs.writeFileSync(path.join(__dirname,'soak-results.json'),JSON.stringify({note:'10 seeded runs × 3 prestige cycles; 30 FPS virtual clock; actual game functions with DOM/audio mocks; not real-device soak',results},null,2));
