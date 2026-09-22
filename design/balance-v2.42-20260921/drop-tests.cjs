const {make}=require('./core-tests.cjs');
const assert=require('node:assert'),fs=require('node:fs');
const results=[];
function test(name,fn){try{fn(make());results.push({name,pass:true});}catch(e){results.push({name,pass:false,error:e.stack});}}
test('全部区间边界与超高层封顶',g=>{
 assert.deepStrictEqual(g.json('[1,24,25,49,50,74,75,149,150,249,250,1000].map(dropBand)'),[[0,2],[0,2],[1,3],[1,3],[2,4],[2,4],[3,5],[3,5],[4,6],[4,6],[5,7],[5,7]]);
});
test('新档位随机权重边界为58/36/6',g=>{
 // Sample either side of thresholds; 0.58 * 100 is slightly below 58 in IEEE-754.
 for(const [f,lo] of [[150,4],[249,4],[250,5],[1000,5]])for(const [r,d] of [[0,0],[.579999,0],[.580001,1],[.939999,1],[.940001,2],[.999999,2]]){
  g.run(`S.pity=0;Math.random=()=>${r}`);assert.equal(g.run(`rollQuality(${f})`),lo+d);
 }
});
test('小怪25%门槛保持，空掉落不计入保底，Boss必掉',g=>{
 g.run('S.floor=150;S.pity=9;Math.random=()=>.250001;dropRoll(false)');
 assert.equal(g.run('S.pity'),9);assert.equal(g.run('S.inv.length'),0);assert(g.run('Object.values(S.equip).every(x=>x===null)'));
 g.run('Math.random=()=>.25;dropRoll(false)');assert.equal(g.run('S.pity'),10);assert.equal(g.run('S.equip.implant.q'),4);
 g.run('Math.random=()=>.999999;dropRoll(true)');assert.equal(g.run('S.equip.chip.q'),6);assert.equal(g.run('S.pity'),0);
});
test('150与250层连续10次低档后第11件保底',g=>{
 for(const [f,lo,hi] of [[150,4,6],[250,5,7]]){
  g.run(`S=freshState();S.floor=${f};Math.random=()=>0;for(let i=0;i<10;i++)dropRoll(true)`);
  assert.equal(g.run('S.pity'),10);assert.equal(g.run('S.equip.weapon.q'),lo);
  g.run('dropRoll(true)');assert.equal(g.run('S.equip.weapon.q'),hi);assert.equal(g.run('S.pity'),0);
 }
});
test('自然最高档重置共享保底',g=>{
 g.run('S.floor=250;S.pity=9;let rng=[.99,.6];Math.random=()=>rng.shift();dropRoll(true)');
 assert.equal(g.run('S.equip.armor.q'),7);assert.equal(g.run('S.pity'),0);
});
test('跨149/150与249/250不清保底，按新档位保底',g=>{
 for(const [f,hi] of [[149,6],[249,7]]){
  g.run(`S=freshState();S.floor=${f};S.pity=9;Math.random=()=>0;dropRoll(true);S.floor++;dropRoll(true)`);
  assert.equal(g.run('S.equip.weapon.q'),hi);assert.equal(g.run('S.pity'),0);
 }
});
test('Boss使用被击杀层区间，转场后才切换档位',g=>{
 for(const [f,hi] of [[149,5],[249,6]]){
  g.run(`S=freshState();S.floor=${f};S.mobIdx=5;S.pity=10;Math.random=()=>0;spawnMob();onKill()`);
  assert.equal(g.run('S.equip.weapon.q'),hi);assert.equal(g.run('S.floor'),f+1);
  g.advance(5000);
 }
});
test('q6/q7所有部位自动穿戴并携带正确词条',g=>{
 for(const [f,q] of [[150,6],[250,7]])for(const [slot,r,t,v] of [['weapon',.1,'crit',q-1],['implant',.3,'aspd',2*q-2],['armor',.6,'ls',q-3],['chip',.9,null,null]]){
  g.run(`S=freshState();S.floor=${f};S.pity=10;Math.random=()=>${r};dropRoll(true)`);
  assert.deepStrictEqual(g.json(`S.equip.${slot}`),{slot,q,affix:t?{t,v}:null});
 }
});
test('低档新掉落入背包，不降级已穿戴装备',g=>{
 g.run('S.floor=250;S.equip.weapon={slot:"weapon",q:8,affix:affixOf("weapon",8)};Math.random=()=>0;dropRoll(true)');
 assert.equal(g.run('S.equip.weapon.q'),8);assert.equal(g.run('S.inv[0].q'),5);
});
test('神话材料能经三合一穿上永恒与不朽',g=>{
 g.run('S.equip.weapon={slot:"weapon",q:7,affix:affixOf("weapon",7)};S.inv=Array.from({length:8},()=>({slot:"weapon",q:7,affix:affixOf("weapon",7)}));fuseSlot("weapon")');
 assert.equal(g.run('S.equip.weapon.q'),8);
 g.run('while(fuseInfo("weapon"))fuseSlot("weapon")');assert.equal(g.run('S.equip.weapon.q'),9);assert.equal(g.run('S.inv.length'),0);
});
test('新档位永恒与不朽仍不自然掉落',g=>{
 assert(g.run('S.floor=1000;Array.from({length:20000},()=>{dropRoll(true);return curSession.events.filter(e=>e.type==="drop").at(-1)?.q}).every(q=>q>=5&&q<=7)'));
});
test('150层改装可拆，250层军用仍受保护，只影响背包',g=>{
 for(const f of [150,250]){
  g.run(`S=freshState();S.floor=${f};S.equip.weapon={slot:"weapon",q:3};S.inv=[3,4,5].map(q=>({slot:"weapon",q}));salvage("weapon")`);
  assert.deepStrictEqual(g.json('S.inv.map(x=>x.q)'),[4,5]);assert.equal(g.run('S.equip.weapon.q'),3);
  assert.equal(g.run('S.gold'),Math.round(32*1.15**f));
 }
});
test('不朽部位新掉落转信用点，保底仍正常结算',g=>{
 g.run('S.floor=250;S.pity=10;S.equip.weapon={slot:"weapon",q:9};Math.random=()=>0;dropRoll(true)');
 assert.equal(g.run('S.gold'),Math.round(128*1.15**250));assert.equal(g.run('S.pity'),0);assert.equal(g.run('S.inv.length'),0);
});
test('旧档读取不升品质且保留保底，新掉落使用当前区间',g=>{
 g.run('S.floor=250;S.pity=10;S.equip.armor={slot:"armor",q:4,affix:null};save();load();save();load()');
 assert.equal(g.run('S.equip.armor.q'),4);assert.equal(g.run('S.equip.armor.affix.v'),1.5);assert.equal(g.run('S.pity'),10);
 g.run('Math.random=()=>.6;dropRoll(true);save();load()');assert.equal(g.run('S.equip.armor.q'),7);assert.equal(g.run('S.equip.armor.affix.v'),4);
});
test('重塑清空高阶装备与保底，回到首层区间',g=>{
 g.run('S.floor=250;S.pity=10;S.equip.weapon={slot:"weapon",q:7};applyPrestige(1)');
 assert.deepStrictEqual(g.json('[S.floor,S.pity,S.inv.length]'),[1,0,0]);assert(g.run('Object.values(S.equip).every(x=>x===null)'));
 assert.deepStrictEqual(g.json('dropBand(S.floor)'),[0,2]);
});
fs.writeFileSync(__dirname+'/drop-results.json',JSON.stringify(results,null,2));
console.log(`Drop ${results.filter(x=>x.pass).length}/${results.length}`);for(const r of results.filter(x=>!x.pass))console.log(r);
process.exitCode=results.some(x=>!x.pass)?1:0;
