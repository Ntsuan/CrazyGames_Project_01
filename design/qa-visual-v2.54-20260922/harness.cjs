const fs=require('fs'),vm=require('vm'),assert=require('assert'),crypto=require('crypto'),path=require('path');
const html=fs.readFileSync(process.env.GAME_HTML||path.join(__dirname,'site/index.html'),'utf8');
const source=html.match(/<script>([\s\S]*?)<\/script>/)[1].split('// ============ 启动 ============')[0];
const results=[];
function make(seedValue=29){
 let now=100000,nextId=0,timers=[],seed=seedValue;const storage=new Map(),nodes=new Map();
 function element(){const classes=new Set();return {style:{},innerHTML:'',textContent:'',firstElementChild:{style:{}},offsetWidth:110,offsetLeft:0,offsetTop:0,classList:{add(...a){a.forEach(x=>classes.add(x));},remove(...a){a.forEach(x=>classes.delete(x));},contains:x=>classes.has(x),toggle(x,b){b??=!classes.has(x);if(b)classes.add(x);else classes.delete(x);}},appendChild(){},remove(){},click(){},querySelector(){return {textContent:''}}};}
 const math=Object.create(Math);math.random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
 class FakeDate extends Date{constructor(...a){super(...(a.length?a:[now]));}static now(){return now;}}
 const ctx=vm.createContext({console,Math:math,Date:FakeDate,performance:{now:()=>now},Image:function(){},Audio:function(){this.play=()=>Promise.resolve();},document:{body:element(),listenerCount:0,hidden:false,getElementById(id){if(!nodes.has(id))nodes.set(id,element());return nodes.get(id);},createElement:element,addEventListener(...a){this.listenerCount++}},window:{innerWidth:390,addEventListener(){}},localStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,String(v)),removeItem:k=>storage.delete(k)},setTimeout(fn,delay){timers.push({fn,at:now+(delay||0),id:++nextId});return nextId;},clearTimeout(id){timers=timers.filter(x=>x.id!==id);},requestAnimationFrame(){},cancelAnimationFrame(){},getComputedStyle:()=>({backgroundImage:''}),URL,Blob});
 vm.runInContext(source,ctx);vm.runInContext('if(typeof boot!=="undefined")boot.phase="playing";__realLunge=lunge;toast=floatDmg=lunge=enemyAnim=enemyDie=()=>{};S=freshState();newSession();spawnMob();',ctx);
 const advance=ms=>{const end=now+ms;let n=0;while(true){timers.sort((a,b)=>a.at-b.at);if(!timers.length||timers[0].at>end)break;const t=timers.shift();now=t.at;t.fn();if(++n>10000)throw Error('timer overflow');}now=end;};ctx.__advance=advance;
 return {run:s=>vm.runInContext(s,ctx),json:s=>JSON.parse(vm.runInContext('JSON.stringify('+s+')',ctx)),advance,storage,nodes};
}
function test(id,area,name,fn){const g=make();try{const evidence=fn(g);results.push({id,area,name,status:'PASS',evidence:evidence??null});}catch(e){results.push({id,area,name,status:'FAIL',error:e.message});}}
const near=(a,b)=>assert(Math.abs(a-b)<1e-8,`${a} vs ${b}`);

module.exports={make};
