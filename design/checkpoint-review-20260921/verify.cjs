const fs=require('node:fs');
const {run}=require('./model.cjs');
const mode=process.argv[2]||'compare';
const tasks=[];
if(mode==='compare'){
 for(const base of [10,20])for(const seed of [2,3])for(const policy of ['death_only','cautious'])tasks.push({base,seed,policy,mult:1});
}else if(mode==='stages'){
 for(const mult of [1.5,2,3,4])for(const seed of [1,2,3])tasks.push({base:20,seed,policy:'cautious',mult});
}else if(mode==='stage-controls'){
 for(const mult of [1.5,2,3,4])for(const seed of [1,2,3])tasks.push({base:20,seed,policy:'death_only',mult});
}else throw Error('Unknown mode');
const results=[];
for(const task of tasks){
 const r=run({id:'flat'+task.base+'_cost118',costGrowth:1.18,flat:true,maxRuns:20,maxMinutes:360,...task});
 results.push(r);fs.writeFileSync(__dirname+'/'+mode+'-results.json',JSON.stringify({kind:'verification',results},null,2));
 console.log(mode,r.id,'mult='+r.mult,'seed='+r.seed,r.policy,r.clear100?'PASS':'CAP',r.minutes.toFixed(1)+'min','active='+r.active,'deaths='+r.deaths,'supply='+(r.crateShare*100).toFixed(1)+'%');
}
