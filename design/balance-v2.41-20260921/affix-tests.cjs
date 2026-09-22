const {make}=require('./core-tests.cjs');
const fs=require('fs'),assert=require('assert');const results=[];
const near=(a,b)=>assert(Math.abs(a-b)<1e-8,`${a} != ${b}`);
function test(name,fn){try{fn(make());results.push({name,pass:true});}catch(e){results.push({name,pass:false,error:e.message});}}
test('q0-q2及所有芯片没有额外词条',g=>{
 assert(g.run('[0,1,2].every(q=>Object.keys(SLOTS).every(s=>affixOf(s,q)===null))'));
 assert(g.run('Array.from({length:10},(_,q)=>affixOf("chip",q)).every(x=>x===null)'));
});
test('q3-q5穿戴后真实战斗属性含弱词条，主属性保持',g=>{
 for(const [q,crit,aspd,ls,atkBase,aspBase,hpBase] of [[3,2,4,1,70,28,70],[4,3,6,1.5,100,40,100],[5,4,8,2,135,54,135]]){
  g.run(`S.skills=[];for(const slot of ['weapon','implant','armor'])S.equip[slot]={slot,q:${q},affix:affixOf(slot,${q})};player.hp=calcStats().hp;`);
  near(g.run('calcStats().crit'),.05+crit/100);near(g.run('calcStats().aspd'),1.3*(1+aspBase/100)*(1+aspd/100));
  near(g.run('calcStats().lifesteal'),ls/100);near(g.run('calcStats().atk'),8*(1+atkBase/100));near(g.run('calcStats().hp'),100*(1+hpBase/100));
 }
});
test('q6-q9保持原词条值',g=>{
 for(let q=6;q<=9;q++)for(const [slot,t,base,step] of [['weapon','crit',5,1],['implant','aspd',10,2],['armor','ls',3,1]])
  assert.deepStrictEqual(g.json(`affixOf('${slot}',${q})`),{t,v:base+step*(q-6)});
});
test('q2已装备参与三合一，产物q3立即带词条且保存',g=>{
 g.run('S.equip.armor={slot:"armor",q:2,affix:null};S.inv=[{slot:"armor",q:2},{slot:"armor",q:2}];fuseSlot("armor")');
 assert.deepStrictEqual(g.json('S.equip.armor'),{slot:'armor',q:3,affix:{t:'ls',v:1}});
 assert.equal(g.run('S.inv.length'),0);assert.deepStrictEqual(g.json('JSON.parse(localStorage.getItem("neonHunter")).equip.armor'),g.json('S.equip.armor'));
});
test('q3与q4掉落直接生成固定词条，自动换装与背包路径均正确',g=>{
 g.run('S.floor=25;S.pity=10;Math.random=()=>.55;dropRoll(true)');
 assert.deepStrictEqual(g.json('S.equip.armor'),{slot:'armor',q:3,affix:{t:'ls',v:1}});
 g.run('S.floor=50;S.pity=10;dropRoll(true)');
 assert.deepStrictEqual(g.json('S.equip.armor'),{slot:'armor',q:4,affix:{t:'ls',v:1.5}});
 assert.equal(g.run('S.inv[0].q'),3);assert.equal(g.run('S.inv[0].affix.v'),1);
});
test('当前存档加载同步装备与背包弱词条，重复加载不升品质或重复加成',g=>{
 g.run('S.gold=123;S.floor=30;S.equip.armor={slot:"armor",q:4,affix:null};S.inv=[{slot:"weapon",q:3,affix:null},{slot:"implant",q:5,affix:null},{slot:"chip",q:5,affix:null}];save();load();save();load()');
 assert.equal(g.run('S.equip.armor.q'),4);near(g.run('calcStats().lifesteal'),.015);
 assert.deepStrictEqual(g.json('S.inv.map(x=>x.affix)'),[{t:'crit',v:2},{t:'aspd',v:8},null]);
 assert.deepStrictEqual(g.json('[S.gold,S.floor]'),[123,30]);
});
test('老无版本存档先按既有规则迁移品质，再生成弱词条且只迁移一次',g=>{
 g.run('S.equip.armor={slot:"armor",q:2,affix:null};delete S.v;save();load();save();load()');
 assert.deepStrictEqual(g.json('S.equip.armor'),{slot:'armor',q:4,affix:{t:'ls',v:1.5}});
});
test('1.5%吸血对盾伤不生效，仅生命余伤吸血且不超过生命上限',g=>{
 g.run('S.equip.armor={slot:"armor",q:4,affix:affixOf("armor",4)};Math.random=()=>1;player.hp=50;cur.hp=1000;cur.shield=10;dealPlayerHit()');near(g.run('player.hp'),50);
 g.run('dealPlayerHit()');near(g.run('player.hp'),50.09);
 g.run('player.hp=199.99;cur.shield=0;dealPlayerHit()');near(g.run('player.hp'),200);
});
test('军用护甲1.5%吸血在属性面板与装备卡显示精度一致',g=>{
 g.run('S.equip.armor={slot:"armor",q:4,affix:affixOf("armor",4)};renderPanels()');
 assert(g.run('$("statBox").innerHTML.includes("吸血 <b>1.5%</b>")'));
 assert(g.run('$("gs-info-armor").innerHTML.includes("吸血+1.5%")'));
 g.run('S.skills=["nano"];renderPanels()');assert(g.run('$("statBox").innerHTML.includes("吸血 <b>6.5%</b>")'));
});
test('重塑清空全部装备词条，不形成跨轮永久属性',g=>{
 g.run('S.equip.armor={slot:"armor",q:4,affix:affixOf("armor",4)};S.equip.weapon={slot:"weapon",q:3,affix:affixOf("weapon",3)};applyPrestige(1)');
 near(g.run('calcStats().lifesteal'),0);near(g.run('calcStats().crit'),.05);assert(g.run('Object.values(S.equip).every(x=>x===null)'));
});
fs.writeFileSync(__dirname+'/affix-results.json',JSON.stringify(results,null,2));
console.log(`Affix ${results.filter(x=>x.pass).length}/${results.length}`);for(const r of results.filter(x=>!x.pass))console.log(r);
process.exitCode=results.some(x=>!x.pass)?1:0;
