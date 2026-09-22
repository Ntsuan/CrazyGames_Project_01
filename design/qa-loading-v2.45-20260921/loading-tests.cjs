const fs=require('fs'),vm=require('vm'),assert=require('assert'),path=require('path');
const root=path.resolve(__dirname,'../..'),html=fs.readFileSync(root+'/game/index.html','utf8');
const code=html.split('// ============ v2.45：统一素材清单与封面加载门控 ============')[1].split('// ============ 测试日志系统 ============')[0];
const results=[];
const flush=async()=>{for(let i=0;i<30;i++)await Promise.resolve();};
function setup(){
  const nodes=new Map(),timers=new Map(),frames=[],images=[];let serial=0;
  function node(id){if(!nodes.has(id))nodes.set(id,{style:{},hidden:false,disabled:false,attrs:{},classList:{add(){},remove(){}},setAttribute(k,v){this.attrs[k]=v;},focus(){},remove(){this.removed=true;}});return nodes.get(id);}
  const ctx=vm.createContext({console,URL,Promise,AbortController,Image:class{constructor(){images.push(this);}decode(){return Promise.resolve();}},
    document:{querySelectorAll:()=>[],body:{classList:{remove(){}}}},$:node,paused:false,S:{},SFX_SRC:'assets/sfx/laser-shot-01.wav',sfxPool:[],performance:{now:()=>99},lastT:0,
    setTimeout(fn,ms){timers.set(++serial,{fn,ms});return serial;},clearTimeout(id){timers.delete(id);},
    requestAnimationFrame:fn=>frames.push(fn),matchMedia:()=>({matches:false}),openingRunIn(){ctx.entries++;},doReset(){ctx.resets++;},entries:0,resets:0,
    fetch:()=>Promise.reject(Error('network failed'))});
  vm.runInContext(code,ctx);
  const run=s=>vm.runInContext(s,ctx);
  const timer=async ms=>{for(const [id,t] of [...timers])if(t.ms===ms){timers.delete(id);t.fn();}await flush();};
  const enter=async()=>{while(frames.length)frames.shift()();await timer(450);};
  return {ctx,run,node,images,timers,frames,timer,enter};
}
async function test(name,fn){try{await fn();results.push({name,pass:true});}catch(e){results.push({name,pass:false,error:e.stack});}}
(async()=>{
await test('清单覆盖全部静态图片、动态图标与音效文件',()=>{
 const g=setup(),list=Array.from(g.run('BOOT_IMAGES'));
 assert.equal(new Set(list).size,list.length);
 for(const file of list)assert(fs.existsSync(root+'/game/'+file),file);
 const staticPaths=[...html.matchAll(/assets\/[\w/-]+\.(?:png|webp|svg)/g)].map(x=>x[0]);
 for(const file of staticPaths)assert(list.includes(file),file);
 for(const file of fs.readdirSync(root+'/game/assets/icons'))assert(list.includes('assets/icons/'+file),file);
 assert(fs.existsSync(root+'/game/'+g.ctx.SFX_SRC));
 assert(!html.includes('素材就绪后自动进入'));
});
await test('未就绪时进度真实且不入场，连点合并，全部就绪后只进入一次',async()=>{
 const g=setup();g.run('boot.assets=[{url:"one",state:"pending"},{url:"two",state:"pending"}];let release;loadBootAsset=a=>a.url==="one"?Promise.resolve():new Promise(r=>release=r)');
 const a=g.run('startCoverLoad()'),b=g.run('startCoverLoad()');await flush();await b;
 assert.equal(g.run('boot.phase'),'loading');assert.equal(g.node('loadingPercent').textContent,'50%');assert.equal(g.ctx.entries,0);assert(g.ctx.paused);
 g.run('release()');await a;assert.equal(g.node('loadingPercent').textContent,'100%');assert.equal(g.ctx.entries,0);
 await g.enter();assert.equal(g.ctx.entries,1);assert.equal(g.run('boot.phase'),'playing');await g.run('startCoverLoad()');assert.equal(g.ctx.entries,1);
});
await test('单项失败不入场；重试仅加载失败项并保留进度',async()=>{
 const g=setup();g.run('boot.assets=[{url:"ok",state:"pending"},{url:"fail",state:"pending"}];let fail=true;let counts={};loadBootAsset=a=>{counts[a.url]=(counts[a.url]||0)+1;return a.url==="fail"&&fail?Promise.reject(Error()):Promise.resolve()}');
 await g.run('startCoverLoad()');assert.equal(g.run('boot.phase'),'failed');assert.equal(g.node('loadingPercent').textContent,'50%');assert.equal(g.node('btnLoadRetry').hidden,false);assert.equal(g.ctx.entries,0);
 g.run('fail=false');await g.run('startCoverLoad()');await g.enter();assert.equal(g.run('counts.ok'),1);assert.equal(g.run('counts.fail'),2);assert.equal(g.ctx.entries,1);
});
await test('清档意图等加载成功后执行，失败期间不清档',async()=>{
 const g=setup();g.run('boot.assets=[{url:"x",state:"pending"}];loadBootAsset=()=>Promise.reject(Error())');await g.run('startCoverLoad(true)');assert.equal(g.ctx.resets,0);
 g.run('loadBootAsset=()=>Promise.resolve()');await g.run('startCoverLoad(boot.resetRequested)');assert.equal(g.ctx.resets,0);await g.enter();assert.equal(g.ctx.resets,1);assert.equal(g.ctx.entries,0);
});
await test('预热就绪后进入不重复下载，不添加倒计时',async()=>{
 const g=setup();g.run('boot.assets=[{url:"a",state:"pending"}];let count=0;loadBootAsset=()=>{count++;return Promise.resolve()}');await g.run('prepareAssets()');await g.run('startCoverLoad()');
 assert.equal(g.run('count'),1);assert.equal(g.node('loadingPercent').textContent,'100%');assert.equal(g.run('boot.phase'),'entering');await g.enter();assert.equal(g.ctx.entries,1);
});
await test('后台预热与点击共享同一在途请求',async()=>{
 const g=setup();g.run('boot.assets=[{url:"a",state:"pending"}];let release,count=0;loadBootAsset=()=>{count++;return new Promise(r=>release=r)}');const warm=g.run('prepareAssets()');const start=g.run('startCoverLoad()');g.run('release()');await warm;await start;assert.equal(g.run('count'),1);
});
await test('并行素材任务上限六个',async()=>{
 const g=setup();g.run('boot.assets=Array.from({length:10},(_,i)=>({url:String(i),state:"pending"}));let releases=[],active=0,peak=0;loadBootAsset=()=>{active++;peak=Math.max(peak,active);return new Promise(r=>releases.push(()=>{active--;r()}))}');const p=g.run('prepareAssets()');assert.equal(g.run('peak'),6);g.run('releases.splice(0).forEach(f=>f())');await flush();g.run('releases.splice(0).forEach(f=>f())');await p;assert.equal(g.run('peak'),6);
});
await test('图片解码完成才计就绪，解码失败可重试',async()=>{
 const g=setup();let decode;const asset={url:'a',type:'image'};g.ctx.asset=asset;const p=g.run('loadBootAsset(asset)');let done=false;p.then(()=>done=true);g.images[0].decode=()=>new Promise(r=>decode=r);g.images[0].onload();await flush();assert(!done);decode();await p;assert(asset.image);
 const q=g.run('loadBootAsset(asset)').then(()=>false,()=>true);g.images[1].decode=()=>Promise.reject(Error());g.images[1].onload();assert(await q);
});
await test('图片网络失败、超时和迟到回调不会误报成功',async()=>{
 const g=setup();g.ctx.asset={url:'a',type:'image'};const p=g.run('loadBootAsset(asset)').then(()=>false,()=>true);g.images[0].onerror();assert(await p);
 const q=g.run('loadBootAsset(asset)').then(()=>false,()=>true);const late=g.images[1].onload;await g.timer(20000);assert(await q);await late();assert(!g.ctx.asset.image);
});
await test('慢加载提示不伪造进度，完成后清除提示定时器',async()=>{
 const g=setup();g.run('boot.assets=[{url:"a",state:"pending"}];let release;loadBootAsset=()=>new Promise(r=>release=r)');const p=g.run('startCoverLoad()');await g.timer(8000);assert.equal(g.node('loadingPercent').textContent,'0%');assert.equal(g.node('loadingStatus').textContent,'加载较慢，请稍候…');g.run('release()');await p;assert.equal(g.node('loadingStatus').textContent,'准备完成');
});
await test('音效下载失败和空响应均阻止完成',async()=>{
 const g=setup();g.ctx.asset={type:'audio',url:'a'};assert(await g.run('loadBootAsset(asset)').then(()=>false,()=>true));
 g.ctx.fetch=()=>Promise.resolve({ok:true,blob:()=>Promise.resolve({size:0})});assert(await g.run('loadBootAsset(asset)').then(()=>false,()=>true));
});
await test('音效请求超时会中止请求',async()=>{
 const g=setup();let signal;g.ctx.fetch=(u,o)=>{signal=o.signal;return new Promise(()=>{});};g.ctx.asset={type:'audio',url:'a'};
 const p=g.run('loadBootAsset(asset)').then(()=>false,()=>true);await g.timer(20000);assert(await p);assert(signal.aborted);
});
await test('样式已就绪立即复用；失败和超时都可检测',async()=>{
 const g=setup();g.ctx.asset={type:'style',link:{sheet:{}},url:'http://localhost/a.css'};await g.run('loadBootAsset(asset)');
 const events={};g.ctx.asset={type:'style',attempts:1,url:'http://localhost/a.css',link:{addEventListener:(k,f)=>events[k]=f,removeEventListener(){}}};const p=g.run('loadBootAsset(asset)').then(()=>false,()=>true);events.error();assert(await p);
 const q=g.run('loadBootAsset(asset)').then(()=>false,()=>true);await g.timer(20000);assert(await q);
});
fs.writeFileSync(__dirname+'/loading-results.json',JSON.stringify({count:results.length,passed:results.filter(x=>x.pass).length,results},null,2));
console.log(results.filter(x=>x.pass).length+'/'+results.length+' PASS');for(const r of results.filter(x=>!x.pass))console.log(r.name,r.error);if(results.some(x=>!x.pass))process.exitCode=1;
})();
