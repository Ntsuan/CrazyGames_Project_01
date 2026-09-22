// Independent base-3 material-conservation model for the keep-materials policy.
const fs=require('node:fs'),path=require('node:path');
const text=fs.readFileSync(path.join(__dirname,'../../game/index.html'),'utf8');
const a=text.indexOf('function dropBand('),b=text.indexOf('function dropRoll(',a);
const trials=Number(process.argv[2]||10000);
const run=new Function('trials',`
let seed=0,S={pity:0};const Math=Object.create(globalThis.Math);
Math.random=()=>{let t=seed+=0x6D2B79F5;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return ((t^t>>>14)>>>0)/4294967296;};
${text.slice(a,b)}
const pow=Array.from({length:10},(_,q)=>3**q);
const rows=Array.from({length:10},()=>({any:[],weapon:[],all:[]}));
for(let t=0;t<trials;t++){
 seed=(t+1)*7919;S.pity=0;
 const mass=[0,0,0,0],qs=[-1,-1,-1,-1],prev={any:-1,weapon:-1,all:-1};
 outer:for(let f=1;f<=2500;f++)for(let mob=0;mob<6;mob++){
  if(mob<5&&Math.random()>.25)continue;
  const q=rollQuality(f);if(q>=dropBand(f)[1])S.pity=0;else S.pity++;
  const slot=Math.floor(Math.random()*4);
  if(qs[slot]<9){mass[slot]+=pow[q];while(qs[slot]<9&&mass[slot]>=pow[qs[slot]+1])qs[slot]++;}
  const curr={any:Math.max(...qs),weapon:qs[0],all:Math.min(...qs)};
  for(const k of ['any','weapon','all']){while(prev[k]<curr[k])rows[++prev[k]][k].push(f);}
  if(curr.all===9)break outer;
 }
}
function stats(a){a.sort((a,b)=>a-b);return {n:a.length,mean:a.reduce((s,x)=>s+x,0)/a.length,p10:a[Math.floor((a.length-1)*.1)],p50:a[Math.floor((a.length-1)*.5)],p90:a[Math.floor((a.length-1)*.9)]};}
return rows.map((r,q)=>({q,any:stats(r.any),weapon:stats(r.weapon),all:stats(r.all)}));
`);
const rows=run(trials);
fs.writeFileSync(path.join(__dirname,`crosscheck-${trials}.json`),JSON.stringify(rows,null,2));
console.log(rows.map(r=>({q:r.q,first:r.any.p50,range:[r.any.p10,r.any.p90],weapon:r.weapon.p50,all:r.all.p50})));
