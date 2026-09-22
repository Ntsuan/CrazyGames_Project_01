const fs=require('fs'),vm=require('vm'),assert=require('assert'),crypto=require('crypto'),path=require('path');
const html=fs.readFileSync(path.join(__dirname,'site/index.html'),'utf8');
const source=html.match(/<script>([\s\S]*?)<\/script>/)[1].split('// ============ 启动 ============')[0];
const results=[];
function make(seedValue=29){
 let now=100000,nextId=0,timers=[],seed=seedValue;const storage=new Map(),nodes=new Map();
 function element(){const classes=new Set();return {style:{},innerHTML:'',textContent:'',firstElementChild:{style:{}},offsetWidth:110,offsetLeft:0,offsetTop:0,classList:{add(...a){a.forEach(x=>classes.add(x));},remove(...a){a.forEach(x=>classes.delete(x));},contains:x=>classes.has(x),toggle(x,b){b??=!classes.has(x);if(b)classes.add(x);else classes.delete(x);}},appendChild(){},remove(){},click(){}};}
 const math=Object.create(Math);math.random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
 class FakeDate extends Date{constructor(...a){super(...(a.length?a:[now]));}static now(){return now;}}
 const ctx=vm.createContext({console,Math:math,Date:FakeDate,performance:{now:()=>now},Image:function(){},Audio:function(){this.play=()=>Promise.resolve();},document:{listenerCount:0,hidden:false,getElementById(id){if(!nodes.has(id))nodes.set(id,element());return nodes.get(id);},createElement:element,addEventListener(...a){this.listenerCount++}},window:{innerWidth:390,addEventListener(){}},localStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,String(v)),removeItem:k=>storage.delete(k)},setTimeout(fn,delay){timers.push({fn,at:now+(delay||0),id:++nextId});return nextId;},clearTimeout(id){timers=timers.filter(x=>x.id!==id);},requestAnimationFrame(){},getComputedStyle:()=>({backgroundImage:''}),URL,Blob});
 vm.runInContext(source,ctx);vm.runInContext('toast=floatDmg=lunge=enemyAnim=enemyDie=()=>{};S=freshState();newSession();spawnMob();',ctx);
 const advance=ms=>{const end=now+ms;let n=0;while(true){timers.sort((a,b)=>a.at-b.at);if(!timers.length||timers[0].at>end)break;const t=timers.shift();now=t.at;t.fn();if(++n>10000)throw Error('timer overflow');}now=end;};ctx.__advance=advance;
 return {run:s=>vm.runInContext(s,ctx),json:s=>JSON.parse(vm.runInContext('JSON.stringify('+s+')',ctx)),advance,storage,nodes};
}
function test(id,area,name,fn){const g=make();try{const evidence=fn(g);results.push({id,area,name,status:'PASS',evidence:evidence??null});}catch(e){results.push({id,area,name,status:'FAIL',error:e.message});}}
const near=(a,b)=>assert(Math.abs(a-b)<1e-8,`${a} vs ${b}`);
test('C01','启动','新档初始资源、属性、楼层正确',g=>{assert.deepStrictEqual(g.json('[S.floor,S.gold,S.souls,S.atkLv,S.hpLv,player.hp]'),[1,0,0,0,0,100]);near(g.run('calcStats().atk'),8);near(g.run('cur.max'),23);});
test('C02','升级','余额不足不可升级',g=>{g.run('$("btnAtk").onclick();$("btnHp").onclick()');assert.deepStrictEqual(g.json('[S.atkLv,S.hpLv,S.gold]'),[0,0,0]);});
test('C03','升级','刚好够钱扣款且只升级一次',g=>{g.run('S.gold=6;$("btnAtk").onclick();$("btnAtk").onclick()');assert.deepStrictEqual(g.json('[S.atkLv,S.gold]'),[1,0]);});
test('C04','升级','生命升级只补上限增量',g=>{g.run('player.hp=40;S.gold=6;$("btnHp").onclick()');near(g.run('player.hp'),50);});
test('C05','战斗','层内保持血量，新层回满',g=>{g.run('S.mobIdx=1;player.hp=42;spawnMob()');near(g.run('player.hp'),42);g.run('S.mobIdx=0;spawnMob()');near(g.run('player.hp'),100);});
test('C06','战斗','普通 Boss/棱镜/天枢血盾参数',g=>{for(const [f,hp,atk,shield] of [[1,6,1.8,.5],[10,6,1.8,.8],[100,10,3,1]]){g.run(`S.floor=${f};S.mobIdx=5;spawnMob()`);near(g.run('cur.max'),20*1.15**f*hp);near(g.run('cur.atk'),1.5*1.15**f*atk);near(g.run('cur.maxShield'),Math.round(20*1.15**f*hp*shield));}});
test('C07','战斗','盾伤不吸血，破盾余伤吸血并触发猎手直觉',g=>{g.run('Math.random=()=>1;S.skills=["nano","soulrush"];player.hp=50;cur.hp=100;cur.shield=10;dealPlayerHit()');near(g.run('player.hp'),50);g.run('dealPlayerHit()');near(g.run('player.hp'),50.3);assert(g.run('buff.soulrush>Date.now()'));});
test('C08','战斗','低血两个触发器按各自阈值生效',g=>{g.run('S.skills=["adrenaline","lowhp"];player.hp=40');near(g.run('calcStats().aspd'),1.3*1.3);near(g.run('calcStats().atk'),8);g.run('player.hp=20');near(g.run('calcStats().atk'),11.2);});
test('C09','战斗','暴击增益按现实时间到期',g=>{g.run('Math.random=()=>0;S.skills=["killcycle","critsurge"];cur.hp=100;dealPlayerHit()');near(g.run('calcStats().aspd'),1.3*1.2*1.3);g.advance(3001);near(g.run('calcStats().aspd'),1.3*1.3);g.advance(2000);near(g.run('calcStats().aspd'),1.3);});
test('C10','战斗','死亡进入暂停与重塑弹窗',g=>{g.run('player.hp=0;checkWall(.1)');assert(g.run('wall&&paused'));assert(g.run('$("modalBox").innerHTML.includes("重塑")'));});
test('C11','战斗','盾量扩展超时阈值',g=>{g.run('S.mobIdx=5;spawnMob();cur.fightT=134;checkWall(.5)');assert(!g.run('wall'));g.run('checkWall(1)');assert(g.run('wall'));});
test('C12','战斗','击杀同帧不应再受死敌伤害',g=>{g.run('S.floor=1;S.mobIdx=5;spawnMob();cur.hp=1;cur.shield=0;cur.atk=100;player.hp=.1;atkTimer=1;lastT=performance.now()-.016*1000;loop(performance.now())');assert(g.run('player.hp>0&&!wall'),JSON.stringify(g.json('({hp:player.hp,wall,paused,floor:S.floor,mob:S.mobIdx})')));});
test('C13','转场','小怪击杀延迟后正确刷新下一只',g=>{g.run('onKill()');assert.equal(g.run('S.mobIdx'),1);g.advance(2061);assert(g.run('cur.hp<1e17'));assert.equal(g.run('S.mobIdx'),1);});
test('C14','转场','Boss 清层、碎片结算及自动转场',g=>{g.run('S.mobIdx=5;spawnMob();onKill()');assert.deepStrictEqual(g.json('[S.floor,S.mobIdx,S.runSouls]'),[2,0,1]);g.advance(5000);assert(g.run('!paused&&!transit&&cur.hp<1e17'));});
test('C15','转场','Boss 死亡期间复位应取消旧回调',g=>{g.run('S.floor=5;S.mobIdx=5;spawnMob();onKill();doReset()');g.advance(5000);assert(g.run('!S.pendingOffer&&!skillOfferOpen'),JSON.stringify(g.json('({floor:S.floor,pending:S.pendingOffer,skillOfferOpen,paused})')));});
test('C16','技能','5 层触发器池候选唯一且可选择一次',g=>{g.run('offerSkills("p5")');const a=g.json('curOffer');assert.equal(new Set(a).size,3);assert(g.run('curOffer.every(x=>POOL_5.includes(x))'));g.run(`pickSkill(${JSON.stringify(a[0])});pickSkill(${JSON.stringify(a[0])})`);assert.equal(g.run('S.skills.length'),1);assert.equal(g.run('S.pendingOffer'),null);});
test('C17','技能','10 层属性池及非法选择拦截',g=>{g.run('offerSkills("p10");pickSkill("not-a-skill")');assert.equal(g.run('S.skills.length'),0);assert(g.run('paused&&skillOfferOpen&&curOffer.every(x=>POOL_10.includes(x))'));});
test('C18','技能','刷新恢复相同三选一候选',g=>{g.run('offerSkills("p10");save()');const a=g.json('curOffer');g.run('load();offerSkills(S.pendingOffer.pool,S.pendingOffer.picks)');assert.deepStrictEqual(g.json('curOffer'),a);});
test('C19','技能','击杀里程碑立刻保存三选一意图',g=>{g.run('S.floor=10;S.mobIdx=5;spawnMob();onKill()');assert.equal(g.json('JSON.parse(localStorage.getItem("neonHunter")).pendingOffer').pool,'p10');});
test('C20','装备','各段掉落区间正确',g=>{assert.deepStrictEqual(g.json('[1,24,25,49,50,74,75,100].map(dropBand)'),[[0,2],[0,2],[1,3],[1,3],[2,4],[2,4],[3,5],[3,5]]);});
test('C21','装备','连续低品质达到阈值后保底最高档',g=>{g.run('S.floor=75;S.pity=10');assert.equal(g.run('rollQuality(75)'),5);assert.equal(g.run('S.pity'),0);});
test('C22','装备','传说前无词条，传说至不朽递增',g=>{assert.equal(g.run('affixOf("weapon",5)'),null);assert.deepStrictEqual(g.json('affixOf("weapon",9)'),{t:'crit',v:8});assert.deepStrictEqual(g.json('affixOf("implant",9)'),{t:'aspd',v:16});assert.deepStrictEqual(g.json('affixOf("armor",9)'),{t:'ls',v:6});});
test('C23','装备','已装备参与三合一',g=>{g.run('S.equip.weapon={slot:"weapon",q:2};S.inv=[{slot:"weapon",q:2},{slot:"weapon",q:2}];fuseSlot("weapon")');assert.equal(g.run('S.equip.weapon.q'),3);assert.equal(g.run('S.inv.length'),0);});
test('C24','装备','不朽装备不能继续合成',g=>{g.run('S.equip.weapon={slot:"weapon",q:9};S.inv=Array.from({length:3},()=>({slot:"weapon",q:9}));fuseSlot("weapon")');assert.equal(g.run('S.inv.length'),3);assert.equal(g.run('S.equip.weapon.q'),9);assert.equal(g.run('fuseInfo("weapon")'),null);});
test('C25','装备','满级部位掉落自动转信用点',g=>{g.run('S.equip.weapon={slot:"weapon",q:9};Math.random=()=>0;dropRoll(true)');assert(g.run('S.gold>0&&S.inv.length===0&&S.equip.weapon.q===9'));});
test('C26','装备','拆解仅处理过期低品质',g=>{g.run('S.floor=25;S.inv=[{slot:"weapon",q:0},{slot:"weapon",q:1}];salvage("weapon")');assert.deepStrictEqual(g.json('S.inv.map(i=>i.q)'),[1]);assert(g.run('S.gold>0'));});
test('C27','装备','拆解操作应立即保存',g=>{g.run('S.floor=25;S.inv=[{slot:"weapon",q:0}];save();salvage("weapon")');assert.equal(g.json('JSON.parse(localStorage.getItem("neonHunter")).inv').length,0,'拆解后的存档仍保留已拆材料');});
test('C28','存档','保存读档不应修改当前装备品质',g=>{g.run('S.equip.weapon={slot:"weapon",q:2};save();load();save();load()');assert.equal(g.run('S.equip.weapon.q'),2,'品质 q2 经两次保存读取变成 q'+g.run('S.equip.weapon.q'));});
test('C29','存档','旧档删除技能及离线分支迁移',g=>{g.run('S.skills=["arc","nano"];S.tree.offline=3;save();load()');assert.deepStrictEqual(g.json('S.skills'),['nano']);assert(!g.run('"offline" in S.tree'));});
test('C30','存档','层中读档回本层首怪满血',g=>{g.run('S.mobIdx=3;player.hp=33;save();player.hp=1;load();spawnMob()');near(g.run('player.hp'),100);assert.equal(g.run('S.mobIdx'),0);});
test('C31','存档','首只怪刷新按新设计恢复满血',g=>{g.run('S.mobIdx=0;player.hp=33;save();player.hp=1;load();spawnMob()');near(g.run('player.hp'),100);assert.equal(g.run('S.mobIdx'),0);});
test('C32','存档','损坏 JSON 退回新档',g=>{g.storage.set('neonHunter','{');assert.equal(g.run('load()'),false);assert.equal(g.run('S.floor'),1);});
test('C33','重塑','结算碎片、15%回收并清除局内成长',g=>{g.run('S.floor=20;S.maxFloor=19;S.bestEver=19;S.runSouls=22;S.souls=3;S.tree.dmg=2;S.equip.weapon={slot:"weapon",q:3};S.skills=["nano"];S.atkLv=12');const gold=g.run('salvageAllGold().g');g.run('applyPrestige(1)');assert.deepStrictEqual(g.json('[S.souls,S.floor,S.atkLv,S.skills.length,S.bestEver,S.tree.dmg,S.gold]'),[25,1,0,0,19,2,gold]);});
test('C34','重塑','广告双倍结算短期重复调用只发一次',g=>{g.run('S.runSouls=10;applyPrestige(2);applyPrestige(2)');assert.equal(g.run('S.souls'),20);assert.equal(g.run('S.prestiges'),1);});
test('C35','重塑','结算后应立即持久化而非等待跑入',g=>{g.run('S.runSouls=10;save();applyPrestige(1)');assert.equal(g.json('JSON.parse(localStorage.getItem("neonHunter")).prestiges'),1,'刚结算时持久化仍是旧循环');});
test('C36','加成树','首次重塑前不能消费碎片',g=>{g.run('S.souls=100;buyTree("dmg")');assert.equal(g.run('S.tree.dmg'),0);});
test('C37','加成树','成本递增及余额不足拦截',g=>{g.run('S.prestiges=1;S.souls=3;buyTree("dmg");buyTree("dmg");buyTree("dmg")');assert.deepStrictEqual(g.json('[S.tree.dmg,S.souls]'),[2,0]);});
test('C38','倍速','只加速已通关楼层',g=>{g.run('S.bestEver=10;S.speed2=true;S.floor=10');assert.equal(g.run('effSpeed()'),2);g.run('S.floor=11');assert.equal(g.run('effSpeed()'),1);});
test('C39','补给','测试版无限补给按当前设计发奖',g=>{g.run('openCrate();openCrate()');assert.equal(g.run('curSession.events.filter(x=>x.type==="crate").length'),2);assert.equal(g.run('S.gold'),276);});
test('C40','日志','事件包括版本和数值快照',g=>{g.run('S.gold=6;$("btnAtk").onclick()');assert.equal(g.run('curSession.build'),'v2.32');assert(g.run('curSession.events.some(x=>x.type==="upgrade"&&x.snap.atkLv===1)'));});
test('C41','日志','CSV 含 BOM、表头和楼层数据',g=>{g.run('pushFloorSummary()');assert(g.run('csvContent(curSession).startsWith("\ufefffloor,")'));assert.equal(g.run('csvContent(curSession).split("\\n").length'),2);});
test('C42','日志','封存只保留最近三段且不中断新段',g=>{g.run('saveSessionToFolder=saveCsvToFolder=()=>Promise.resolve();for(let i=0;i<5;i++)endTest()');assert.equal(g.run('sessions.length'),3);assert.equal(g.run('curSession.endedAt'),null);});
test('C43','音效','设置开关持久化',g=>{g.run('toggleSfx()');assert.equal(g.json('JSON.parse(localStorage.getItem("neonHunter")).sfxOn'),false);});
test('C44','音效','关闭、暂停、后台不触发播放',g=>{g.run('let played=0;sfxPool.forEach(a=>a.play=()=>{played++;return Promise.resolve()});S.sfxOn=false;playShot();S.sfxOn=true;paused=true;playShot();paused=false;document.hidden=true;playShot()');assert.equal(g.run('played'),0);});
test('C45','音效','音效失败不影响战斗',g=>{g.run('sfxPool.forEach(a=>a.play=()=>{throw Error("audio unavailable")});cur.hp=100;dealPlayerHit()');assert(g.run('cur.hp<100'));});
test('C46','战斗','天枢蓄力后主炮按相位触发',g=>{g.run('S.floor=100;S.mobIdx=5;S.hpLv=200;player.hp=calcStats().hp;spawnMob();cur.phase=0;cur.phaseT=.01;lastT=performance.now()-100;loop(performance.now())');assert.equal(g.run('cur.phase'),1);g.run('cur.phaseT=.01;lastT=performance.now()-100;loop(performance.now())');assert.equal(g.run('cur.phase'),2);});
test('C47','存档','保存失败不应终止主循环',g=>{g.run('localStorage.setItem=()=>{throw Error("QuotaExceededError")};lastT=performance.now()-16');g.run('loop(performance.now())');});
test('C48','战斗','击杀与受阻竞态后不得进入无敌推层',g=>{g.run('S.mobIdx=5;spawnMob();cur.hp=1;cur.shield=0;cur.atk=100;player.hp=.1;atkTimer=1;lastT=performance.now()-16;loop(performance.now())');g.advance(5000);assert(!g.run('wall&&!paused'),JSON.stringify(g.json('({wall,paused,floor:S.floor,hp:player.hp})')));});

