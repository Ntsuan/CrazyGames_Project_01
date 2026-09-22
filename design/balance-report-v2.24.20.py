from pathlib import Path
import json
import hashlib
import statistics as st
from collections import Counter
from datetime import datetime
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from matplotlib.font_manager import FontProperties

BASE = Path(__file__).resolve().parent
OUT = BASE / 'balance-results-v2.24.20'
data = {}
summaries = {}
long_data = {}
for p in OUT.rglob('*.json'):
    obj = json.loads(p.read_text())
    if 'rows' not in obj:
        if p.name == 'summary.json' and p.parent.name != 'long':
            summaries.update(obj['results'])
        continue
    if p.parent.name == 'long':
        long_data[p.stem] = obj
    else:
        data[p.stem] = obj

source_hash = hashlib.sha256((BASE.parent / 'game/index.html').read_bytes()).hexdigest()
assert all(d['sourceHash'] == source_hash for d in list(data.values())+list(long_data.values()))
assert all(len(d['rows']) == 500 for d in data.values())
assert all(len(d['rows']) == 600 for d in long_data.values())
assert not any(r['reason'] == 'censored' for d in list(data.values())+list(long_data.values()) for r in d['rows'])

def rows(name, cycle=1, long=False):
    return [r for r in (long_data if long else data)[name]['rows'] if r['run']==cycle]

def med(name, key, cycle=1, long=False):
    return st.median(r[key] for r in rows(name,cycle,long))

def table(names):
    s='| 情景 | 首卡层数 | 首轮分钟 | 第五轮卡关层数 | 第五轮分钟 |\n|---|---:|---:|---:|---:|\n'
    for key,label in names:
        s+=f'| {label} | {med(key,"floor"):g} | {med(key,"minutes"):.1f} | {med(key,"floor",5):g} | {med(key,"minutes",5):.1f} |\n'
    return s

font_path='/System/Library/Fonts/STHeiti Light.ttc'
font=FontProperties(fname=font_path)
plt.rcParams.update({'font.family':font.get_name(),'axes.unicode_minus':False,'font.size':10,'axes.spines.top':False,'axes.spines.right':False,'figure.facecolor':'#f7f9fc','axes.facecolor':'#ffffff','axes.edgecolor':'#ccd5e0','grid.color':'#e6ebf2','savefig.facecolor':'#f7f9fc'})
fig,axs=plt.subplots(2,2,figsize=(13.6,9),constrained_layout=True)
fig.suptitle('霓虹猎手 v2.24.20｜数值仿真结果',fontsize=20,fontproperties=font)
ax=axs[0,0]
hist=Counter(r['floor'] for r in rows('baseline'))
ax.bar(list(hist),list(hist.values()),color=['#e77740' if f==20 else '#6985ba' for f in hist])
ax.set_title('首轮卡关分布：59% 停在第 20 层',fontproperties=font)
ax.set_xlabel('卡关楼层',fontproperties=font);ax.set_ylabel('样本数 / 100',fontproperties=font)
ax.set_xticks(range(18,26));ax.grid(axis='y',alpha=.5);ax.set_axisbelow(True)
ax=axs[0,1]
colors=['#6a7c98','#267a72','#db743b']
for name,label,color in zip(['baseline','economy_tree','growth_combo'],['现状·全投伤害','现状·伤害＋信用点','旧层提速＋伤害树 10%'],colors):
    ax.plot(range(1,6),[med(name,'floor',i) for i in range(1,6)],marker='o',label=label,color=color,linewidth=2)
ax.set_title('每轮卡关层数（中位数）',fontproperties=font);ax.set_xlabel('轮次',fontproperties=font);ax.set_ylabel('楼层',fontproperties=font);ax.set_xticks(range(1,6));ax.legend(prop=font,frameon=False);ax.grid(alpha=.5)
ax=axs[1,0]
names=['baseline','replay_fast','growth_combo','economy_fast']
labels=['现状','仅旧层提速','提速＋伤害树 10%','经济策略＋提速']
bottom=[0.0]*len(names)
for metric,label,color in [('combatMinutes','战斗','#5a82bb'),('transitionMinutes','过场等待','#e7a65b'),('choiceMinutes','技能选择','#74aaa1')]:
    vals=[st.mean(r[metric] for r in rows(n,5)) for n in names]
    ax.bar(range(len(names)),vals,bottom=bottom,label=label,color=color,width=.65)
    bottom=[a+b for a,b in zip(bottom,vals)]
