const fs=require('node:fs'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const {make}=require('./harness.cjs');
const hash=p=>crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const baseline=hash(__dirname+'/baseline.html');
assert.equal(hash(__dirname+'/../../game/index.html'),baseline,'Production changed: rebase this report before delivery');
const screen=JSON.parse(fs.readFileSync(__dirname+'/screen-results.json')).results;
const previous=JSON.parse(fs.readFileSync(__dirname+'/../stage-design-20260921/ads-results.json')).results.find(r=>r.stage===1&&r.seed===1);
const now=screen.find(r=>r.id==='current_proposal'&&r.policy==='death_only');
for(const k of ['minutes','crates','crateGold','killGold','convertGold'])assert.equal(now[k],previous[k],k);
const direct=[];
for(const mult of [1,2]){
 const g=make(1,1,1.18,true);
 g.run('S.floor=21;S.runSouls=25;S.souls=7;S.tree={dmg:2,gold:3,soul:1};S.cratesRun=9;S.atkLv=8;S.hpLv=7;S.skills=["fire"];S.pity=5;');
 g.run('applyPrestige('+mult+')');
 const state=g.json('({floor:S.floor,souls:S.souls,runSouls:S.runSouls,tree:S.tree,cratesRun:S.cratesRun,atkLv:S.atkLv,hpLv:S.hpLv,skills:S.skills,pity:S.pity,equip:S.equip,inv:S.inv})');
 assert.equal(state.floor,1);assert.equal(state.souls,7+25*mult);assert.equal(state.runSouls,0);
 assert.deepEqual(state.tree,{dmg:2,gold:3,soul:1});
 for(const key of ['cratesRun','atkLv','hpLv','pity'])assert.equal(state[key],0);
 assert.equal(state.skills.length,0);assert.equal(state.inv.length,0);assert(Object.values(state.equip).every(x=>x===null));
 direct.push({mult,state});
}
const files=['screen','compare','stages','stage-controls','farm'];
const rows=files.flatMap(f=>JSON.parse(fs.readFileSync(__dirname+'/'+f+'-results.json')).results);
let boxCount=0,resetCount=0;
for(const r of rows){
 for(let i=0;i<r.boxes.length;i++)assert(r.boxes[i].seconds-(i?r.boxes[i-1].seconds:0)>=60-1e-6);
 for(const v of r.resets){assert.equal(v.received,2*v.raw);if(v.reason==='active')assert(v.checkpoint>=10&&v.checkpoint<=90&&v.checkpoint%10===0);}
 assert.equal(r.active+r.deaths,r.resets.length);
 if(r.clear100)assert.equal(r.runs.at(-1).reason,'clear100');
 boxCount+=r.boxes.length;resetCount+=r.resets.length;
}
const result={status:'simulation_only',baselineVersion:'v2.43',sourceSha256:baseline,productionUnchanged:true,priorSeed1Parity:true,samples:rows.length,boxCount,resetCount,crateSpacingAtLeast60Seconds:true,activeOnlyAtCleared10Through90:true,allObservedPrestigeRewardsDouble:true,normalAndAdPrestigeDirectChecks:direct,advertisingSdkIntegrated:false,stageTransitionImplemented:false};
fs.writeFileSync(__dirname+'/checks.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result,null,2));