test('C49','装备','新版一次点击只合成一件',g=>{g.run('S.inv=Array.from({length:9},()=>({slot:"weapon",q:0}));fuseSlot("weapon")');assert.equal(g.run('S.inv.length'),6);assert.equal(g.run('curSession.events.filter(e=>e.type==="fuse").length'),1);});
test('C50','装备','新版低品质优先且不替换高阶装备',g=>{g.run('S.equip.weapon={slot:"weapon",q:5};S.inv=[0,0,0,2,2,2].map(q=>({slot:"weapon",q}));fuseSlot("weapon")');assert.equal(g.run('S.equip.weapon.q'),5);assert.deepStrictEqual(g.json('S.inv.map(x=>x.q)'),[2,2,2,1]);});
test('C51','存档','真正旧版装备迁移仅一次',g=>{g.run('S.equip.weapon={slot:"weapon",q:2};delete S.v;save();load();save();load()');assert.equal(g.run('S.equip.weapon.q'),4);assert.equal(g.run('S.v'),1);});
test('C52','存档','普通保存不得回滚同层后续受伤',g=>{g.run('S.mobIdx=2;player.hp=80;save();player.hp=30;S.mobIdx=3;spawnMob()');assert.equal(g.run('player.hp'),30);});
test('C53','转场','Boss残血通关后下一层确实满血',g=>{g.run('S.mobIdx=5;spawnMob();player.hp=33;onKill()');g.advance(5000);assert.equal(g.run('player.hp'),g.run('calcStats().hp'));});
test('C54','重塑','死亡重塑即时保存奖励且运行态满血',g=>{g.run('player.hp=0;wall=true;paused=true;applyPrestige(1)');assert.equal(g.run('player.hp'),100);assert.equal(g.json('JSON.parse(localStorage.getItem("neonHunter")).prestiges'),1);});
test('C55','输入','主循环不重复注册触摸监听',g=>{const before=g.run('document.listenerCount');g.run('paused=true;for(let i=0;i<600;i++)loop(performance.now())');assert.equal(g.run('document.listenerCount')-before,0);});
test('C56','转场','首场进场使用对应楼层背景',g=>{g.run('S.floor=10;openingRunIn()');assert(g.run('$("arena").style.backgroundImage.includes(bgForFloor(10))'));});
test('C57','技能','里程碑弹窗使用刚完成的层数',g=>{g.run('S.floor=10;S.mobIdx=5;spawnMob();onKill()');g.advance(1200);assert(g.run('$("modalBox").innerHTML.includes("突破第 10 层")'));});
test('C58','存档','暂停期间保存异常不抛出',g=>{g.run('localStorage.setItem=()=>{throw Error("quota")};paused=true;save()');assert(g.run('paused'));});
test('C59','转场','层内保存后新敌人不继承过时低血量',g=>{g.run('S.mobIdx=2;player.hp=30;save();player.hp=70;S.mobIdx=3;spawnMob()');assert.equal(g.run('player.hp'),70);});
test('C60','技能','刷新恢复属性选择仍显示完成层号',g=>{g.run('S.floor=10;S.mobIdx=5;spawnMob();onKill()');g.advance(1200);g.run('load();offerSkills(S.pendingOffer.pool,S.pendingOffer.picks)');assert(g.run('$("modalBox").innerHTML.includes("突破第 10 层")'));});


