from pathlib import Path
import json, hashlib
from datetime import datetime

P=Path(__file__).resolve().parent
ROOT=P.parent.parent
core=json.loads((P/'core-results.json').read_text())
browser=json.loads((P/'browser-results.json').read_text())
assets=json.loads((P/'asset-results.json').read_text())
soak=json.loads((P/'soak-results.json').read_text())
issues=[
dict(id='F01',priority='P1',title='每次读档都将装备品质再提高两档',line=531,tests=['C28','B03'],repro='获得装备后刷新页面，记录品质，再次刷新。',actual='浏览器实际观测：武器 q0→q2→q4，装甲/芯片 q2→q4→q6；反复读取最终到 q9。',expected='当前版本存档再次读取时，品质与属性保持不变；旧版本迁移只执行一次。',cause='load() 无条件执行 it.q+2，存档没有迁移版本标记。',fix='增加存档 schema/version 并保证迁移幂等；新档显式写版本。未标记的历史存档可能已是新版数据，不能继续盲目整体 +2，需明确兼容策略。'),
dict(id='F02',priority='P1',title='击杀与死亡同帧会出现“受阻但仍推进且不扣血”',line=1173,tests=['C12','C48','B12'],repro='在可控测试中让 Boss 剩 1 血、护盾为 0、玩家极低血量，并使下一次攻击当帧触发。等待击杀转场完成。',actual='浏览器观测：第 2 层、玩家 HP=100、wall=true、paused=false，受阻弹窗仍显示，敌人 HP 已被打到17.65；后续敌人伤害被 wall 判断跳过。',expected='同一帧战斗结果只结算一次；已死亡敌人不反击；受阻状态不得被转场异步回调恢复战斗。',cause='dealPlayerHit() 内 onKill() 已推进楼层，主循环仍继续结算旧敌人伤害；随后转场回调无条件 paused=false，wall 却没有被清除。',fix='把击杀/死亡收敛为互斥结算；攻击后若目标已死或状态已改变则退出本帧伤害流程；转场回调在受阻时不得恢复战斗。截图：12-kill-death-race.png。'),
dict(id='F03',priority='P2',title='Boss 死亡动画期间复位会泄漏旧技能弹窗',line=703,tests=['C15','B23'],repro='第 5 层 Boss 击杀后、约 0.9 秒死亡等待尚未结束时，点击复位并确认。',actual='用实际复位按钮复现：新开局第 1 层仍出现第 5 层的触发器三选一，pendingOffer 被旧回调重新写入，游戏暂停。',expected='复位作废上一局全部异步任务，新开局无技能候选。',cause='普通怪和部分跑入回调检查 runSeq，Boss 死亡后的回调缺少这一检查。',fix='为 Boss 延迟回调加入统一代次校验；复位清理 skillOfferOpen、curOffer、pendingTransit 等流程状态。截图：14-reset-stale-skill.png。'),
dict(id='F04',priority='P2',title='继续存档时楼层文字与战斗背景不一致',line=743,tests=['B05'],repro='保存第 10 层进度，刷新并点击进入夜城，等待双方跑入完成。',actual='楼层文字为“第10层／棱镜核心”，实际 backgroundImage 为 arena-bg.webp；应为 arena-bg4.webp。',expected='新开局、重塑和读档的背景与当前楼层调度一致。',cause='openingRunIn() 更新楼层显示，但未按 bgForFloor(S.floor) 初始化 arena 背景；背景只在 sceneSwap() 时更新。',fix='所有开局入口统一初始化当前场景，再开始跑入。截图：07-reload-background-mismatch.png。'),
dict(id='F05',priority='P2',title='每层第一只怪交战中刷新可恢复满血',line=625,tests=['C31','B22'],repro='任意层第一只怪（mobIdx=0）交战时保存 33/100 HP，再刷新。',actual='实际浏览器读档后 HP 从33恢复到100；其他 mobIdx 的存档血量恢复正常。',expected='恢复已进行中的战斗应使用存档血量；只有真正进入新层才回满。',cause='spawnMob() 用 mobIdx===0 同时代表新层和第一只怪的读档恢复。',fix='区分新层初始化和存档恢复，恢复流程优先使用已保存的血量。'),
dict(id='F06',priority='P2',title='存储写入异常会中断战斗主循环',line=522,tests=['C47','B28'],repro='故障注入：使 Storage.setItem 抛出 QuotaExceededError，等待周期保存。',actual='浏览器实际观测最后一帧时间停止更新，距当前时间已5981ms；恢复存储方法后仍需重新加载才能恢复循环。',expected='保存失败给出提示或进入可恢复状态，不应让游戏静默冻结。',cause='save()/saveLogs() 未隔离存储异常；异常打断 loop()，末尾 requestAnimationFrame 不再执行。',fix='统一处理存储异常并保证循环调度不会因保存失败丢失；限制单段日志容量、提供导出/清理入口。此项是人为故障注入，不代表正常新档会立即触发。'),
dict(id='F07',priority='P2',title='拆解后的立即保存与刷新代码被注释吞掉',line=918,tests=['C27','B13'],repro='背包内存在可拆解材料，点击拆解后立即比较内存状态与已保存的存档。',actual='浏览器观测背包内存剩1件、存档仍有2件；信用点已发放。普通界面刷新/周期自动保存稍后会弥补。',expected='拆解是一笔完整事务，完成后立即更新存档和界面。',cause='save(); renderPanels(); 写在 // 注释尾部，没有执行。',fix='把保存和渲染恢复成独立语句。正常刷新存在 beforeunload 保存，不应把此问题夸大成“每次刷新都会回滚”；主要风险是自动保存前进程被直接终止。'),
dict(id='F08',priority='P2',title='重塑结算依赖跑入结束后才保存',line=976,tests=['C35'],repro='保存含10个待结算碎片的旧循环，执行 applyPrestige(1)，立即读取持久化存档。',actual='内存已进入新局，但存档中的 prestiges 仍为0。一般会在跑入结束或周期保存时补写。',expected='确认重塑后应先持久化结算结果，再进行表现动画。',cause='applyPrestige() 没有立即调用 save()，依赖 openingRunIn() 中延迟保存。',fix='在清零局内状态、结算奖励后立即保存，动画作为后续表现。此项通过真实函数测试确认旧档窗口；未进行操作系统强杀实测，普通刷新会触发 beforeunload 兜底。'),
dict(id='F09',priority='P3',title='受阻弹窗的重塑按钮未应用新版按钮样式',line=818,tests=['B08'],repro='触发行动受阻，检查重塑按钮。',actual='实际 DOM className 仅为 mag，新版 nh-button 和 nh-button--violet 丢失；图标与文字呈旧布局。',expected='受阻重塑按钮使用新版紫色按钮组件。',cause='同一个 button 上写了两次 class 属性，浏览器保留第一次。',fix='合并为一个 class 属性。截图：18-wall-confirmed.png。'),
dict(id='F10',priority='P3',title='属性技能弹窗将已通关楼层多写一层',line=934,tests=['B31'],repro='击败第10层 Boss，等待属性技能三选一。',actual='bestEver=10、当前楼层已推进为11，弹窗却写“突破第11层”。',expected='提示“突破第10层”，或使用不含已完成楼层的文案。',cause='onKill() 先 S.floor++，offerSkills() 再直接使用 S.floor。',fix='把刚完成的楼层显式传入技能弹窗，避免仅依赖随时变化的全局楼层。截图：19-skill-floor-off-by-one.png。'),
dict(id='F11',priority='P3',title='版本与交接记录落后于实际代码',line=377,tests=['静态检查'],repro='对比页面标题、顶部标签、封面版本和变更记录。',actual='实际 VERSION 为v2.28.8；顶部写V2.24，浏览器标题仍为数值原型v0.1；CHANGELOG到v2.28.6，交接文档停在v2.24阶段。',expected='测试者可以可靠识别当前版本及版本差异。',cause='版本文字分散硬编码，记录更新不完整。',fix='统一由 VERSION 生成可见版本文案，并补齐文档。v2.28.8历史快照存在且与游戏本体一致。'),
]
(P/'issues.json').write_text(json.dumps(issues,ensure_ascii=False,indent=2))
manifest=json.loads((P/'source-manifest.json').read_text())
changed=[f for f,h in manifest.items() if not (ROOT/'game'/f).exists() or hashlib.sha256((ROOT/'game'/f).read_bytes()).hexdigest()!=h]
assert not changed,changed
bp=sum(x['passed'] is True for x in browser);bf=sum(x['passed'] is False for x in browser);bu=sum(x['passed'] is None for x in browser)
summary={'version':'v2.28.8','date':datetime.now().isoformat(),'sourceHash':core['sourceHash'],'core':{'total':core['count'],'passed':core['passed'],'failed':core['failed']},'browser':{'total':len(browser),'passed':bp,'failed':bf,'partialOrObservation':bu},'assets':{'total':assets['assetCount'],'failures':assets['assetFailures']},'soakCycles':sum(len(x['cycles'])for x in soak['results']),'findings':{'P1':2,'P2':6,'P3':3},'gameModified':False,'testServerStopped':True,'testTabClosed':True,'viewportReset':True}
(P/'summary.json').write_text(json.dumps(summary,ensure_ascii=False,indent=2))
md=f'''# 霓虹猎手 v2.28.8 全量测试报告

测试日期：2026-09-19。结论：**主要功能已成形，但本轮验收不通过；先修复两项 P1 状态/存档问题，再做数值回归。**

测试对象为当前版本 v2.28.8，包含十档品质、音效、启动页插画与按钮体系。本次没有应用上次 v2.24.20 的仿真调参建议，也没有将旧版仿真通过视为当前版本通过。

## 测试结果

| 测试层 | 覆盖 | 结果 |
|---|---|---|
| 实际浏览器流程与故障注入 | 31 项 | 19 通过、9 失败、1 部分验收、2 性能观察 |
| 当前源码函数回归 | 48 项 | 40 通过、8 失败 |
| 静态资源与 HTTP | 57 个资源 | 全部可读取/解码，HTTP 200，无缺失静态引用 |
| 连续循环 | 10 个种子 × 3 次循环 | 30 个循环完成，未出现 NaN、负余额、越界品质或异常退出 |
| 响应式 | 320×568、390×844、430×932、768×1024、1280×720、844×390 | 启动按钮、设置入口、技能三选一均可完整操作；无横向溢出 |

失败用例存在重复覆盖，不能直接相加成独立 bug 数。归并后为 **11 个问题：2 个 P1、6 个 P2、3 个 P3**。P1 应先于下一轮调数值处理；P2 应在发布验收前处理；P3 为样式和信息一致性。

## 范围与方法

- 在独立本地端口 19319 运行冻结副本，使用独立测试存档；没有访问线上玩家存档，没有改动 game/ 或历史 logs/。
- 浏览器为 Codex 内置 Chromium；新开局自然完成战斗、掉落与升级，之后用明确的测试状态覆盖中高层、百层 Boss、异常与竞态边界。状态注入不是自然爬塔到百层。
- 函数回归运行当前真实游戏函数，使用模拟 DOM/音频与可控时钟；它验证逻辑，不替代浏览器、Safari 或真实触控测试。
- 循环测试采用虚拟时间、自动升级/合成、随机候选第一项选择。它主要验证有限值与循环连通性，不作为本版数值平衡结论；立即重塑的机器人也不会替代“停留在受阻弹窗”的竞态用例。
- 补给箱在 v2.28.7 中被明确改为测试版无限领取，本轮验证当前行为，**不把它当作意外作弊漏洞**。正式广告 SDK、英文版仍属于未完成功能。
- 原生文件夹授权、真实磁盘下载、iPhone Safari、Android Chrome 真机、真实切后台/系统强杀、刘海安全区与广告 SDK 回调未完整验收。桌面尺寸模拟不是手机真机测试。
- 测试结束已关闭测试标签、清理该独立来源的测试存档、恢复视口并停止本地服务器。

源码 SHA-256：`{core['sourceHash']}`。结束时逐项核对 58 个源文件/资源，确认原项目未被本次测试修改。

## 优先问题列表

| 编号 | 优先级 | 问题 |
|---|---|---|
'''
for x in issues:md+=f'| {x["id"]} | {x["priority"]} | {x["title"]} |\n'
md+='\n## 问题详情与复现\n'
for x in issues:
    source=ROOT/'game/index.html'
    md+=f'''\n### {x['id']} · {x['priority']} · {x['title']}

- **复现**：{x['repro']}
- **实际结果**：{x['actual']}
- **预期**：{x['expected']}
- **原因定位**：{x['cause']} [源码位置]({source}:{x['line']})。
- **修复建议**：{x['fix']}
- **证据用例**：{', '.join(x['tests'])}。
'''
md+='''
## 已通过的关键路径

新档默认暂停、开始按钮、普通战斗与自动装备、资金不足拦截、生命升级补增量、三合一含已装备材料、不朽品质封顶、满级部位掉落转信用点、掉落保底、词条递增、技能双池候选与单次选择、三选一刷新恢复、击杀立即写入待选技能意图、Boss 护盾与破盾增益、低血与暴击触发器、天枢蓄力/主炮相位、正常死亡重塑与广告按钮双击保护、树解锁与递增成本、旧层倍速、日志封存保留最近三段、确认/取消复位、音效持久化与播放保护均有通过用例。

音效资源在实际浏览器解码成功，三路音频池均有播放进度，时长约0.152秒。此结论不包含扬声器听感评审或 iOS 首次手势兼容。

## 性能与下载的验收限制

浏览器短采样180帧平均间隔约66ms；复核120帧平均约61.3ms、中位66.2ms、P95约82.6ms。空白对照页90帧平均约25.9ms，同样未达稳定60FPS。7.39秒采样中，ScriptDuration约0.086秒、LayoutDuration约0.0675秒、RecalcStyleDuration约0.0564秒、TaskDuration约0.383秒。

这些数据说明当前测试环境下视觉帧率偏低，值得进一步检查，但不足以将原因归结为 JavaScript 阻塞，也不能外推为手机实际帧率。**性能不标记通过**；建议在真实 Chrome/Safari 前台固定设备上补测帧率、GPU合成、发热与连续运行。

点击“结束测试”后，封存和新建段正常，JSON与CSV内容已核对。禁用文件夹选择 API 后，页面走到下载降级提示，但浏览器工具没有返回下载事件。因此仅确认降级分支执行，不确认文件下载成功。QA目录的 exports 文件由测试工具从已封存内容另行留档，不冒充原生下载产物。

## 建议后续顺序

1. 修 F01 与 F02，并加入对应回归用例，避免刷品质和无敌状态污染真人数值测试。
2. 修 F03～F08：异步取消、场景恢复、恢复血量、存储异常与关键事务保存。
3. 补齐按钮、技能楼层文案和版本记录，再做真机及下载验收。
4. 用干净存档重跑本轮回归与新版数值仿真。此前 v2.24.20 的数值结论不能直接套用到十档品质和新版词条。

## 证据与复跑

- `issues.json`：可供逐项修复的结构化清单。
- `core-tests.cjs` / `core-results.json`：48项可重复逻辑回归。
- `soak-tests.cjs` / `soak-results.json`：10种子、30循环连通性测试。
- `browser-results.json`：31项实际浏览器测试，包括失败状态和性能原始指标。
- `asset-check.py` / `asset-results.json`：资源解码与HTTP检查。
- `screenshots/`：截图证据；优先参考 `10-skill-*`、`12-kill-death-race.png`、`14-reset-stale-skill.png`、`15-cover-*`、`16-cover-clear-confirm.png`、`17-mobile-scrolled.png`、`18-wall-confirmed.png`、`19-skill-floor-off-by-one.png`。早期03、08截图在绘制稳定前采集，不用于视觉验收结论。
- `exports/`：含注入状态的QA日志，不能用于真实玩家行为分析。
- `site/`：本轮冻结副本及空白性能对照页；不应作为正式发布目录。

在项目根目录运行：

```sh
node design/qa-v2.28.8-20260919/core-tests.cjs
node design/qa-v2.28.8-20260919/soak-tests.cjs
```

脚本默认针对冻结的 v2.28.8，预期会再次报告本轮缺陷。修复后应建立新版快照再运行，避免对旧副本“验证修复”。测试结果 JSON 的 FAIL 是判定依据，脚本本身会写完全部结果，不以进程退出码代替结果统计。

资源HTTP复核需临时启动副本服务器，完成后关闭：

```sh
python3 -m http.server 19319 --bind 127.0.0.1 --directory design/qa-v2.28.8-20260919/site
# 在另一个终端执行：
python3 design/qa-v2.28.8-20260919/asset-check.py
```

## 附录：完整用例状态

### 函数回归

| 用例 | 范围 | 检查 | 状态 |
|---|---|---|---|
'''
for r in core['results']:md+=f'| {r["id"]} | {r["area"]} | {r["name"]} | {r["status"]} |\n'
md+='\n### 浏览器回归\n\n| 用例 | 状态 | 记录 |\n|---|---|---|\n'
for r in browser:
    status='PASS' if r['passed'] is True else 'FAIL' if r['passed'] is False else '部分验收/观察'
    d=r['detail'];label=d if isinstance(d,str) else d.get('note',d.get('issue','状态及坐标见 browser-results.json')) if isinstance(d,dict) else '多尺寸坐标/相位记录见 browser-results.json'
    md+=f'| {r["id"]} | {status} | {label.replace(chr(10)," ").replace("|","/")} |\n'
(P/'全量测试报告.md').write_text(md)
print(json.dumps(summary,ensure_ascii=False,indent=2))
