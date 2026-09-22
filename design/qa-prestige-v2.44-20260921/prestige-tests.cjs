const fs=require('fs'),path=require('path'),assert=require('assert');
const {make}=require('./harness.cjs');
const results=[];
function test(name,fn){const g=make();try{fn(g);results.push({name,status:'PASS'});}catch(e){results.push({name,status:'FAIL',error:e.stack});}}
function milestone(g,f=10){g.run(`S.floor=${f};S.mobIdx=5;spawnMob();onKill()`);g.advance(1500);}
function preview(g){milestone(g);g.run('doPrestige()');}
function reload(g){const h=make();h.storage.set('neonHunter',g.storage.get('neonHunter'));h.run('load();spawnMob();openingRunIn()');return h;}
function state(g){return g.json('[S.floor,S.gold,S.runSouls,S.souls,S.prestiges,S.inv,S.equip,S.skills]');}
test('10/20/30/100 层在 Boss 奖励后提示，显示已通关层',g=>{
 for(const f of [10,20,30,100]){g.run('S=freshState();newSession()');milestone(g,f);
  assert.equal(g.run('S.prestigeOffer.floor'),f);assert.equal(g.run('S.floor'),f+1);
  assert(g.run('paused&&!skillOfferOpen'));assert(g.run('S.prestigeOffer.souls===S.runSouls&&S.runSouls>0'));
  assert(g.run(`$("modalBox").innerHTML.includes("第 ${f} 层已通关")`));
 }
});
test('9/11 层不提示，5/15 层仍直接选技能',()=>{
 for(const f of [5,9,11,15]){const g=make();milestone(g,f);assert.equal(g.run('S.prestigeOffer'),null);assert.equal(g.run('skillOfferOpen'),f%10===5);}
});
test('Boss 完整退场后才显示提示，待选意图立即保存',g=>{
 g.run('S.floor=10;S.mobIdx=5;spawnMob();onKill()');assert(!g.run('$("overlay").classList.contains("show")'));
 assert.equal(g.json('JSON.parse(localStorage.getItem("neonHunter")).prestigeOffer').stage,'choice');
 g.advance(1399);assert(!g.run('$("overlay").classList.contains("show")'));g.advance(1);assert(g.run('$("overlay").classList.contains("show")'));
});
test('提示期间不继续战斗或重复掉落',g=>{milestone(g);const before=state(g);g.run('onKill();lastT=performance.now()-100;loop(performance.now())');assert.deepStrictEqual(state(g),before);});
test('继续后选技能一次并进入 11 层，同层不再提醒',g=>{
 milestone(g);g.run('continueMilestone();continueMilestone()');assert(g.run('skillOfferOpen&&S.lastPrestigeMilestone===10&&!S.prestigeOffer'));
 g.run('pickSkill(curOffer[0])');g.advance(5000);assert(g.run('S.floor===11&&S.skills.length===1&&!paused&&!transit&&!S.pendingOffer'));
});
test('预览和返回不提交，继续后才生成技能候选',g=>{
 milestone(g);const before=state(g);g.run('doPrestige();backToMilestone();doPrestige();backToMilestone()');assert.deepStrictEqual(state(g),before);
 assert(g.run('S.prestigeOffer.stage==="choice"&&!skillOfferOpen'));g.run('continueMilestone()');assert.equal(g.run('curOffer.length'),3);
});
test('刷新待选页不重发 Boss 奖励',g=>{
 milestone(g);const before=state(g),h=reload(g);assert.deepStrictEqual(state(h),before);assert(h.run('paused&&pendingTransit&&!skillOfferOpen&&dispFloor===10'));
 h.advance(6000);assert.deepStrictEqual(state(h),before);assert(h.run('$("modalBox").innerHTML.includes("第 10 层已通关")'));
});
test('Boss 死亡动画中刷新恢复选择而非直接开战',g=>{
 g.run('S.floor=20;S.mobIdx=5;spawnMob();onKill()');const before=state(g),h=reload(g);assert.deepStrictEqual(state(h),before);assert(h.run('paused&&S.prestigeOffer.stage==="choice"'));
});
test('刷新预览保持冻结收益，返回继续正确接上技能',g=>{
 preview(g);const offer=g.json('S.prestigeOffer'),h=reload(g);assert.deepStrictEqual(h.json('S.prestigeOffer'),offer);
 assert(h.run('$("modalBox").innerHTML.includes("确认重塑")'));h.run('backToMilestone();continueMilestone();pickSkill(curOffer[0])');h.advance(5000);assert(h.run('S.floor===11&&!paused&&S.skills.length===1'));
});
test('继续后刷新仅恢复原技能候选，不再弹重塑',g=>{
 milestone(g);g.run('continueMilestone()');const picks=g.json('curOffer'),h=reload(g);h.advance(2000);assert.deepStrictEqual(h.json('curOffer'),picks);assert.equal(h.run('S.prestigeOffer'),null);
});
test('预览不提前显示完成，不隐藏普通结算或模拟标识',g=>{
 preview(g);assert(g.run('$("modalBox").innerHTML.includes("确认重塑")&&!$("modalBox").innerHTML.includes("重塑完成")'));
 assert(g.run('$("modalBox").innerHTML.includes("普通重塑")&&$("modalBox").innerHTML.includes("测试模拟")&&$("modalBox").innerHTML.includes("返回选择")'));
});
test('普通重塑只结算本轮，保留原碎片与永久成长',g=>{
 g.run('S.souls=7;S.tree.dmg=2;S.bestEver=99;S.atkLv=8;S.hpLv=5;S.skills=["nano"];S.equip.weapon={slot:"weapon",q:3};S.inv=[{slot:"armor",q:2}]');preview(g);
 const p=g.json('S.prestigeOffer');g.run('applyPrestige(1)');assert.deepStrictEqual(g.json('[S.souls,S.floor,S.atkLv,S.hpLv,S.skills.length,S.inv.length,S.bestEver,S.tree.dmg,S.gold]'),[7+p.souls,1,0,0,0,0,99,2,p.salvage]);
 assert(g.run('Object.values(S.equip).every(x=>x===null)&&!S.pendingOffer&&!S.prestigeOffer&&S.lastPrestigeMilestone===0'));
});
test('回收按通关层估值，非递增后的下一层',g=>{
 g.run('S.equip.weapon={slot:"weapon",q:3}');preview(g);assert.equal(g.run('S.prestigeOffer.salvage'),g.run('salvageAllGold(10).g'));assert(g.run('S.prestigeOffer.salvage<salvageAllGold(11).g'));
});
test('普通重塑延迟连点、刷新后重试均不会重复结算',g=>{
 preview(g);g.run('applyPrestige(1)');const souls=g.run('S.souls');g.advance(5000);g.run('applyPrestige(1);applyPrestige(2);doPrestige()');assert.equal(g.run('S.souls'),souls);assert.equal(g.run('S.prestiges'),1);
 const h=reload(g);h.run('applyPrestige(1)');assert.equal(h.run('S.souls'),souls);assert.equal(h.run('S.prestiges'),1);
});
test('没有有效预览或未看广告不能结算或直接翻倍',g=>{
 g.run('S.runSouls=10;applyPrestige(1);applyPrestige(2);doPrestige()');assert.equal(g.run('S.prestiges'),0);
 preview(g);g.run('applyPrestige(2);applyPrestige(0);applyPrestige(3)');assert.equal(g.run('S.prestiges'),0);
});
test('广告点击仅发起模拟，未完成不发奖；完成仅翻倍本轮碎片',g=>{
 g.run('S.souls=9;S.equip.weapon={slot:"weapon",q:3}');preview(g);const p=g.json('S.prestigeOffer');g.run('requestPrestigeAd()');assert.equal(g.run('S.prestiges'),0);
 assert(g.run('$("modalBox").innerHTML.includes("未播放真实广告")'));g.run('finishPrestigeAd(prestigeAd.attempt,"completed")');assert.equal(g.run('S.souls'),9+p.souls*2);assert.equal(g.run('S.gold'),p.salvage);
});
test('广告取消和失败保留本轮，普通重塑仍可用',g=>{
 preview(g);const before=state(g);for(const r of ['cancelled','error','unavailable']){g.run(`requestPrestigeAd();finishPrestigeAd(prestigeAd.attempt,"${r}")`);assert.deepStrictEqual(state(g),before);assert(g.run('!adLock&&!prestigeAd&&S.prestigeOffer.stage==="preview"'));}
 g.run('applyPrestige(1)');assert.equal(g.run('S.prestiges'),1);
});
test('请求中重复点按、普通结算、返回均不穿透',g=>{
 preview(g);g.run('requestPrestigeAd()');const attempt=g.run('prestigeAd.attempt');g.run('requestPrestigeAd();applyPrestige(1);backToMilestone();askReset()');assert.equal(g.run('prestigeAd.attempt'),attempt);assert.equal(g.run('S.prestiges'),0);assert(!g.run('confirmOpen'));
});
test('旧广告回调不得结算重试中的新请求',g=>{
 preview(g);g.run('requestPrestigeAd()');const old=g.run('prestigeAd.attempt');g.run(`finishPrestigeAd(${old},"cancelled");requestPrestigeAd();finishPrestigeAd(${old},"completed")`);assert.equal(g.run('S.prestiges'),0);assert(g.run('prestigeAd!==null'));
});
test('广告成功重复回调只提交一次',g=>{
 preview(g);g.run('requestPrestigeAd()');const a=g.run('prestigeAd.attempt');g.run(`finishPrestigeAd(${a},"completed");finishPrestigeAd(${a},"completed")`);g.advance(5000);g.run(`finishPrestigeAd(${a},"completed")`);assert.equal(g.run('S.prestiges'),1);
});
test('广告中刷新返回预览，未把请求当作观看完成',g=>{
 preview(g);g.run('requestPrestigeAd()');const h=reload(g);assert(h.run('!prestigeAd&&!adLock&&!S.prestigeOffer.adRewarded&&S.prestigeOffer.stage==="preview"'));assert.equal(h.run('S.prestiges'),0);
});
test('普通结算存档失败不结束本轮，恢复存储后可重试一次',g=>{
 preview(g);const before=state(g);g.run('let originalSet=localStorage.setItem;localStorage.setItem=()=>{throw Error("full")};applyPrestige(1)');assert.deepStrictEqual(state(g),before);assert(g.run('$("modalBox").innerHTML.includes("尚未结算")'));
 g.run('localStorage.setItem=originalSet;applyPrestige(1);applyPrestige(1)');assert.equal(g.run('S.prestiges'),1);
});
test('已看广告但结算写失败保留资格，可刷新后免费重试',g=>{
 preview(g);g.run('requestPrestigeAd();let originalSet=localStorage.setItem;localStorage.setItem=(k,v)=>{if(k==="neonHunter"&&JSON.parse(v).prestiges===1)throw Error("commit fail");originalSet(k,v)};finishPrestigeAd(prestigeAd.attempt,"completed")');
 assert(g.run('S.prestiges===0&&S.prestigeOffer.adRewarded'));const h=reload(g);assert(h.run('S.prestigeOffer.adRewarded'));h.run('applyPrestige(1)');assert.equal(h.run('S.prestiges'),0);h.run('applyPrestige(2)');assert.equal(h.run('S.prestiges'),1);
});
test('重塑立即存档；动画未完成时刷新不重复收益',g=>{
 preview(g);g.run('applyPrestige(1)');assert.equal(g.json('JSON.parse(localStorage.getItem("neonHunter"))').prestiges,1);const h=reload(g);assert.equal(h.run('S.prestiges'),1);assert.equal(h.run('S.floor'),1);assert.equal(h.run('S.runSouls'),0);
});
test('重塑清理技能意图和旧转场，不在新局出现旧技能',g=>{
 preview(g);g.run('applyPrestige(1)');g.advance(10000);assert(g.run('S.floor===1&&!S.pendingOffer&&!skillOfferOpen&&!pendingSkillOffer&&!pendingTransit&&!wall'));
});
test('新一轮再次通关 10 层可以再次选择',g=>{
 preview(g);g.run('applyPrestige(1)');g.advance(5000);milestone(g);assert(g.run('S.prestigeOffer.floor===10&&S.prestigeOffer.id.startsWith("1:")'));
});
test('同轮下一里程碑重新出现，累计未结算碎片保留',g=>{
 milestone(g);const souls=g.run('S.runSouls');g.run('continueMilestone();pickSkill(curOffer[0])');g.advance(5000);milestone(g,20);assert.equal(g.run('S.prestigeOffer.floor'),20);assert(g.run(`S.runSouls>${souls}`));
});
test('死亡／受阻仍仅可重塑，无返回活战入口',g=>{
 g.run('S.floor=8;S.runSouls=7;player.hp=0;checkWall(.1)');g.advance(1300);g.run('doPrestige();backToMilestone();continueMilestone()');assert(g.run('S.prestigeOffer.source==="wall"&&S.prestigeOffer.stage==="preview"&&wall&&paused'));assert(!g.run('$("modalBox").innerHTML.includes("返回选择")'));
});
test('死亡动画中及死亡预览刷新恢复受阻，不复活继续战斗',g=>{
 g.run('player.hp=0;checkWall(.1)');let h=reload(g);assert(h.run('wall&&paused&&S.prestigeOffer.stage==="blocked"'));
 h.run('doPrestige()');h=reload(h);assert(h.run('wall&&paused&&S.prestigeOffer.stage==="preview"'));h.run('applyPrestige(1)');h.advance(5000);assert(h.run('!wall&&player.hp>0&&S.prestiges===1'));
});
test('里程碑期间复位取消恢复原选择，确认则彻底丢弃旧流程',g=>{
 milestone(g);g.run('askReset();cancelReset()');assert(g.run('$("modalBox").innerHTML.includes("第 10 层已通关")'));g.run('doPrestige();askReset();cancelReset()');assert(g.run('$("modalBox").innerHTML.includes("确认重塑")'));
 g.run('doReset()');g.advance(5000);assert(g.run('S.floor===1&&!S.prestigeOffer&&!S.pendingOffer&&!pendingTransit&&!prestigeAd'));
});
test('Boss 退场时被复位确认盖住，取消恢复里程碑',g=>{
 g.run('S.floor=10;S.mobIdx=5;spawnMob();onKill();askReset()');g.advance(1500);assert(g.run('$("modalBox").innerHTML.includes("确认复位")'));g.run('cancelReset()');assert(g.run('$("modalBox").innerHTML.includes("第 10 层已通关")'));
});
test('复位后即使旧广告返回成功也不发奖',g=>{
 preview(g);g.run('requestPrestigeAd()');const a=g.run('prestigeAd.attempt');g.run(`doReset();finishPrestigeAd(${a},"completed")`);assert.equal(g.run('S.souls'),0);assert.equal(g.run('S.prestiges'),0);
});
test('旧 v2.43 存档不凭当前层补发提醒，待选技能照常恢复',g=>{
 g.run('S.floor=11;S.pendingOffer={pool:"p10",picks:["fire","neuro","nano"],floor:10};delete S.prestigeOffer;delete S.lastPrestigeMilestone;save()');const h=reload(g);h.advance(2000);assert(h.run('!S.prestigeOffer&&skillOfferOpen'));assert.equal(h.run('S.lastPrestigeMilestone'),0);
});
test('日志区分里程碑选择、广告结果和最终一次结算',g=>{
 preview(g);g.run('requestPrestigeAd();finishPrestigeAd(prestigeAd.attempt,"cancelled");requestPrestigeAd();finishPrestigeAd(prestigeAd.attempt,"completed")');
 assert(g.run('curSession.events.some(e=>e.type==="prestige_prompt")'));assert(g.run('curSession.events.some(e=>e.type==="prestige_ad"&&e.result==="cancelled")'));
 assert.equal(g.run('curSession.events.filter(e=>e.type==="prestige").length'),1);assert.equal(g.run('curSession.events.find(e=>e.type==="prestige").source'),'milestone');
});
const report={version:'v2.44',environment:'Node VM, real game functions, isolated storage and virtual clock',count:results.length,passed:results.filter(x=>x.status==='PASS').length,results};
fs.writeFileSync(path.join(__dirname,'prestige-results.json'),JSON.stringify(report,null,2));
console.log(`${report.passed}/${report.count} PASS`);for(const r of results.filter(x=>x.status==='FAIL')) console.log(r.name,r.error);
if(report.passed!==report.count)process.exitCode=1;
