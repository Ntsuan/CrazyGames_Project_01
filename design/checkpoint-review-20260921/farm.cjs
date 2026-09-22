const fs=require('node:fs');const {run}=require('./model.cjs');const results=[];
for(const farmResets of [3,10])for(const seed of [1,2,3]){
 const r=run({id:'flat20_cost118',costGrowth:1.18,base:20,flat:true,policy:'farm_then_push',farmResets,seed,mult:1,maxRuns:30,maxMinutes:360});
 results.push(r);fs.writeFileSync(__dirname+'/farm-results.json',JSON.stringify({results},null,2));
 console.log('farm_then_push','farmResets='+farmResets,'seed='+seed,r.clear100?'PASS':'CAP',r.minutes.toFixed(1)+'min','active='+r.active,'deaths='+r.deaths);
}
