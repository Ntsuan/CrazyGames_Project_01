const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert'),crypto=require('node:crypto');
const dir=__dirname,root=path.resolve(dir,'../..');
const read=f=>fs.readFileSync(path.join(dir,f),'utf8'),json=f=>JSON.parse(read(f));
const main=fs.readFileSync(path.join(root,'game/index.html'),'utf8'),old=read('baseline/index_v2.41.html');
const hash=s=>crypto.createHash('sha256').update(s).digest('hex');
assert.equal(main,read('site/index.html'));
assert.equal(main,fs.readFileSync(path.join(root,'game/versions/index_v2.42.html'),'utf8'));
new Function(main.match(/<script>([\s\S]*?)<\/script>/)[1]);
const oldLines=old.split('\n'),lines=main.split('\n');assert.equal(lines.length,oldLines.length);
const changed=lines.flatMap((line,i)=>line!==oldLines[i]?[i+1]:[]);
assert.equal(changed.length,3);
for(const i of changed)assert(/function dropBand\(|const w=hi-lo|const VERSION=/.test(lines[i-1]));
const before=json('baseline-core-results.json'),after=json('current-core-results.json');
assert.equal(before.sourceHash,hash(old));assert.equal(after.sourceHash,hash(main));
assert.deepStrictEqual(before.results.filter(x=>x.status==='FAIL'),after.results.filter(x=>x.status==='FAIL'));
assert.equal(after.passed,75);assert.deepStrictEqual(after.results.filter(x=>x.status==='FAIL').map(x=>x.id),['C75']);
const drop=json('drop-results.json'),affix=json('affix-results.json'),supply=json('supply-results.json');
assert(drop.every(x=>x.pass));assert(affix.every(x=>x.pass));
assert.equal(supply.versions.current.sha256,hash(main));assert.equal(supply.versions.baseline.sha256,hash(old));
assert.equal(supply.trials,10000);
for(const v of Object.values(supply.versions)){assert.equal(v.actualFunctionsCrosscheck,'PASS');assert(v.rows.every(r=>['any','weapon','all'].every(k=>r[k].n===10000)));}
const csv=fs.readFileSync(path.join(root,'design/装备表-v2.csv'),'utf8').trimEnd().split('\n'),oldCsv=read('baseline/装备表-v2.csv').trimEnd().split('\n');
assert.equal(csv.length,oldCsv.length);
const changedCsv=[];
for(let i=0;i<csv.length;i++)if(csv[i]!==oldCsv[i]){
 changedCsv.push(i+1);
 if(i===0)continue;
 const a=csv[i].split(','),b=oldCsv[i].split(',');assert.equal(a.length,b.length);
 a.forEach((value,c)=>{if(i>=7&&i<=10&&c===8)return;if(i>=14&&i<=16&&[3,8].includes(c))return;assert.equal(value,b[c]);});
}
const summary={author:'Codex',date:'2026-09-21',baseline:'v2.41',version:'v2.42',published:false,sha256:hash(main),baselineSha256:hash(old),changedGameLines:changed,changedCsvLines:changedCsv,sourceSnapshotAndTestCopyIdentical:true,syntax:'PASS',core:{baseline:before.passed+'/'+before.count,current:after.passed+'/'+after.count,existingFailure:'C75: historical logs retain 4 instead of 3'},drop:drop.length+'/'+drop.length,affix:affix.length+'/'+affix.length,supplyTrialsPerVersion:supply.trials,actualFunctionCrosscheckPerVersion:supply.crosscheckTrials};
fs.writeFileSync(path.join(dir,'summary.json'),JSON.stringify(summary,null,2));
const names=['报废','破损','民用','改装','军用','原型','传说','神话','永恒','不朽'];
const table=supply.versions.current.rows.map((r,q)=>`| ${names[q]} q${q} | ${supply.versions.baseline.rows[q].any.p50} | ${r.any.p50} | ${r.any.p10}–${r.any.p90} | ${r.weapon.p50} | ${r.all.p50} |`).join('\n');
const md=`# v2.42 第二步：高层掉落扩展与验证

日期：2026-09-21。**本次修改由 Codex 完成**。基线 v2.41 → v2.42；用户请求“开始第二步”。本地已完成，未发布，本次未核验线上。

## 实施结果

| 楼层 | v2.41 品质区间 | v2.42 品质区间 | 新版非保底基础权重 |
|---|---|---|---|
| 1–149 | 原四档 | 不变 | 原值 |
| 150–249 | 改装／军用／原型 | 军用 q4／原型 q5／传说 q6 | 58%／36%／6% |
| 250 起 | 改装／军用／原型 | 原型 q5／传说 q6／神话 q7 | 58%／36%／6% |

仅修改 game/index.html 第 ${changed.join('、')} 行：dropBand、rollQuality 权重表、VERSION。第一步词条、主属性、战斗与 Boss 演出代码均逐字保留。小怪 25%、Boss 必掉一件、四部位等概率、三合一不变；永恒／不朽仍仅合成。

权重针对实际掉落且非保底时；包含保底后的长期最高档占比高于 6%。连续 10 次实际掉落未出最高档，下件保底；空掉落不计数，跨部位／楼层共享，跨档保留计数并使用新最高档，重塑清零。149／249 层 Boss 先按旧区间掉落，再进入 150／250 层。

拆解仍要求背包装备低于当前下限且 q<4；因此 150 层起改装可拆，250 层后军用仍受保护。升档不会自动拆解或提升存量品质。读档保留已有装备与保底，之后使用新掉落规则。

## 装备获得楼层：新旧各 10,000 样本

从 1 层空装备出发，每层 5 小怪＋1 Boss，持续通关、不死亡／重塑／刷档／拆解，每次掉落后反复手动合成至无配方。并非游戏新增自动合成。

“首件”“武器”“四部位齐”均指达到至少该品质；可能跳过低品质。下表是中位数；P10–P90 覆盖中间约 80% 样本，不是最早／最晚保证。楼层按获得掉落的当前层统计。

| 品质 | 旧版首件中位层 | 新版首件中位层 | 新版首件 P10–P90 | 新版武器中位层 | 新版四部位齐中位层 |
|---|---:|---:|---|---:|---:|
${table}

第一件永恒 205→166 层，第一件不朽 514→254 层，四部位不朽 593→271 层。传说／神话的首次中位仍为 76／106 层：可在自然掉落开放前合成穿戴，150／250 是自然掉落门槛，不是穿戴限制。

供给模型直接执行冻结源码中的 rollQuality / weighted，并用三进制材料守恒推算即时合成。新旧各取前 100 个相同种子，执行真实 dropRoll / fuseInfo / fuseSlot，再对照独立模型：十品质 × 三类门槛的样本数、均值、P10/P50/P90 全部一致。游戏完整战斗与演出也消耗随机数，因此这些种子不是某个实际存档的轨迹。

## 已完成验证

- 掉落专项 **${summary.drop}**：150/250 边界、权重阈值两侧、25% 掉落门槛、Boss 必掉、10+1 保底、自然最高档清零、跨档继承、Boss 转层时机、四部位 q6/q7 词条与自动装备、低档入包、高阶合成、q8/q9 不自然掉落、拆解保护、不朽转金币、读档与重塑。
- 词条回归 **${summary.affix}**：原 v2.41 专项原样运行，包括小数吸血、实际属性、旧档迁移、合成／掉落词条与重塑清空。
- 核心基线与新版均 **75/76**；唯一失败为原有 C75，跨版本日志保留 4 段而非 3，失败内容相同。本次未修复该独立问题。
- 完整内联 JavaScript 编译通过；主文件、版本快照、测试冻结副本字节一致；基线与最终主文件仅三行变化。
- 装备 CSV 仅更新版本注释、q4–q7 掉落备注和掉落区间／概率／保底三条规则。使用 Spreadsheets 技能的 Artifact Tool 修改，并渲染前后视图检查；其余字段逐项对照保持。

本次为 Node VM 真实游戏函数测试（DOM／音频桩、虚拟时钟）及供给模拟，未执行新的浏览器／Safari 真机或完整高层战斗测试。不能据此断言玩家能打到 150／250 层，也不能把中位层数换算为真人分钟数。前期和 Boss 演出实现完全保留，但这不等于新增浏览器验收。

## 交接与剩余工作

WorkBuddy 可立即从 **v2.42** 接手；先读 [最新数值记录](../数值调整记录.md) 与 [项目交接](../../交接文档.md)。后续重点观察高层战斗可达性、每次升阶的合成点击量，以及真实操作中的升阶节奏；按用户安排发布。没有向 WorkBuddy 会话实际发消息，共享文档已明确作者。

独立既有问题：C75 日志保留数量；装备表 q8 插件／芯片为 131／262（代码 133／266），q9 为 177／354（代码 179／359）。这些主属性列本次原样保留，运行以代码为准，不宣称完成全表数值审计。

回退入口：[v2.41 源码备份](baseline/index_v2.41.html)，同目录保留修改前 CHANGELOG、装备表、MVP、交接和数值记录。只回退本次变动，保留用户存档与后续代码；若后续版本已有改动，应逆向应用三行差异，不直接整文件覆盖。

## 证据与复跑

- [掉落专项结果](drop-results.json)、[词条回归结果](affix-results.json)、[核心基线](baseline-core-results.json)、[核心新版](current-core-results.json)。
- [供给结果](supply-results.json)、[一致性摘要](summary.json)、[源码差异](changes.diff)。测试 site/index.html 是逻辑冻结副本，未包含运行所需图片素材；试玩请打开项目 game/index.html。
- 基线 SHA-256：\`${hash(old)}\`。
- v2.42 主文件／快照／测试副本 SHA-256：\`${hash(main)}\`。

在本报告目录，用 Node.js 执行以下命令；当前环境 Node 位于 /Users/zmy/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node。

\`\`\`sh
GAME_HTML=baseline/index_v2.41.html OUTPUT_TAG=baseline node core-tests.cjs
node affix-tests.cjs
node drop-tests.cjs
node supply.cjs
node report.cjs
\`\`\`

核心测试沿用既有脚本，需检查输出 JSON 中失败清单，不能只看退出码；report.cjs 会断言只有已知 C75。供给脚本复用 ../drop-projection-20260920/ 中模型与真实函数提取器，输入明确指向本 QA 的冻结源码，不覆盖历史结果。
`;
fs.writeFileSync(path.join(dir,'变更与验证报告.md'),md);
console.log(JSON.stringify(summary,null,2));