ax.set_xticks(range(len(names)),labels,fontproperties=font,fontsize=9)
ax.set_title('第五轮耗时构成（均值，可相加）',fontproperties=font);ax.set_ylabel('分钟',fontproperties=font);ax.legend(prop=font,frameon=False);ax.grid(axis='y',alpha=.5);ax.set_axisbelow(True)
ax=axs[1,1]
for name,label,color in zip(['baseline','soul_economy','growth_combo'],['现状·全投伤害','现状·灵魂 1 级＋经济策略','提速＋伤害树 10%'],colors):
    ax.plot(range(1,21),[med(name,'floor',i,True) for i in range(1,21)],label=label,color=color,linewidth=2)
ax.set_title('20 轮趋势检查（每组 30 个种子）',fontproperties=font);ax.set_xlabel('轮次',fontproperties=font);ax.set_ylabel('卡关楼层中位数',fontproperties=font);ax.set_xticks([1,5,10,15,20]);ax.legend(prop=font,frameon=False,fontsize=9);ax.grid(alpha=.5)
fig.savefig(OUT/'overview.png',dpi=160)
plt.close(fig)

cycle_table='| 轮次 | 卡关层数 | 单轮分钟 | 其中重跑旧层 |\n|---|---:|---:|---:|\n'
for i in range(1,6):
    cycle_table+=f'| {i} | {med("baseline","floor",i):g} | {med("baseline","minutes",i):.1f} | {med("baseline","replayMinutes",i):.1f} |\n'
strategy_table=table([('baseline','基准：偏攻击＋及时合成'),('desktop','桌面端同策略'),('casual','10 秒操作一次＋随机选技能'),('balanced','攻血均衡'),('attack_heavy','更偏攻击'),('no_fusion','不合成'),('sustain','优先吸血、护盾和生命技能'),('economy_tree','伤害＋信用点树'),('soul_economy','先点 1 级灵魂，再伤害＋信用点树'),('ads','第 15 层开补给＋重塑碎片翻倍')])
variant_table=table([('baseline','现状'),('cost_124','成本增长 1.25→1.24'),('mob_atk_114','怪攻增长 1.15→1.14'),('prism_60','棱镜护盾 80%→60%'),('shield_soft','普通盾 50%→35%，棱镜盾 80%→60%'),('start_atk_10','初始攻击 8→10'),('tree_75','伤害树每级 5%→7.5%'),('tree_10','伤害树每级 5%→10%'),('replay_fast','仅旧层过场耗时 ×0.4'),('combo','旧层过场 ×0.4＋伤害树 7.5%'),('growth_combo','旧层过场 ×0.4＋伤害树 10%')])
total=sum(len(d['rows']) for d in list(data.values())+list(long_data.values()))
transit_pct=st.median(r['transitionMinutes']/r['minutes']*100 for r in rows('baseline',5))
replay_pct=st.median(r['replayMinutes']/r['minutes']*100 for r in rows('baseline',5))

