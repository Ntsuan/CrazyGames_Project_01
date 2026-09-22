// Run from any directory: node project.cjs [trials=10000]
// Executes the current game's drop and fusion functions, with UI calls stubbed.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const sourcePath=path.resolve(__dirname,'../../game/index.html');
const source=fs.readFileSync(sourcePath,'utf8');
function between(a,b){const i=source.indexOf(a),j=source.indexOf(b,i);if(i<0||j<0)throw Error(a);return source.slice(i,j);}
const extracted=between('const QUALITY=','// （DROPS')+'\n'+
  between('function dropBand(','function itemDesc(')+'\n'+
  between('function fuseInfo(','// ============ 技能');
const trials=Number(process.argv[2]||10000),cap=2500;
const body=`
const slots=['weapon','implant','armor','chip'];
let seed=0;
const Math=Object.create(globalThis.Math);
Math.random=()=>{let t=seed+=0x6D2B79F5;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return ((t^t>>>14)>>>0)/4294967296;};
const MOB_G=1.15;
let S;
const logEvent=()=>{},toast=()=>{},save=()=>{},renderPanels=()=>{},itemDesc=()=>'',fmt=()=>'';
${extracted}
const floorCuts=[20,25,50,75,100,150,200,300,500,750];
function run(policy){
 const rows=Array.from({length:10},()=>({any:[],weapon:[],all:[]}));
 const snapshots=Object.fromEntries(floorCuts.map(f=>[f,Array(10).fill(0)]));
 let totalDrops=0,totalFloors=0,dropEvents=0;
 for(let t=0;t<trials;t++){
  seed=(t+1)*7919;
  S={floor:1,pity:0,inv:[],gold:0,equip:Object.fromEntries(slots.map(s=>[s,null]))};
  const seen=Array.from({length:10},()=>({any:0,weapon:0,all:0}));
  let finished=false;
  for(let floor=1;floor<=cap;floor++){
   S.floor=floor;totalFloors++;
   for(let mob=0;mob<6;mob++){
    dropRoll(mob===5);
    if(policy!=='no_fuse')for(const slot of slots){
     let guard=0;while(fuseInfo(slot)){fuseSlot(slot);if(++guard>100)throw Error('fusion loop');}
    }
    const qs=slots.map(s=>S.equip[s]?.q??-1);
    const max=Math.max(...qs),min=Math.min(...qs);
    for(let q=0;q<10;q++){
     if(!seen[q].any&&max>=q)seen[q].any=floor;
     if(!seen[q].weapon&&qs[0]>=q)seen[q].weapon=floor;
     if(!seen[q].all&&min>=q)seen[q].all=floor;
    }
   }
   if(policy==='salvage')for(const slot of slots)salvage(slot);
   if(snapshots[floor])for(const slot of slots){const q=S.equip[slot]?.q;if(q!==undefined)snapshots[floor][q]++;}
   if(seen[9].all){finished=true;for(const f of floorCuts)if(f>floor)snapshots[f][9]+=4;break;}
   if(policy==='no_fuse'&&floor>=100)break;
  }
  if(policy!=='no_fuse'&&!finished)throw Error('cap reached');
  for(let q=0;q<10;q++)for(const key of ['any','weapon','all'])if(seen[q][key])rows[q][key].push(seen[q][key]);
 }
 function stats(a){a.sort((a,b)=>a-b);return {n:a.length,mean:a.length?a.reduce((s,x)=>s+x,0)/a.length:null,p10:a[Math.floor((a.length-1)*.1)]??null,p50:a[Math.floor((a.length-1)*.5)]??null,p90:a[Math.floor((a.length-1)*.9)]??null};}
 return {policy,trials,rows:rows.map((r,q)=>({q,name:QUALITY[q],any:stats(r.any),weapon:stats(r.weapon),all:stats(r.all)})),snapshots:Object.fromEntries(Object.entries(snapshots).map(([f,ns])=>[f,ns.map(n=>n/(trials*4))]))};
}
return ['keep','salvage','no_fuse'].map(run);
`;
const start=Date.now();
const scenarios=new Function('trials','cap',body)(trials,cap);
const result={sourcePath,sourceSha256:crypto.createHash('sha256').update(source).digest('hex'),version:source.match(/const VERSION="([^"]+)"/)[1],trials,elapsedSeconds:(Date.now()-start)/1000,assumptions:['Single uninterrupted run from floor 1 and empty gear','Five normal kills and one boss per floor','No deaths, reload farming, or prestige','Immediate repeated manual fusion until no valid recipes remain, except no_fuse','Threshold means equipped at least that quality; all means every slot','Floor is where loot was earned, before next-floor transition'],scenarios};
fs.writeFileSync(path.join(__dirname,'results.json'),JSON.stringify(result,null,2));
console.log(JSON.stringify(result,null,2));
