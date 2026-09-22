const {make}=require('./harness.cjs'),assert=require('node:assert/strict'),fs=require('node:fs');
const results=[];
function test(name,fn){try{fn(make());results.push({name,status:'PASS'});}catch(e){results.push({name,status:'FAIL',error:e.stack});}}
const eq=(g,s,v)=>assert.deepEqual(g.json(s),v);
function ticks(g,seconds){g.run(`for(let i=0;i<${seconds*10};i++)advanceCrateClock(.1)`);}
function ready(g){g.run('paused=false;transit=false;S.crateCooldownMs=0;');}
test('强化攻血同价1.18，属性1.10',g=>{for(const l of [0,1,10,30,60,100]){g.run(`S.atkLv=S.hpLv=${l}`);assert.equal(g.run(`cost(${l})`),6*1.18**l);assert.equal(g.run('calcStats().atk'),8*1.1**l);assert.equal(g.run('calcStats().hp'),100*1.1**l);}});
for(let stage=1;stage<=5;stage++)test(`阶段${stage}百层与无尽数值边界`,g=>{
 for(const f of [10,100,200]){g.run(`S.stage=${stage};S.floor=${f};S.mobIdx=5;spawnMob()`);
 const gate=stage<5&&f===100, hp=f===10?6:gate?8:10,atk=f===10?1.8:gate?2:3,sh=f===10?.8:gate?.8:1;
 assert.equal(g.run('cur.max'),20*1.15**f*hp);assert.equal(g.run('cur.atk'),1.5*1.15**f*atk);assert.equal(g.run('cur.maxShield'),Math.round(20*1.15**f*hp*sh));
 }
});
test('首次60秒：59.9秒不可领，60秒可领',g=>{g.run('paused=false');ticks(g,59.9);g.run('openCrate()');eq(g,'crateAd',null);ticks(g,.1);g.run('openCrate()');assert(g.run('crateAd!==null'));eq(g,'S.gold',0);});
for(const rate of [1,2,4,8])test(`${rate}倍不加速补给，计时来自主循环`,g=>{
 g.run(`testSpeed=${rate===2?1:rate};S.speed2=${rate===2};S.bestEver=100;paused=false;combatStep=()=>{};renderPanels=renderCombat=()=>{};`);
 g.run('for(let i=0;i<600;i++){__advance(100);loop(performance.now())}');eq(g,'S.crateCooldownMs',0);
 assert.equal(g.run('combatNow()'),60000*rate);
});
for(const [name,setup] of Object.entries({后台:'document.hidden=true',封面:'boot.phase="cover"',技能:'skillOfferOpen=true',重塑:'S.prestigeOffer={}',确认:'confirmOpen=true',死亡:'wall=true',暂停:'paused=true',改装:'S.stageUpgrade={status:"playing"}'}))test(`${name}不累计补给`,g=>{g.run('paused=false;'+setup);ticks(g,65);eq(g,'S.crateCooldownMs',60000);});
test('正常跑入与转场累计冷却',g=>{g.run('openingRunIn()');ticks(g,10);eq(g,'S.crateCooldownMs',50000);});
test('长卡顿不追算离线时间',g=>{g.run('paused=false;advanceCrateClock(10000)');eq(g,'S.crateCooldownMs',59900);});
test('就绪后不累积多箱',g=>{ticks(g,180);ready(g);g.run('openCrate();finishCrateAd(crateAd.id,"completed");openCrate()');eq(g,'[S.cratesRun,crateAd,S.crateCooldownMs]',[1,null,60000]);});
for(const n of [0,9,19,39,999])test(`第${n+1}箱固定20倍，取消增长和里程碑`,g=>{ready(g);g.run(`S.floor=30;S.cratesRun=${n};S.tree.gold=4;S.skills=['blackmarket'];S.equip.chip={slot:'chip',q:4};var want=Math.round(mobGold(S.floor)*20*calcStats().goldMult);openCrate();var id=crateAd.id;finishCrateAd(id,'completed');finishCrateAd(id,'completed')`);assert.equal(g.run('S.gold'),g.run('want'));eq(g,'[S.cratesRun,S.crateCooldownMs,paused,adLock]',[n+1,60000,false,false]);});
test('取消广告不发奖、不消耗领取资格，可重试',g=>{ready(g);g.run('openCrate();var id=crateAd.id;advanceCrateClock(.1);finishCrateAd(id,"cancelled")');eq(g,'[S.gold,S.crateCooldownMs,S.cratesRun,paused,adLock]',[0,0,0,false,false]);g.run('openCrate();finishCrateAd(crateAd.id,"completed")');eq(g,'S.cratesRun',1);});
test('存档写失败不发奖、不消费冷却，重试只发一次',g=>{ready(g);g.run('openCrate();var id=crateAd.id,realWrite=localStorage.setItem;localStorage.setItem=()=>{throw Error("quota")};finishCrateAd(id,"completed")');eq(g,'[S.gold,S.cratesRun,S.crateCooldownMs,paused]',[0,0,0,true]);g.run('localStorage.setItem=realWrite;finishCrateAd(id,"completed");finishCrateAd(id,"completed")');eq(g,'[S.cratesRun,crateAd,paused]',[1,null,false]);});
test('领取记录与金币冷却原子持久化，刷新不再发奖',g=>{ready(g);g.run('openCrate();finishCrateAd(crateAd.id,"completed")');const s=g.storage.get('neonHunter');const h=make();h.storage.set('neonHunter',s);h.run('load();openCrate()');eq(h,'[S.gold,S.cratesRun,S.crateCooldownMs,crateAd]',[46,1,60000,null]);});
test('部分冷却存档/离线恢复，不重置也不赠送时间',g=>{ticks(g,25);g.run('save()');const h=make();h.storage.set('neonHunter',g.storage.get('neonHunter'));h.advance(100000000);h.run('load()');eq(h,'S.crateCooldownMs',35000);});
test('普通与广告重塑保留剩余冷却及树',g=>{for(const mult of [1,2]){g.run(`S=freshState();S.crateCooldownMs=12345;S.tree.dmg=2;S.runSouls=25;wall=true;doPrestige();`);if(mult===2)g.run('requestPrestigeAd();finishPrestigeAd(prestigeAd.attempt,"completed")');else g.run('applyPrestige(1)');eq(g,'[S.floor,S.souls,S.tree.dmg,S.crateCooldownMs]',[1,25*mult,2,12345]);}});
test('阶段晋升重置冷却且不保留旧资源',g=>{g.run('S.crateCooldownMs=0;S.gold=999;S.stage=2;S.floor=100;S.mobIdx=5;spawnMob();onKill();commitStageUpgrade()');eq(g,'[S.stage,S.floor,S.crateCooldownMs,S.gold]',[3,1,60000,0]);});
test('旧v2.51档备份迁移，不清已有资源',g=>{const d=g.json('({...S,gold:999,cratesRun:39,crateReady:0})');delete d.economySchema;delete d.crateCooldownMs;const raw=JSON.stringify(d);g.storage.set('neonHunter',raw);g.run('load()');eq(g,'[S.gold,S.cratesRun,S.crateCooldownMs,saveBlocked]',[999,39,60000,false]);assert.equal(g.storage.get('neonHunter.preEconomy'),raw);g.run('save();load()');assert.equal(g.storage.get('neonHunter.preEconomy'),raw);});
test('旧档备份写入失败保护原档',g=>{g.run('var old={...S};delete old.economySchema;delete old.crateCooldownMs;localStorage.setItem("neonHunter",JSON.stringify(old));localStorage.setItem=()=>{throw Error("quota")};load()');eq(g,'saveBlocked',true);assert(!JSON.parse(g.storage.get('neonHunter')).economySchema);});
for(const patch of [{economySchema:2},{crateCooldownMs:-1},{crateCooldownMs:60001},{crateCooldownMs:null},{crateCooldownMs:'0'}])test(`异常经济存档保护 ${JSON.stringify(patch)}`,g=>{const d={...g.json('S'),...patch};g.storage.set('neonHunter',JSON.stringify(d));g.run('load();save()');eq(g,'saveBlocked',true);assert.deepEqual(JSON.parse(g.storage.get('neonHunter')),d);});
test('复位作废旧广告回调与就绪资格',g=>{ready(g);g.run('openCrate();var id=crateAd.id;doReset();finishCrateAd(id,"completed")');eq(g,'[S.gold,S.cratesRun,S.crateCooldownMs,crateAd]',[0,0,60000,null]);});
test('广告中禁止确认复位盖住弹窗，取消后恢复',g=>{ready(g);g.run('openCrate();askReset()');eq(g,'confirmOpen',false);g.run('finishCrateAd(crateAd.id,"cancelled");askReset()');eq(g,'confirmOpen',true);});
test('就绪状态但重塑/转场/广告锁期间不能请求',g=>{ready(g);for(const state of ['S.prestigeOffer={}','transit=true','adLock=true','S.pendingOffer={}']){g.run(state+';openCrate()');eq(g,'crateAd',null);g.run('S.prestigeOffer=null;transit=false;adLock=false;S.pendingOffer=null');}});
fs.writeFileSync(__dirname+'/balance-results.json',JSON.stringify(results,null,2));console.log(`${results.filter(r=>r.status==='PASS').length}/${results.length} PASS`);for(const r of results.filter(r=>r.status==='FAIL'))console.log(r.name,r.error);if(results.some(r=>r.status==='FAIL'))process.exitCode=1;
