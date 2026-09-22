const {make}=require('./core-tests.cjs');const fs=require('fs'),path=require('path');
const rows=[],seeds=Number(process.env.SEEDS||10),cycles=Number(process.env.CYCLES||3);
for(const ratio of [.67,1.5,3])for(let seed=1;seed<=seeds;seed++){
 const g=make(seed);
 const result=g.run(`
 S.speed2=true;S.sfxOn=false;openingRunIn();
 let cycles=[],start=Date.now(),nextAction=Date.now(),iterations=0,firstAffix=null,totalHealing=0,reason='';
 const originalHit=dealPlayerHit,originalWall=checkWall;
 const originalLog=logEvent;
 logEvent=(type,data)=>{originalLog(type,data);if(firstAffix===null&&(type==='autoequip'||type==='fuse')&&Object.values(S.equip).some(x=>x&&x.affix))firstAffix=S.floor;};
 dealPlayerHit=()=>{const before=player.hp;originalHit();totalHealing+=Math.max(0,player.hp-before);};
 checkWall=dt=>{originalWall(dt);if(wall)reason=player.hp<=0?'hp_zero':'timeout';};
 const ranks=['fire','nano','neuro','shield','subdermal','blackmarket','overclock','fatal','resonance','adrenaline','ghoststep','lowhp','critsurge','killcycle','soulrush'];
 while(cycles.length<${cycles}&&iterations++<400000){
  __advance(1000/30);
  if(skillOfferOpen){const choices=curOffer.slice().sort((a,b)=>ranks.indexOf(a)-ranks.indexOf(b));pickSkill(choices[0]);}
  if(Date.now()>=nextAction&&!wall&&!skillOfferOpen){
   for(const slot of Object.keys(SLOTS))while(fuseInfo(slot))fuseSlot(slot);
   for(let k=0;k<200;k++){const a=cost(S.atkLv)/${ratio}<=cost(S.hpLv);if(S.gold<cost(a?S.atkLv:S.hpLv))break;$(a?'btnAtk':'btnHp').onclick();}
   nextAction=Date.now()+2000;
  }
  if(firstAffix===null&&Object.values(S.equip).some(x=>x&&x.affix))firstAffix=S.floor;
  loop(performance.now());
  if(![S.gold,S.souls,player.hp,cur.hp,calcStats().atk,calcStats().hp,calcStats().lifesteal].every(Number.isFinite))throw Error('non-finite state');
  if(S.gold<0||S.souls<0)throw Error('negative balance');
  if(wall){
   cycles.push({run:cycles.length+1,floor:S.floor,seconds:(Date.now()-start)/1000,reason,firstAffix,totalHealing,atkLv:S.atkLv,hpLv:S.hpLv,gear:Object.fromEntries(Object.entries(S.equip).map(([k,x])=>[k,x?.q??null]))});
   if(cycles.length>=${cycles})break;
   applyPrestige(1);while(S.souls>=treeCost('dmg'))buyTree('dmg');start=Date.now();firstAffix=null;totalHealing=0;
  }
 }
 cycles;
 `);
 if(result.length!==cycles)throw Error(`incomplete ${ratio}/${seed}`);
 rows.push({ratio,seed,cycles:result});
}
const quant=(xs,p)=>{xs=xs.slice().sort((a,b)=>a-b);return xs[Math.floor((xs.length-1)*p)];};
const summary=[];for(const ratio of [.67,1.5,3])for(let run=1;run<=cycles;run++){
 const items=rows.filter(x=>x.ratio===ratio).map(x=>x.cycles[run-1]);
 summary.push({ratio,run,n:items.length,floor:{p10:quant(items.map(x=>x.floor),.1),p50:quant(items.map(x=>x.floor),.5),p90:quant(items.map(x=>x.floor),.9)},minutes:quant(items.map(x=>x.seconds/60),.5),firstAffix:items.filter(x=>x.firstAffix!==null).length?quant(items.filter(x=>x.firstAffix!==null).map(x=>x.firstAffix),.5):null,affixReached:items.filter(x=>x.firstAffix!==null).length,healing:quant(items.map(x=>x.totalHealing),.5)});
}
fs.writeFileSync(path.join(__dirname,(process.env.OUTPUT_TAG||'current')+'-combat-results.json'),JSON.stringify({seeds,cycles,summary,rows},null,2));console.log(JSON.stringify(summary));
