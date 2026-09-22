// In-memory assessment only. Does not modify game/index.html or any player save.
const fs=require('fs'),path=require('path'),assert=require('assert');process.env.GAME_HTML=path.resolve(__dirname,'../../game/index.html');
const {make}=require('../qa-stages-v2.46-20260921/harness.cjs');
function proto(g){
 const loop=g.run('loop.toString()');const start=loop.indexOf('  if(!paused && cur.hp<1e17){'),end=loop.indexOf('  saveTimer+=realDt');
 const block=loop.slice(start,end).replace(/Date\.now\(\)/g,'combatNow');
 g.run(`var combatNow=Date.now(),acc=0;var prototypeCombat=function(dt){${block}};`);
 g.run(`prototypeFrame=realDt=>{if(paused||stageBusy()||cur.hp>=1e17)return;acc+=realDt*effSpeed();while(acc+1e-10>=1/60){acc-=1/60;combatNow+=1000/60;prototypeCombat(1/60);if(paused||stageBusy()||cur.hp>=1e17){acc=0;break;}}};`);
}
const rows=[];
for(const fps of [60,30,15])for(const rate of [1,4,8,10,16,30]){
 const g=make();proto(g);g.run(`effSpeed=()=>${rate};paused=false;S.stage=5;S.floor=100;S.mobIdx=5;cur.hp=1e12;cur.atk=0;player.hp=1e12;var hits=0,shots=[],zero=combatNow;calcStats=()=>({atk:1,hp:1e12,aspd:10,crit:0,critDmg:1,goldMult:1,shieldPct:0});dealPlayerHit=()=>{hits++};enemyAnim=name=>{if(name==='cannon')shots.push((combatNow-zero)/1000)};`);
 const frames=Math.round(60/rate*fps);g.run(`for(let i=0;i<${frames};i++)prototypeFrame(${1/fps})`);
 const result=g.json('({hits,shots,gameSeconds:(combatNow-zero)/1000})');const expected=Math.floor(result.gameSeconds*10+1e-6);assert(Math.abs(result.hits-expected)<=1);
 rows.push({fps,rate,...result});
}
const buffs=[];
for(const rate of [1,4,8]){
 const g=make();proto(g);g.run(`paused=false;effSpeed=()=>${rate};cur.hp=1e12;cur.atk=0;player.hp=1e12;player.invulnUntil=combatNow+2000;`);
 g.run(`for(let i=0;i<${Math.ceil(2/rate*60)+1};i++)prototypeFrame(1/60)`);assert(g.run('combatNow>=player.invulnUntil'));buffs.push({rate,wallSeconds:(Math.ceil(2/rate*60)+1)/60,gameMs:g.run('combatNow-(player.invulnUntil-2000)')});
}
fs.writeFileSync(path.join(__dirname,'prototype-results.json'),JSON.stringify({scope:'In-memory 1/60-second combat stepping prototype, fake DOM/no rendering. Not a completed implementation or performance certification.',rows,buffs},null,2));console.log('Stepped combat cases:',rows.length,'PASS; clock probes:',buffs.length,'PASS');console.table(rows.filter(x=>x.rate===8).map(x=>({fps:x.fps,rate:x.rate,hits:x.hits,shots:x.shots.length,firstShot:x.shots[0]})));