test('C61','存档','读档初始刷怪和跑入两阶段均按新设计满血',g=>{g.run('player.hp=33;save();load();spawnMob();openingRunIn()');g.advance(1600);assert.equal(g.run('player.hp'),100);});
test('C62','重塑','死亡重塑跑入期间自动保存不会导致再死亡',g=>{g.run('player.hp=0;wall=true;paused=true;applyPrestige(1)');g.advance(500);g.run('save()');g.advance(1000);g.run('lastT=performance.now()-16;loop(performance.now())');assert(g.run('player.hp>0&&!wall'),JSON.stringify(g.json('({hp:player.hp,wall})')));});
test('C63','弹窗','Boss技能回调不得覆盖正在等待的复位确认',g=>{g.run('S.floor=5;S.mobIdx=5;spawnMob();onKill();askReset()');g.advance(1300);assert(g.run('$("modalBox").innerHTML.includes("确认复位")'));});
test('C64','升级','击杀后跑入期升级生命不丢失回血增量',g=>{g.run('S.gold=100;player.hp=50;onKill();$("btnHp").onclick()');const hp=g.run('player.hp');assert(hp>50);g.advance(2061);assert.equal(g.run('player.hp'),hp);});


test('C65','复位','低血读档后复位恢复新局满血',g=>{g.run('player.hp=33;save();load();spawnMob();openingRunIn()');g.advance(1600);g.run('doReset()');g.advance(1600);assert.equal(g.run('player.hp'),100);});
test('C66','弹窗','技能弹窗上取消复位应重新显示技能选择',g=>{g.run('offerSkills("p10");askReset();confirmOpen=false;closeModal()');g.advance(100);assert(g.run('$("overlay").classList.contains("show")&&skillOfferOpen'),JSON.stringify(g.json('({skillOfferOpen,paused,visible:$("overlay").classList.contains("show")})')));});
test('C67','弹窗','挂起技能在取消复位后补弹',g=>{g.run('S.floor=10;S.mobIdx=5;spawnMob();onKill();askReset()');g.advance(1300);g.run('confirmOpen=false;closeModal()');g.advance(100);assert(g.run('skillOfferOpen&&$("modalBox").innerHTML.includes("突破第 10 层")'));});
test('C68','弹窗','挂起技能在确认复位后废弃',g=>{g.run('S.floor=10;S.mobIdx=5;spawnMob();onKill();askReset()');g.advance(1300);g.run('doReset()');g.advance(2000);assert(g.run('S.floor===1&&!skillOfferOpen&&!pendingSkillOffer&&!S.pendingOffer'));});

const report={version:'v2.32',sourceHash:crypto.createHash('sha256').update(html).digest('hex'),environment:'Node VM; actual game functions with DOM/audio stubs, virtual clock; not a browser compatibility test',count:results.length,passed:results.filter(r=>r.status==='PASS').length,failed:results.filter(r=>r.status==='FAIL').length,results};
fs.writeFileSync(path.join(__dirname,'core-results.json'),JSON.stringify(report,null,2));
console.log(`${report.passed}/${report.count} PASS; ${report.failed} FAIL`);for(const r of results.filter(x=>x.status==='FAIL'))console.log(r.id,r.name,r.error);
module.exports={make};
