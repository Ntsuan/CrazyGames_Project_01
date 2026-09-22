import json
from pathlib import Path
from statistics import median

ROOT = Path(__file__).resolve().parent
FILES = ['screen', 'compare', 'stages', 'stage-controls', 'farm']
rows = sum([json.loads((ROOT / (f + '-results.json')).read_text())['results'] for f in FILES], [])
checks = json.loads((ROOT / 'checks.json').read_text())
def select(**keys):
    return [r for r in rows if all(r.get(k) == v for k, v in keys.items())]
def summary(rs):
    return dict(samples=len(rs), cleared=sum(r['clear100'] for r in rs),
                medianMinutes=median(r['minutes'] for r in rs),
                minMinutes=min(r['minutes'] for r in rs), maxMinutes=max(r['minutes'] for r in rs),
                medianActive=median(r['active'] for r in rs), medianDeaths=median(r['deaths'] for r in rs),
                medianCrates=median(r['crates'] for r in rs),
                medianCrateShare=median(r['crateShare'] for r in rs),
                medianCrateShareIncludingRecycling=median(r['crateGold'] / (r['crateGold'] + r['killGold'] + r['convertGold'] + r['recycledGold']) for r in rs))
stages = []
for stage, mult in enumerate([1, 1.5, 2, 3, 4], 1):
    stages.append(dict(stage=stage, mult=mult, **{pol:summary(select(id='flat20_cost118',mult=mult,policy=pol)) for pol in ['death_only','cautious']}))
totals = {}
for pol in ['death_only','cautious']:
    totals[pol] = [dict(seed=seed,
        minutes=sum(r['minutes'] for r in select(id='flat20_cost118',policy=pol,seed=seed)),
        crates=sum(r['crates'] for r in select(id='flat20_cost118',policy=pol,seed=seed)),
        prestigeAds=sum(r['active']+r['deaths'] for r in select(id='flat20_cost118',policy=pol,seed=seed))) for seed in [1,2,3]]
out = dict(status='simulation_only', author='Codex', documentVersion='v0.2', baselineVersion='v2.43', checks=checks,
    recommended=dict(crateBase=20,crateCountGrowth=False,tenthBoxDouble=False,crateIntervalSeconds=60,costGrowth=1.18,
        activePrestigeCheckpoints=list(range(10,100,10)),normalPrestigeMultiplier=1,adPrestigeMultiplier=2,
        initialAttack=[8,12,16,24,32],initialHP=[100,150,200,300,400],stage100Boss=dict(hp=8,attack=2,shield=.8)),
    stageSummary=stages,pairedFiveStageTotals=totals)
(ROOT/'summary.json').write_text(json.dumps(out,ensure_ascii=False,indent=2)+'\n')

