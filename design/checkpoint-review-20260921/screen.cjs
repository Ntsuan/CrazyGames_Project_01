const fs=require('node:fs');const {run}=require('./model.cjs');
const schemes=[
 {id:'current_proposal',costGrowth:1.18,base:60,flat:false},
 {id:'flat20_cost118',costGrowth:1.18,base:20,flat:true},
 {id:'flat10_cost118',costGrowth:1.18,base:10,flat:true},
 {id:'flat20_cost120',costGrowth:1.20,base:20,flat:true},
 {id:'flat20_cost122',costGrowth:1.22,base:20,flat:true}
];
const results=[];
for(const scheme of schemes)for(const policy of ['death_only','cautious','ladder']){
 const r=run({...scheme,policy,seed:1,mult:1,maxRuns:20,maxMinutes:360});results.push(r);
 fs.writeFileSync(__dirname+'/screen-results.json',JSON.stringify({kind:'single_seed_screen_not_population_estimate',results},null,2));
 console.log(scheme.id,policy,r.clear100?'PASS':'CAP',r.minutes.toFixed(1)+'min','active='+r.active,'deaths='+r.deaths,'supply='+(r.crateShare*100).toFixed(1)+'%');
}
for(const scheme of [schemes[0],schemes[1]]){
 const r=run({...scheme,policy:'every10',seed:1,mult:1,maxRuns:10,maxMinutes:120});results.push(r);
 fs.writeFileSync(__dirname+'/screen-results.json',JSON.stringify({kind:'single_seed_screen_not_population_estimate',results},null,2));
 console.log('FARM',scheme.id,r.endReason,r.minutes.toFixed(1)+'min','souls='+r.creditedSouls,'rate='+(r.creditedSouls/r.minutes).toFixed(1));
}