report=f'''# 霓虹猎手 v2.24.20 数值仿真与优化建议

生成时间：{datetime.now().strftime('%Y-%m-%d %H:%M')}。未修改游戏本体、玩家存档或历史日志。

## 结论

当前首轮循环基本成形，主要问题是后续大量重复爬楼，以及十层 Boss 造成的推进台阶。应先压缩旧层过场，再评估永久成长；不建议首先全面降低怪攻或升级成本。

在“偏攻击、及时合成、全投伤害树、无广告”的基准策略下，首卡中位数是第 20 层 / 13.5 分钟。第五轮卡在第 30 层 / 11.3 分钟，其中旧层重跑占比中位数 {replay_pct:.1f}%，纯过场等待占比 {transit_pct:.1f}%。两者不是同一指标：旧层重跑包含旧层战斗与过场。

![仿真图](overview.png)

## 仿真口径与可信范围

- {len(data)} 组情景，每组 100 个固定种子 × 5 轮；另有 {len(long_data)} 组 30 个种子 × 20 轮。合计 **{total:,} 个完整循环**，未触发 90 分钟或 250 层的截断上限。
- 直接从 game/index.html 提取执行战斗循环、装备掉落、保底、合成、技能、升级、重塑、加成树和转场定时器；不使用旧 sim.py 的装备等效倍率。
- 基准为 390px 手机端、30 FPS、持续前台在线。每 2 秒检查一次操作并批量购买可负担的升级，攻击成本÷1.5与生命成本比较决定购买项；可合成即合成，然后拆解过期低品质件。其余策略见附录。
- 每次三选一等待 6 秒。基准属性技能优先火力→纳米→神经→护盾→生命→信用点→暴击→暴伤→碎片；触发器优先肾上腺素→迷彩→困兽→狂暴→杀戮→猎手。只从真实随机三选一候选中选择，不凭空授予技能。
- 默认不看广告、不领补给；重塑立即结算和分配树点，旧层开启现有 2 倍战斗速度。没有加入广告播放、重塑阅读、离开游戏或真人犹豫时间。
- 基准树策略为全投伤害，并非最优玩家策略。经济策略按“单位碎片相对伤害收益”和 0.5 权重的相对信用点收益贪心分配，属于启发式，也不是穷举最优。
- 视觉绘制、DOM 操作与日志落盘被替换为空操作；装饰性随机调用被移除，随机分布保留，但不声称与浏览器某一个随机种子逐帧相同。没有模拟掉帧、真实触控和 Safari 性能。
- 同时保留现实时间与战斗 dt：旧层 2 倍速只加速战斗，现有增益的 Date.now 计时与过场不随战斗倍率缩放。
- 表格均为中位数，图中耗时堆叠使用均值以便相加。基准首轮 P10–P90：**19–23 层、12.3–16.2 分钟**；这是样本分位区间，不是置信区间。
- 60 FPS 复核：首轮 20 层 / 13.2 分钟，第五轮 29.5 层 / 10.9 分钟；与 30 FPS 的总体判断一致。小于约半层或几十秒的差异不作强结论。
- 历史 S61（v2.17）首卡 22 层 / 14.46 分钟；S59（v2.16）为 26 层 / 21.55 分钟。S59 不能称为“约 14 分钟”。两者都早于当前护盾及技能重构，只作量级参照，不能视为当前模型已被真人校准。
- 长线样本最高只到 60 层，未覆盖第 100 层天枢的数值平衡。不能据此宣布全游戏或百层内容平衡完成。

## 1. 当前效果

{cycle_table}

首轮 59/100 个样本死在第 20 层 Boss；基准前五轮共 500 次死亡全为血量归零，没有超时。第 20 层棱镜的血＋盾总量约为第 19 层普通 Boss 的 **1.38 倍**，而攻击另增 15%。此外，对盾伤害不吸血，导致吸血流也必须先撑过破盾阶段。

第一层通关时间中位数 **40.5 秒**，前 5 分钟通关约 **7 层**。若仍沿用早期“第一层 ≤25 秒”的目标，目前没有达到；初始攻击 8→10 也只降至 36.2 秒，单改基础攻击不足以达到该目标。

## 2. 操作与成长策略影响

{strategy_table}

合成有实质作用：不合成使第五轮从 30 层降到 24 层。更偏攻击的策略跑得较快，但第五轮略浅，不能简单判定“全堆攻击永远最好”。续航技能优先也没有显著打破第 20/30 层的台阶。

经济树策略能让第五轮到 36.5 层，但单轮延长到 14.3 分钟；先买灵魂树 1 级后做经济配置可到 39 层 / 14.5 分钟，其中存在下述碎片向上取整优势。不能把基准的“第五轮 30 层”当成所有玩家的上限。

## 3. 参数对比

{variant_table}

降低怪攻增长虽然把第五轮推到 35 层，却把首轮拉到 16.3 分钟。成本降低也没有解决重复爬楼时间。棱镜盾削到 60% 的单项实验，对中位首卡层数影响很小；暂不建议为此削弱 Boss 身份。

仅压缩旧层过场，保留首轮及新探索层的原节奏，第五轮从 11.3 分钟降到 6.9 分钟，约减少 39%；卡关层数基本不变。这是本轮最明确、影响面最小的改进。

## 4. 建议实施顺序

### P0：旧层快速重跑

启用条件：已重塑、已开启 2 倍速、当前楼层已经通关。把旧层死亡等待、跑入、跑出、切场与恢复战斗的整段过场时间压至现有的 40%；首轮与新边境保留现节奏。

仿真中所有旧层过场定时器整体缩放；真正落地时必须同步 CSS 动画时长，不能只改 setTimeout。更适合保留清晰的死亡/跑入短动画，并压掉停尸等待，避免人物动作机械地变快。人物就位后再恢复战斗，原有代次取消机制继续生效。

验收目标：同一策略第五轮中位时长下降至少 30%，卡关层数分布大致保持；首轮时长不变；无血条提前出现、瞬移或残留定时器。

经济树策略仅加此优化：第五轮 **36 层 / 9.3 分钟**（原为 36.5 层 / 14.3 分钟）；灵魂 1 级＋经济树策略为 **39 层 / 9.3 分钟**。说明提速收益不只存在于基准策略。

### P1：永久伤害提升，作为下一轮候选

保守候选：每级 **5%→7.5%**，叠加旧层提速，第五轮 **33 层 / 7.1 分钟**。

更明显的成长候选：每级 **5%→10%**，叠加旧层提速，第五轮 **37 层 / 8.3 分钟**；基准轮次中位数约为 **20→27→30→34→37 层**。经济树策略同方案第五轮 **40 层 / 9.5 分钟**，说明配点策略仍有影响。

建议先落地 P0 并做真人复测；如果仍有“连续重塑却推不远”的反馈，优先试 10% 候选。不能只把模拟中多推层数当成留存改善证据。调整时需同步 TREE_PCT、名称说明及预览，不只是 calcStats 内一处倍率。

### P1：纠正碎片加成的取整语义

当前规则为 ceil(基础掉落 × 树倍率 × 技能倍率)。基础掉落为 1 时，树 0 级掉 1，树 1 级（标称 +10%）立即掉 2；树 1～10 级均为 2，11 级才变 3。在没有共鸣技能时，前期出现“首级翻倍、后面多级不涨”的断层；树与技能叠加还会产生新的台阶。

建议改为**小数余量累计**：把额外的 0.1 暂存，累计到 1 再发完整碎片。显示的碎片仍为整数；余量需要存档、跨重塑保留，升级/读档不能丢失。直接改成 floor 会吞掉小额收益，不建议。

这是收益语义修正，同时会降低利用当前 ceil 优势的玩家产出，应单独版本验证并说明。仅“灵魂 1 级＋全投伤害”策略的余量累计实验，第五轮仍约 30 层 / 11.2 分钟；它没有覆盖所有经济流或高等级树配置，不应据此宣称无平衡影响。

### P2：给玩家更清楚的成长决策反馈

合成对第五轮推进影响约 6 层，建议在可合成时明确提示具体属性提升；首次重塑时展示伤害与信用点分支的实际收益，帮助用户理解经济树。技能“杀戮循环”与“狂暴节奏”同为暴击触发，后者单层幅度和持续时间均更强，应考虑给前者差异化用途；它们目前乘算叠加，有另一技能时不构成绝对支配关系。

这些 UI/技能改造本轮未实施，也未模拟其真人使用率变化。首层 40 秒问题可另做 1～5 层专门实验，避免为提速开局而永久放大全阶段伤害。

## 5. 长线检查

每组 30 个种子连续 20 轮：

| 策略/方案 | 第 10 轮卡关 | 第 20 轮卡关 | 第 20 轮分钟 |
|---|---:|---:|---:|
| 现状，全投伤害 | {med('baseline','floor',10,True):g} | {med('baseline','floor',20,True):g} | {med('baseline','minutes',20,True):.1f} |
| 现状，灵魂 1 级＋经济树 | {med('soul_economy','floor',10,True):g} | {med('soul_economy','floor',20,True):g} | {med('soul_economy','minutes',20,True):.1f} |
| 旧层提速＋伤害树 10%，全投伤害 | {med('growth_combo','floor',10,True):g} | {med('growth_combo','floor',20,True):g} | {med('growth_combo','minutes',20,True):.1f} |

样本范围内没有出现指数失控，但依然存在 30/40/50 层附近的重复卡关。P0 解决等待，P1 缓和成长；两者都没有消除长线平台期。由于当前无离线收益，如果目标是短时间看到百层内容，还需要另行设定“到达百层所需会话数/总时长”，并补充针对百层的实验。

## 6. 可复现文件与命令

- 仿真脚本：../balance-sim-v2.24.20.cjs
- 验证脚本：../balance-sim-check.cjs
- 报告/绘图脚本：../balance-report-v2.24.20.py
- 各情景 JSON：每轮卡关、时长、技能、装备、树配置与逐层记录；summary.json 保存分位汇总。extra/、recommended/、policy/ 为追加对照，long/ 为长线实验。
- 游戏源文件 SHA-256：`{source_hash}`。报告生成时再次检查全部结果对应同一份游戏源文件。

在项目目录运行：

```sh
node design/balance-sim-check.cjs
SEEDS=100 RUNS=5 SCENARIOS=baseline,replay_fast,growth_combo OUT=design/balance-rerun node design/balance-sim-v2.24.20.cjs
SEEDS=30 RUNS=20 SCENARIOS=baseline,soul_economy,growth_combo OUT=design/balance-rerun-long node design/balance-sim-v2.24.20.cjs
```

已验证：基础数值、升级成本、棱镜血盾、盾伤不吸血、生命升级补血、已装备参与合成、碎片取整、固定种子复现、连续重塑、时间分项总和，以及不合成的品质上限。旧 sim.py 保留作历史参考，当前数值判断使用本报告配套脚本。
'''
(OUT/'数值仿真报告.md').write_text(report)
(OUT/'manifest.json').write_text(json.dumps({'sourceHash':source_hash,'scenarioCount':len(data),'longScenarioCount':len(long_data),'completedCycles':total,'generatedAt':datetime.now().isoformat(),'censored':0},ensure_ascii=False,indent=2))
print(f'Generated report and overview: {len(data)} scenarios, {total} cycles')
