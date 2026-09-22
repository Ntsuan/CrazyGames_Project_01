const {make}=require('./harness.cjs');const assert=require('assert'),fs=require('fs'),path=require('path');const results=[];
function test(name,fn){const g=make();try{g.run('$("stageOverlay").hidden=true');fn(g);results.push({name,pass:true});}catch(e){results.push({name,pass:false,error:e.message});}}
function check(g,pool,floor){assert.equal(g.run('curOffer.length'),3);assert.equal(g.run('new Set(curOffer).size'),3);assert(g.run(`curOffer.every(k=>${pool==='p5'?'POOL_5':'POOL_10'}.includes(k))`));assert.equal(g.run('S.pendingOffer.pool'),pool);assert.equal(g.run('S.pendingOffer.floor'),floor);}
for(const floor of [5,10,15,20,95,100,105,110]){
 const pool=floor%10===0?'p10':'p5',wrong=pool==='p5'?'p10':'p5';
 test(`无尽阶段五通关${floor}层真实路径`,g=>{g.run(`S.stage=5;S.floor=${floor};S.mobIdx=5;spawnMob();onKill()`);g.advance(1600);if(pool==='p10')g.run('continueMilestone()');check(g,pool,floor);});
 test(`${floor}层旧标记与混合候选纠正`,g=>{g.run(`S.floor=${floor+1};S.pendingOffer={pool:'${wrong}',floor:${floor},picks:['ghoststep','fire','killcycle','ghoststep']};save();load();offerSkills(S.pendingOffer.pool,S.pendingOffer.picks,S.pendingOffer.floor)`);check(g,pool,floor);});
}
test('旧档缺奖励层数按已推进的上一层恢复',g=>{g.run('S.floor=6;S.pendingOffer={pool:"p10",picks:["fire","neuro","shield"]};offerSkills(S.pendingOffer.pool,S.pendingOffer.picks)');check(g,'p5',5);});
test('继续挑战以重塑里程碑层数校正错误候选楼层',g=>{g.run('S.floor=11;S.prestigeOffer=makePrestigeOffer("milestone",10,"choice");S.pendingOffer={pool:"p5",picks:["ghoststep","lowhp","soulrush"],floor:5};continueMilestone()');check(g,'p10',10);});
test('正确旧候选保持原顺序且不重抽',g=>{g.run('S.floor=16;offerSkills("p5",["ghoststep","lowhp","soulrush"],15);save();load();offerSkills(S.pendingOffer.pool,S.pendingOffer.picks)');assert.deepEqual(g.json('curOffer'),['ghoststep','lowhp','soulrush']);check(g,'p5',15);});
test('确认框挂起再取消后仍按奖励层分池',g=>{g.run('S.floor=6;confirmOpen=true;offerSkills("p10",["fire","fatal","neuro"],5);cancelReset()');g.advance(100);check(g,'p5',5);});
test('一次选择只获得一个技能，跨池技能不可点击领取',g=>{g.run('offerSkills("p10",["ghoststep"],5);pickSkill("fire")');assert.equal(g.run('S.skills.length'),0);g.run('pickSkill(curOffer[0]);pickSkill(curOffer[0])');assert.equal(g.run('S.skills.length'),1);});
for(const stage of [1,2,3,4])test(`阶段${stage}百层仍义体改装，不增加技能弹窗`,g=>{g.run(`S.stage=${stage};S.floor=100;S.mobIdx=5;spawnMob();onKill()`);assert.equal(g.run('S.stageUpgrade.status'),'clear');assert.equal(g.run('S.pendingOffer'),undefined);assert.equal(g.run('skillOfferOpen'),false);});
for(const floor of [5,10,105,110])test(`构筑${floor}层提供该类全部技能`,g=>{g.run(`gameMode="build";S=freshState();S.floor=${floor+1};offerSkills('p5',null,${floor})`);assert.equal(g.run('curOffer.length'),floor%10===0?9:5);assert.deepEqual(g.json('curOffer'),g.json(floor%10===0?'POOL_10':'POOL_5'));});
test('技能类型标题明确，触发池列通关层',g=>{g.run('S.floor=6;offerSkills("p10",null,5)');assert(g.nodes.get('modalBox').innerHTML.includes('触发型三选一'));assert(g.nodes.get('modalBox').innerHTML.includes('突破第 5 层'));g.run('offerSkills("p5",null,10)');assert(g.nodes.get('modalBox').innerHTML.includes('属性型三选一'));});
for(const floor of [5,10,15,20,105,110])test(`构筑${floor}层真实通关与旧全技能待选恢复`,g=>{
 g.run(`gameMode="build";S=freshState();S.stage=5;S.floor=${floor};S.mobIdx=5;spawnMob();onKill()`);g.advance(1600);if(floor%10===0)g.run('continueMilestone()');
 const pool=floor%10===0?'POOL_10':'POOL_5';assert.deepEqual(g.json('curOffer'),g.json(pool));
 g.run('S.pendingOffer.picks=Object.keys(SKILLS);S.pendingOffer.pool=S.pendingOffer.pool==="p5"?"p10":"p5";save();load();offerSkills(S.pendingOffer.pool,S.pendingOffer.picks,S.pendingOffer.floor)');assert.deepEqual(g.json('curOffer'),g.json(pool));
});
test('构筑5层禁止领取属性技能，10层禁止领取触发技能',g=>{g.run('gameMode="build";S=freshState();offerSkills("p10",null,5);pickSkill("fire")');assert.equal(g.run('S.skills.length'),0);g.run('pickSkill("ghoststep");offerSkills("p5",null,10);pickSkill("soulrush")');assert.deepEqual(g.json('S.skills'),['ghoststep']);g.run('pickSkill("fire");pickSkill("neuro")');assert.deepEqual(g.json('S.skills'),['ghoststep','fire']);});
test('构筑重复迷彩保持+0.5秒描述，已有技能不清除',g=>{g.run('gameMode="build";S=freshState();S.skills=["fire","ghoststep"];offerSkills("p10",null,5)');assert(g.nodes.get('modalBox').innerHTML.includes('无敌持续时间增加 0.5 秒'));assert.deepEqual(g.json('S.skills'),['fire','ghoststep']);});
const report={count:results.length,passed:results.filter(x=>x.pass).length,results};fs.writeFileSync(path.join(__dirname,(process.env.OUTPUT_TAG||'final')+'-pool-results.json'),JSON.stringify(report,null,2));console.log(`${report.passed}/${report.count}`);results.filter(x=>!x.pass).forEach(x=>console.log(x.name,x.error));

if(process.env.OUTPUT_TAG!=='baseline'&&report.passed!==report.count)process.exitCode=1;