lines = ['''# 主动重塑与广告平衡建议 v0.2

日期：2026-09-21；作者：**Codex**；正式工程基线：**v2.43**。

**本次修改的是仿真脚本、分析报告与交接记录。正式游戏代码、数值、VERSION、CHANGELOG、版本快照均未修改；未发布，未接入广告 SDK。** 文档 v0.2 不是游戏版本。

## 结论与推荐参数

每通关 10 层提供主动重塑是可行的选择入口，但单独增加入口无法抵消现有补给的箱数膨胀。建议采用下列候选：固定补给 ×20、去掉次数增长及第十箱翻倍，沿用费用增长 1.18；重塑提供普通结算与看广告碎片 ×2 两种选项。入口应可跳过，不要求每到检查点就重塑。

| 项目 | 正式 v2.43／上一轮候选 | 本轮推荐 |
|---|---|---|
| 主动重塑 | 正式代码仅死亡重塑 | 击败 10、20……90 层 Boss 后可选；本阶段 100 层先处理升阶／无尽解锁 |
| 重塑碎片 | 正式已有普通 ×1／广告 ×2 | 沿用；广告只翻倍本轮待结算碎片，不翻倍存量、树或装备回收金币 |
| 补给间隔 | 正式未实现 60 秒冷却；上一轮仿真已加 | 游戏在线运行 60 秒可领一次；首次也等 60 秒；不自动播放广告 |
| 单箱金币 | `round(mobGold(f) × 60 × goldMult × (1+0.25n+0.02n²) × milestone)` | `round(mobGold(f) × 20 × goldMult)` |
| 箱数增长／第十箱翻倍 | 二次增长／每第 10 箱 ×2 | 均移除 |
| 攻击与生命强化费用 | 正式 `6×1.25^L`；上一轮候选 `6×1.18^L` | 两项均沿用候选 `6×1.18^L`；属性每级 ×1.10 不变 |
| 五阶段初始攻击／生命 | 上一轮候选 8/12/16/24/32；100/150/200/300/400 | 保留上述绝对基础值 |
| 阶段 100 层 Boss | 正式生命 ×10、攻击 ×3、护盾 100% 生命；候选 ×8/×2/80% | 沿用候选 ×8/×2/80%；炮击倍率不改，无尽百层 Boss 尚未评估 |
| 普通重塑与升阶 | 用户已确认升阶全部清空 | 普通重塑保留本阶段树／存量碎片；前四阶段升阶时全清并回到 1 层 |

`n` 为本轮此前已开的箱数。`goldMult` 仍包含芯片、金币树和黑市技能。一个楼层有 5 小怪＋1 个金币为小怪 5 倍的 Boss，所以固定 ×20 相当于 **2 份本层整层击杀金币**，不是跨越两个递增楼层的精确总和。旧公式第 40 箱为 ×4940.4 小怪金币，固定 ×20 可避免这种随箱数扩大到数百层同层等价收入的情况。

主动重塑按钮建议在奖励结算后与“继续攀登”并列；继续攀登后再选当层技能，主动重塑则取消旧技能弹窗及旧转场。显示本轮碎片、普通可得、广告可得与重开清空内容。只在该检查点结算窗口开放，不解释为通过第 10 层后任意时刻都能重塑。第 100 层不先弹普通重塑，以免遮蔽升阶；第五阶段通关 100 后保留进度进入 101 无尽仍是此前设计建议，无尽 110/120 等入口需单独联调。

补给计时跨普通重塑延续，不能靠重塑立即领取新箱；进入新阶段才重置。战斗 2× 不加速补给冷却；广告播放、等待和后台时间不计入。实际 SDK 应成功完成后才发奖、消耗领取机会。

## 仿真口径

- 冻结 v2.43，直接运行真实战斗、掉落、装备、合成、强化、技能、树购买、补给和重塑函数；候选参数只替换内存中的源码。屏蔽 DOM 渲染及存储写入以加速。
- 每阶段从全空状态独立开始。阶段间全清通过独立实例表示，**未联调正式升阶状态机、存档迁移或无尽**。
- 沿用用户上一轮“重塑必选广告”的模拟假设：所有重塑 ×2、每次到时即领取补给。普通 ×1 仅做函数验证，未跑无广告完整进程。
- 每 2 秒自动合成、消费金币，升级费用比较使用攻击 1.5 权重；不额外自动拆解背包。树按伤害／金币／碎片约 2:2:1 购买。
- 固定技能优先级：fire、nano、neuro、shield、subdermal、blackmarket、overclock、fatal、resonance、adrenaline、ghoststep、lowhp、critsurge、killcycle、soulrush。三选一仍随机，装备品质、部位、保底及实装选择仍执行真实代码，未假定毕业装或任意挑技能。
- “等死亡”：从不主动重塑；“有条件”：结算时生命不足 35%，或该 Boss 战斗计时大于 12 秒，并且检查点高于上次主动重塑层；“阶梯”：依次在 10/20/…/90 各重塑一次；“低层刷取”：在 10 层重复指定次数后继续推进。12 秒使用源码战斗计时，2× 时不等于 12 秒在线时间。均为固定启发策略，**不是最优策略搜索或正式强制重塑规则**。
- 每检查点先计入该 Boss 的金币、碎片和装备，再决定重塑。源码已把 `S.floor` 推到下一层，装备回收沿用这个现有行为；不会额外把回收收入翻倍。
- 55 个模拟样本：17 个初筛／刷取诊断，8 个补给档位复核，24 个阶段 2–5 对照，6 个刷取后推进。每配置通常仅 1 或 3 个种子，不能估计人群通关率或置信区间。
- 通常最多 20 次重塑、360 分钟；刷取后推进最多 30 次；纯刷取诊断最多 10 次、120 分钟。上限截断不视为实际死亡或功能失败。
- 下文“补给金币占比”＝补给／（补给＋击杀＋掉落转换），**不含重塑装备回收**。包含回收的另一口径存于 summary.json，不能与前者混用。

## 首阶段对照

### 只增加重塑入口，保留旧补给奖励

种子 1：不主动重塑和有条件重塑均 **40.6 分钟、零重塑通关**，补给占新增金币约 **99.2%**；主动入口没有被需要。阶梯重塑则 **104.0 分钟、9 次主动重塑**，补给仍约 **91.0%**。上一轮 5 阶段 ×5 种子的“全都第一轮通关”结果仍适用，但本轮阶梯对照只有 1 种子。

### 固定奖励后的三个种子

| 单箱倍率 | 策略 | 通关中位分钟 | 最小—最大分钟 | 主动／死亡重塑中位次数 | 补给金币占比中位 |
|---|---|---:|---:|---:|---:|''']
for base in [10,20]:
    for pol, name in [('death_only','等死亡'),('cautious','有条件')]:
        s=summary(select(id=f'flat{base}_cost118',mult=1,policy=pol))
        lines.append(f"| ×{base} | {name} | {s['medianMinutes']:.1f} | {s['minMinutes']:.1f}—{s['maxMinutes']:.1f} | {s['medianActive']:g}／{s['medianDeaths']:g} | {s['medianCrateShare']:.1%} |")
