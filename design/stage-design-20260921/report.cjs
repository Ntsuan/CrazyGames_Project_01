const fs=require('fs'),assert=require('assert'),crypto=require('crypto');
const dir=__dirname;
const read=name=>JSON.parse(fs.readFileSync(dir+'/'+name+'-results.json','utf8'));
const candidates=read('candidates'),cycles=read('cycles'),pilot=read('costpilot'),stages=read('stages'),gate=read('gate');
const source=fs.readFileSync(dir+'/baseline.html');
const sha=crypto.createHash('sha256').update(source).digest('hex');
for(const file of [candidates,cycles,pilot,stages,gate])assert.equal(file.sourceSha256,sha);
assert.equal(gate.results.length,5);
assert(gate.results.every(x=>!x.capHit&&x.runs.at(-1).cleared100));
const table=gate.results.map((r,i)=>`| ${i+1} | ${r.mult}× | ${8*r.mult} | ${100*r.mult} | ${r.runs[0].floor} | ${r.runs.length} | ${r.runs.length-1} |`).join('\n');
const paths=gate.results.map((r,i)=>`- 阶段 ${i+1}：${r.runs.map(x=>x.cleared100?'通关100':x.floor+'层受阻').join(' → ')}。`).join('\n');
const observed=gate.results.map((r,i)=>({stage:i+1,baseMultiplier:r.mult,initialAttack:r.mult*8,initialHp:r.mult*100,firstWall:r.runs[0].floor,runsToClear:r.runs.length,prestiges:r.runs.length-1}));
fs.writeFileSync(dir+'/proposal-summary.json',JSON.stringify({author:'Codex',date:'2026-09-21',status:'design_only_not_implemented',baselineVersion:'v2.43',sourceSha256:sha,confirmed:{stageCount:5,advanceAfterFloor:100,returnToFloor:1,resetTreeAndSouls:true},candidate:{costBase:6,costGrowth:1.18,statGrowth:1.1,stageBoss:{hpMultiplier:8,attackMultiplier:2,shieldFraction:.8},stages:observed},validation:'One fixed seed per stage; no crates or ad doubling; balanced tree policy; proposals exist only in disposable VM'},null,2));
const report=`# 五阶段人物成长数值设计 v0.1

> 2026-09-21 广告情景补验：加入每60秒补给及重塑广告×2后，25个阶段样本全部一轮通关；本提案的无广告轮数不代表广告场景节奏。见 [广告设定仿真](广告设定仿真.md)。

日期：2026-09-21；设计者 **Codex**；工程基线 v2.43。**本文件是设计提案与候选模拟，未修改正式游戏代码、数值表或游戏版本，未发布。** 文档 v0.1 不是游戏版本。

## 用户已确认的规则

1. 人物共有五个阶段。前四阶段击败本阶段第 100 层 Boss 后，晋升下一阶段并回到第 1 层。
2. 晋升时清空装备、背包、强化等级、金币、技能，以及永久加成树和未使用碎片。局内碎片、开箱计数和掉落保底同时归零；不把旧装备回收成新阶段启动金币。
3. 人物初始攻击与生命随阶段增强，具体数值由 Codex 设计。

下列数值及未明确的边界均为本次建议，不将模拟改动当作已生效代码。

## 建议的初始属性

| 阶段 | 相对阶段1倍率 | 初始攻击 | 初始生命 | 首轮受阻层（样本） | 通关100所用轮数（样本） | 阶段内死亡重塑次数（样本） |
|---|---:|---:|---:|---:|---:|---:|
${table}

以上是**绝对初始值**，不是在上一阶段已强化的属性上再乘倍率。每次阶段内死亡重塑仍回到该阶段的初始攻血。基础攻速保持 1.3；初始暴击、护盾、吸血不额外加成；所有阶段的 1–100 层先共用敌人攻血／金币／掉落规则。

实际属性公式仍由初始值乘 1.10^强化等级，再乘装备、技能和树的对应加成。阶段越高，重新开始越有优势；晋升前的大量强化、装备与树仍会被清空，所以晋升后第一层的面板数字不保证高于上一阶段第100层的毕业面板。

## 必须一起评估的配套候选

上述通关样本使用以下候选参数，**不能把这些结果归因于初始属性倍率单独起效**。

| 参数 | 当前 v2.43 | 本提案候选 |
|---|---:|---:|
| 强化起始费用 | 6 | 6 |
| 每级费用增长 | ×1.25 | ×1.18 |
| 每级基础属性成长 | ×1.10 | ×1.10 |
| 敌人每层攻血／金币成长 | ×1.15 | ×1.15 |
| 阶段第100层 Boss 生命倍率 | 普通怪 ×10 | 普通怪 ×8 |
| 阶段第100层 Boss 攻击倍率 | 普通怪 ×3 | 普通怪 ×2 |
| 阶段第100层 Boss 护盾 | 自身生命的100% | 自身生命的80% |
| 百层 Boss 主炮倍率／相位 | 当前值 | 保持 |

这里把阶段第100层看作可跨越的晋升门槛。改后的有效生命为普通怪的 14.4 倍（旧值20倍），仍高于棱镜 Boss 的10.8倍，且保留双武器机制。该阶段门槛配置不自动用于无尽模式的200／300层 Boss，避免顺手削弱全部无尽 Boss。

费用 1.25→1.18 是大幅调整，会让首轮推进更深、会话更长，也放大补给的购买力。它是为“反复完成100层并全清成长”提出的独立配套候选，需要单独留数值修改记录；不因为用户授权设计初始值就宣称已经修改了这条曲线。

## 两种重置的区别

| 数据 | 阶段内死亡重塑 | 通关100层晋升 |
|---|---|---|
| 当前阶段与该阶段初始属性 | 保留 | 升至下一阶段，使用新初始值 |
| 楼层、强化等级、装备、技能、保底、开箱计数 | 按原重塑重置到1层 | 清空，回到1层 |
| 金币 | 原规则：装备15%回收作为启动金 | 归零，不回收旧装备 |
| 加成树、未用碎片 | 保留，按原规则结算本轮碎片 | 全部归零，包括刚获得的本轮碎片 |
| 历史通关／倍速资格 | 保留本阶段已通关范围 | 本阶段资格归零，重新记录 |
| 音效偏好、测试日志、阶段解锁记录 | 保留 | 保留，不属于战斗成长资源 |

阶段内保留原重塑成长，是这套设计能够逐轮接近100层的前提；“晋升时全部清空”不应误实现为“每次死亡连树也清空”。此解释依据用户对晋升清空范围的确认。

## 第五阶段与无尽

建议第五阶段第一次击败100层 Boss 后，解锁无尽，从 **101层继续**，不再晋升第六阶段，也不再清空第五阶段的成果。这里的保留是无尽模式边界的设计建议，区别于前四次晋升清空。

无尽解锁记录永久保留。无尽中死亡仍在阶段5重塑并从1层再战，保留阶段5加成树／碎片及原装备回收规则；再次通过100层后继续推进，不重复发首次解锁奖励。

现有150层传说、250层神话自然掉落规则归属于无尽进度；前五阶段的100层内，可依靠合成提前获得高品质。自然掉落门槛继续使用本轮实际楼层，不按累计跨阶段层数计算。

## 仿真依据与局限

冻结源码 SHA-256：${sha}。

- 原费用1.25下，仅调整初始倍率的首轮筛选，倍率1/2/4/8/16/32/64，各3个种子，结果见 candidates-results.json。
- 原费用1.25下，单种子连续8轮：原始倍率1的受阻序列为20→29→35→36→38→40→40→44；倍率16虽到达100层，但8轮内仍没有击败100层 Boss。不能将“到达100层”写成“通关100层”。
- 费用1.18/1.20/1.22分别进行原始人物6轮诊断；费用1.18更接近晋升目标，但原百层 Boss 仍造成停滞。详见 costpilot-results.json。
- 在费用1.18、原百层 Boss 下，对五档初始倍率分别模拟最多12轮，详见 stages-results.json；不是所有阶段都在该上限内通关。
- 最终候选将阶段百层 Boss 改为8倍血、2倍攻、80%盾，五阶段分别从全空成长状态测试，同一种子、最多12轮。五项均真实完成100层，详见 gate-results.json。

最终候选各阶段路径：

${paths}

模型直接执行原游戏战斗、装备、技能、金币、重塑和加成树购买函数，仅在一次性 VM 中替换列明的候选参数。虚拟30fps，每2秒升级并及时重复合成；固定技能优先级；攻击购买偏好系数1.5；树投入按伤害／金币／碎片约2:2:1；不领补给、不用广告翻倍。

表中通关轮数是**每阶段单个种子的样本，不是中位数或保证值**，没有统计玩家策略分布。这是数值可达性检查，不是晋升功能联调：五阶段各自新建空状态，正式的清档／晋升／无尽状态机尚未实现。当前补给无限即时领取的问题仍在；采用本提案的低费用曲线前，必须另测补给频率与奖励上限，否则阶段节奏可能被跳过。

仿真已发现首阶段首轮明显比旧版更长；后续验收要确认首轮会话长度、100层 Boss 的多次受阻是否可接受、晋升后的资源清空是否有足够反馈。未验证真实广告耗时、手机操作、低效技能组合、旧档迁移或无尽长期平衡。第100层Boss方案仅按阶段模式验证，不代表已测试无尽。

## 实现边界与接手

正式实现需要独立的角色阶段字段、无尽解锁字段与阶段内最高层记录；通关100层的晋升不能直接调用普通死亡重塑，否则会错误保留树／碎片或给旧装备变现金。前四阶段100层奖励后进入晋升流程，避免旧的技能弹窗／转场回调带入新阶段；第五阶段按无尽分支处理。

旧存档不应在加载时静默清空或自动连升多个阶段；迁移规则需要在实施时单列。音效设置与测试历史应保留。正式数值与行为修改时按 AGENTS.md 递增最新游戏版本、留基线、更新CHANGELOG、保存最终快照、测试存档与重置，并标明Codex修改供WorkBuddy接手。

本次已完成的是设计与模拟；现行游戏仍以主文件VERSION为准，尚无五阶段晋升功能。所有候选均未写入game/index.html。数值方案可依据本目录脚本复跑，模拟输出不是可发布的游戏版本。

复跑：node simulate.cjs candidates / cycles / costpilot / stages / gate；最后 node report.cjs。旧经济分析中的“暂不降费用”结论基于单一无限爬塔循环，本提案是在用户新增五阶段全清重开目标之后的重新评估。
`;
fs.writeFileSync(dir+'/五阶段成长设计.md',report);
console.table(observed);
