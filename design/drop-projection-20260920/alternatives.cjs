// Analysis only. Does not write the game source or existing projection results.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const source=fs.readFileSync(path.join(__dirname,'../../game/index.html'),'utf8');
const reference=fs.readFileSync(path.join(__dirname,'crosscheck.cjs'),'utf8');
const start=reference.indexOf('const run=new Function'),end=reference.indexOf('const rows=run',start);
const getRun=new Function('text',`const a=text.indexOf('function dropBand('),b=text.indexOf('function dropRoll(',a);${reference.slice(start,end)}return run;`);
const scenarios=[
 {name:'current'},
 {name:'mob_35_percent',mobRate:.35},
 {name:'extend_100_150',extension:[100,150]},
 {name:'extend_125_200',extension:[125,200]},
 {name:'extend_150_250',extension:[150,250]},
];
const result={version:source.match(/const VERSION="([^"]+)"/)[1],sourceSha256:crypto.createHash('sha256').update(source).digest('hex'),trials:10000,scenarios:[]};
for(const s of scenarios){
 let text=source;
 if(s.extension){
  const [f1,f2]=s.extension;
  text=text.replace(/function dropBand\(f\)\{[^\n]*\}/,`function dropBand(f){return f<25?[0,2]:f<50?[1,3]:f<75?[2,4]:f<${f1}?[3,5]:f<${f2}?[4,6]:[5,7];}`);
  text=text.replace('5:[58,36,6]','5:[58,36,6],6:[58,36,6],7:[58,36,6]');
 }
 let run=getRun(text);
 if(s.mobRate)run=new Function('return ('+run.toString().replace('Math.random()>.25',`Math.random()>${s.mobRate}`)+')')();
 const rows=run(result.trials);
 result.scenarios.push({...s,rows});
 console.log(s.name,rows.map(r=>`${r.q}:${r.any.p50}/${r.all.p50}`).join(' '));
}
fs.writeFileSync(path.join(__dirname,'alternatives.json'),JSON.stringify(result,null,2));