lines.append('''
×20 有条件重塑在同种子对照中都比等死亡快，中位约缩短 19.2%；其补给占比包含回收后为 37.4%。推荐 ×20 是为了让一次广告仍有明确收益，同时控制金币来源；**不是因为它通关最快**。×10 有条件组中位更快，但本组三样本范围更宽，可作为广告依赖更低的备选。两档改变升级、死亡、随机调用与技能路径，结果不能按奖励量单调外推，也不能凭三个种子认定稳定性已经得到统计证明。

### 费用增长率初筛

固定 ×20，种子 1：

| 费用增长率 | 等死亡 | 有条件重塑 | 阶梯重塑 |
|---|---|---|---|''')
for cost in [118,120,122]:
    vals=[]
    for pol in ['death_only','cautious','ladder']:
        r=select(id=f'flat20_cost{cost}',mult=1,policy=pol,seed=1)[0]
        vals.append(f"{r['minutes']:.1f} 分钟"+('通关' if r['clear100'] else '，20 次重塑上限未通关'))
    lines.append(f"| {cost/100:.2f} | "+' | '.join(vals)+' |')
lines.append('''
保留 1.18。此次不建议为了抑制广告而将费用改回 1.20/1.22；它会同时增加正常掉落、装备和技能系统的推进压力。本轮没有重跑正式 1.25 或无广告全流程，不将此表写成正式版本实测结果。

## 五阶段复核：推荐 ×20＋费用 1.18

每阶段每策略 3 个种子，30 个样本全部击败 100 层 Boss。下表为每列独立中位数；主动与死亡次数中位数不用于推算精确轮数。

| 阶段 | 等死亡通关分钟 | 有条件通关分钟 | 有条件范围 | 主动／死亡次数 | 补给占比 | 补给箱数 |
|---|---:|---:|---:|---:|---:|---:|''')
for s in stages:
    a,b=s['death_only'],s['cautious']
    lines.append(f"| {s['stage']} | {a['medianMinutes']:.1f} | {b['medianMinutes']:.1f} | {b['minMinutes']:.1f}—{b['maxMinutes']:.1f} | {b['medianActive']:g}／{b['medianDeaths']:g} | {b['medianCrateShare']:.1%} | {b['medianCrates']:g} |")
