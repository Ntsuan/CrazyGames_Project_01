const path=require('path'),fs=require('fs'),assert=require('assert');
const base=path.resolve(__dirname,'../../game/index.html');process.env.GAME_HTML=base;
const {make}=require('../qa-stages-v2.46-20260921/harness.cjs');
const rates=[1,2,4,8,10,16,30],fpsList=[60,30,15];const rows=[];
for(const fps of fpsList)for(const rate of rates){
 const g=make();g.run(`effSpeed=()=>${rate};renderPanels=renderCombat=()=>{};save=()=>{};paused=false;S.stage=5;S.floor=100;S.mobIdx=5;cur.hp=1e12;cur.atk=0;player.hp=1e12;var hits=0,shots=[],zero=performance.now();calcStats=()=>({atk:1,hp:1e12,aspd:10,crit:0,critDmg:1,goldMult:1,shieldPct:0});dealPlayerHit=()=>{hits++};enemyAnim=(name)=>{if(name==='cannon')shots.push((performance.now()-zero)*${rate}/1000)};`);
 const frames=Math.round(60/rate*fps);g.run(`for(let i=0;i<${frames};i++){__advance(${1000/fps});loop(performance.now())}`);
 const data=g.json('({hits,shots,backlog:atkTimer})');rows.push({fps,rate,gameSeconds:frames/fps*rate,expectedHits:600,...data});
}
const buffs=rates.map(rate=>{const g=make();g.run(`effSpeed=()=>${rate};player.invulnUntil=Date.now()+2000;buff.killcycle=Date.now()+3000;S.skills=['killcycle'];`);g.advance(2000);return {rate,invulnerabilityExpired:g.run('!(player.invulnUntil>Date.now())'),invulnerabilityGameSeconds:2*rate,killcycleGameSeconds:3*rate};});
const scenarios=[];
for(const rate of rates){
 const g=make();g.run(`effSpeed=()=>${rate};renderPanels=renderCombat=()=>{};save=()=>{};S.stage=1;S.floor=100;S.mobIdx=5;spawnMob();onKill()`);g.advance(1400/rate+1);
 assert(g.run('S.stageUpgrade.status==="clear"&&S.stage===1&&S.floor===100&&!S.prestigeOffer&&!S.pendingOffer'));
 scenarios.push({rate,gateCorrect:true});
}
const result={baseline:'v2.50',note:'Actual game loop with controlled 10 attacks/sec, inert target and stubbed audiovisual rendering. Simulated frames, not browser performance or phone certification.',rows,buffs,scenarios};
fs.writeFileSync(path.join(__dirname,'results.json'),JSON.stringify(result,null,2));
console.table(rows.filter(r=>[1,4,8,10,16,30].includes(r.rate)).map(r=>({fps:r.fps,rate:r.rate,hits:r.hits,expected:r.expectedHits,shots:r.shots.length,firstShotGameSeconds:r.shots[0]?.toFixed(3)})));
console.log('Boundary routing checks:',scenarios.length,'PASS');
console.log('8x invisibility:',buffs.find(x=>x.rate===8));