med_total=median(x['minutes'] for x in totals['cautious'])
lines.append(f'''
按相同种子汇总五阶段，有条件组总游戏时间中位 **{med_total:.1f} 分钟（{med_total/60:.2f} 小时）**，并非各阶段中位数简单相加。不含广告播放、操作犹豫、休息及无尽时间，也不是连续升阶联调。

主动重塑有代价：阶段 2 本组反而更慢；阶段 5 也没有严格快于阶段 4。因此不建议把“每 10 层重塑”设成必选、不建议依据本组三样本再改阶段基础属性。首阶段仍有多次 100 层失败，约两小时；这份方案恢复了多轮成长，**尚未证明适合短局节奏**。若按每次都看广告执行，补给观看数量会接近游戏分钟数，真实总耗时明显更长；60 秒应作为可领取间隔，而不是自动播放要求。

## 低层刷碎片是否成为捷径

| 策略（固定 ×20） | 样本数 | 通关中位分钟 | 最小—最大 | 主动／死亡次数中位 |
|---|---:|---:|---:|---:|''')
for count in [3,10]:
    s=summary(select(id='flat20_cost118',policy='farm_then_push',farmResets=count))
    lines.append(f"| 10 层刷 {count} 次后推进 | {s['samples']} | {s['medianMinutes']:.1f} | {s['minMinutes']:.1f}—{s['maxMinutes']:.1f} | {s['medianActive']:g}／{s['medianDeaths']:g} |")
lines.append('''
纯诊断中，重复在 10 层重塑 10 次：固定 ×20 用时 22.8 分钟，到账 428 碎片，约 18.7 碎片／分钟；旧补给约 21.4 分钟、同样 428 碎片。它们按设计停在 10 次重塑上限，不能标成“爬塔通关失败”。

刷 3 次组可快于有条件策略，刷 10 次组中也有 96.5 分钟的快样本，但另外两例超过 150 分钟。**未证明低层循环是稳定最优，也未证明完全没有刷取收益。** 暂不增加碎片惩罚或同层禁重塑，避免把可选策略直接封死；保留首次 60 秒等待与跨重塑冷却，避免顺带刷免费补给。更大样本与其他树／技能选择仍需验证。

## 校验、复跑与交接

已验证：新模型完整复现上一轮阶段 1 种子 1 的时间、补给箱数、补给／击杀／转换金币；55 个样本共 6103 个补给事件满足首次及间隔至少 60 秒，313 个重塑事件全部正确结算 ×2，主动重塑只发生于已通关 10–90 层。普通 ×1 与广告 ×2 的独立函数检查分别得到 32／57 碎片（原有 7、本轮 25），局内状态清空、树保留。

这不等于浏览器、广告 SDK、正式按钮、晋升、读档或真人体验测试通过。动画 DOM、音效与存储写入被屏蔽；演出等待仍用虚拟时钟。随机掉落与固定策略模拟不是实际玩家最优选择。

冻结及交付时主文件 SHA-256：
`6e4d49a9f9217a8f25f4a48241a440865a387c5f690429e33a3035865bdf3845`

运行于工程根目录，Node 路径可换成环境中的 `node`：

```sh
node design/checkpoint-review-20260921/screen.cjs
node design/checkpoint-review-20260921/verify.cjs compare
node design/checkpoint-review-20260921/verify.cjs stages
node design/checkpoint-review-20260921/verify.cjs stage-controls
node design/checkpoint-review-20260921/farm.cjs
node design/checkpoint-review-20260921/checks.cjs
python3 design/checkpoint-review-20260921/report.py
```

脚本与逐箱、逐次重塑数据均在本目录，汇总见 `summary.json`，校验见 `checks.json`。初始种子仅控制本模型；参数改变会改变随机调用路径，并非严格配对相同的装备／技能序列。

**给 WorkBuddy：本次修改由 Codex 完成，范围是仿真与文档。接手正式版本仍为 v2.43；不要把本报告候选当作游戏已生效规则。** 后续实现应基于当时最新源码增版，处理奖励顺序、主动重塑取消旧弹窗／转场、跨重塑冷却、100 层升阶优先与全清存档；只改候选阶段 Boss，不直接外推无尽。回退本轮只涉及新增分析目录及文档入口，主游戏无需回退。通过共享工程文档交接，未向 WorkBuddy 会话发送消息。
''')
(ROOT/'主动重塑与广告平衡建议.md').write_text('\n'.join(lines)+'\n')
print(json.dumps({'samples':len(rows),'totalCautiousMedianMinutes':med_total,'report':str(ROOT/'主动重塑与广告平衡建议.md')},ensure_ascii=False))
