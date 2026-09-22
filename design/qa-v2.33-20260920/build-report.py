# -*- coding: utf-8 -*-
from pathlib import Path
import json,hashlib
p=Path(__file__).resolve().parent;src=p.parents[1]/'game'
read=lambda f:json.loads((p/f).read_text())
c=read('core-results.json');b=read('browser-results.json');a=read('asset-results.json');sim=read('simulation-summary.json');perf=read('performance.json');manifest=read('source-manifest.json')
changed=[f for f,h in manifest.items() if not (src/f).exists() or hashlib.sha256((src/f).read_bytes()).hexdigest()!=h]
issues=[
 {'id':'F01','priority':'P1','title':'存储已满时首次启动被日志写入打断，开始按钮空白且无法操作','lines':[1266,1271,1531],'tests':['C74','B34','B35'],'detail':'''复现：在隔离 origin 清空测试档及测试日志，使用单独的 qaQuotaFill 键填满 localStorage，再刷新。实测填充 5,242,869 个字符后，新测试段写入 neonHunterLogs 抛出 QuotaExceededError。开始按钮文字为空，onclick 为 null；清除测试填充后重新加载恢复正常。

实际异常栈：saveLogs → logEvent → newSession → 启动初始化。已有 save() 的 try/catch 仅保护通过 save() 进入的调用，不能保护启动直接调用 newSession，也不能覆盖所有事件日志写入。

建议：在 saveLogs 的存储边界统一处理失败，让日志降级为内存记录；保证游戏初始化和操作继续，并提示不能持久化。按测试段/事件数控制日志容量；覆盖首次启动、升级事件、封存与常规自动保存。不要只在主循环外围吞异常。''','evidence':['screenshots/10-quota-startup-blocked.png','browser-console-quota.json']},
 {'id':'F02','priority':'P2','title':'等待复位确认时死亡会留下确认标记，重塑后下一次技能奖励无法显示','lines':[834,951,1006,1398],'tests':['C71','C72','B13','B15'],'detail':'''复现：战斗中残血，点击复位但暂不确认；战斗继续造成死亡，行动受阻覆盖确认框，confirmOpen 仍为 true。按实际界面完成重塑，再触发里程碑 Boss 奖励，offerSkills 把技能一直挂起。浏览器最终状态为 floor=6、confirmOpen=true、skillOfferOpen=false、overlayVisible=false、cur.hp=1e18、paused=false；没有敌人刷新或技能选择入口。

为缩短复验时间，浏览器在正常重塑后直接设置到第 5 层 Boss 再调用击杀，未从第 1 层手动打到；未手动暂停这一最终阻塞场景。逻辑用例也独立复现。

建议：复位确认明确管理战斗暂停及取消后的恢复；所有模态框替换/关闭必须清理旧类型状态；重塑、复位统一重置确认与待显示队列。验证死亡、超时、结束测试等事件与确认框的交叉关系。''','evidence':['screenshots/03-death-overwrites-confirm.png','screenshots/04-milestone-stuck.png','browser-results.json']},
 {'id':'F03','priority':'P2','title':'触摸未跟踪手指标识，另一根手指抬起会提前执行按钮','lines':[1548,1549,1554,1559],'tests':['T6'],'detail':'''合成 TouchEvent 复现：手指 A 按住攻击按钮，手指 B 按在空白处；B 先抬起，此时 A 仍在按钮上，程序已将攻击等级 0→1、金币 10000→9994，并执行 preventDefault。

根因：tapBtn/tapX/tapY 为单一全局记录，未保存 touch.identifier，也未检查 touchend.changedTouches 是否包含发起点击的手指。单指点按、9px 抖动、11px 滑动取消、touchcancel、disabled 按钮均通过。

建议：记录发起手指 identifier，只消费该手指的 move/end/cancel；或显式在多指输入出现时取消本次点击。也可使用带 pointerId 的 Pointer Events。此项是浏览器处理函数级复现，尚未做 iOS/Android 原生触摸验证；不能据此宣称所有真机会出现双击。''','evidence':['touch-cases.json','browser-results.json']},
 {'id':'F04','priority':'P2','title':'移动端媒体查询提前结束，手机布局规则泄漏到桌面','lines':[202,213,225,230],'tests':['B26'],'detail':'''源码 @media(max-width:640px) 在 arena 规则后多出一个结束花括号，后面的 HUD、角色站位、血条宽度、面板单列、抽屉宽度与倍速按钮规则成为全局规则。

1440×900 实测：媒体查询为 false，但 .row 为 column、血条宽 120px、倍速按钮在右上（right:12px/top:36px），不符合基础桌面规则及变更日志“桌面保持左下”。CSSOM 确认 .row{flex-direction:column} 和倍速右上规则位于顶层。六种尺寸虽没有水平溢出，仍不能算桌面布局验收通过。

建议：修正媒体查询括号边界，再分别验证 640px、641px 与大屏。加一项 CSS 结构检查及实际计算样式断言，避免只靠截图宽度或 JavaScript 语法检查漏检。''','evidence':['screenshots/layout-1440x900.png','screenshots/08-desktop-mobile-css-leak.png','browser-results.json']},
 {'id':'F05','priority':'P2','title':'跨版本加载沿用旧测试段，当前玩法数据被标记成旧版本','lines':[1277,1297,1530],'tests':['C73','B33'],'detail':'''构造未封存的 v2.32 测试段并刷新运行 v2.33，再点击一次攻击升级。当前运行版本为 v2.33，但 curSession.build 仍为 v2.32，升级事件追加在旧段；导出文件名也以 neonhunter_v2.32 开头。

这会混合升级前后玩法数据，影响首卡层、时长、操作统计的版本对比。原有 C40 仅覆盖新建测试段，因此不会发现该问题。

建议：loadLogs 检查 current.build 与 VERSION；不一致时封存旧段并新建当前版本段，保留两者关联，不直接修改旧段 build。补测相同版本续写、跨版本切段、损坏日志和旧日志兼容。''','evidence':['browser-results.json']}
]
(p/'issues.json').write_text(json.dumps(issues,ensure_ascii=False,indent=2))
s={'version':c['version'],'verdict':'未通过：1 P1、4 P2','core':{'total':c['count'],'pass':c['passed'],'fail':c['failed']},'browser':{'total':len(b),'pass':sum(x['status']=='PASS' for x in b),'fail':sum(x['status']=='FAIL' for x in b)},'assets':a['assetCount'],'simulationCycles':90,'issues':{'P1':1,'P2':4},'sourceChanged':changed,'sourceHash':c['sourceHash'],'performance':perf}
(p/'summary.json').write_text(json.dumps(s,ensure_ascii=False,indent=2))
L=['# v2.33 全量测试报告','','2026-09-20。**本轮未通过：确认 5 类问题，1 项 P1、4 项 P2。**','','开始测试时工程已从上一轮 v2.32 更新为 v2.33（主入口图标）。本轮冻结 v2.33 源码及资源，所有结果归属于该版本。没有修改游戏实现。','','| 检查 | 结果 |','|---|---|',f'| 核心逻辑 | {c["passed"]}/{c["count"]} 通过，{c["failed"]} 失败；原有 68 项全部通过 |',f'| 浏览器、触摸处理、布局 | {s["browser"]["pass"]}/{len(b)} 通过，{s["browser"]["fail"]} 失败 |',f'| 资源与HTML结构 | {a["assetCount"]}/{a["assetCount"]} HTTP/解码检查通过；无静态引用缺失、重复 ID/属性 |','| 数值循环 | 3 种升级策略 × 10 种子 × 3 轮，共 90 轮完成；无非有限数、负资源、装备品质越界 |',f'| 前台性能短采样 | 180 帧，平均 {perf["averageMs"]:.2f} ms，P95 {perf["p95Ms"]:.2f} ms，约 {1000/perf["averageMs"]:.1f} FPS |','| JavaScript 语法 | 完整内联脚本解析通过 |','','失败用例不是独立缺陷数量：例如 C71/C72/B13/B15 属于同一确认状态问题。正常功能检查未捕获 warn/error；实际满配额测试捕获了预期用于复现的未处理异常，单独归档。','','## 缺陷与优化方案','']
for i in issues:
 L += [f'### {i["id"]} · {i["priority"]} · {i["title"]}','',i['detail'],'','定位：'+'、'.join(f'[index.html:{n}]({src}/index.html:{n})' for n in i['lines'])+'。','',f'用例：{", ".join(i["tests"])}。证据：'+'、'.join(f'[{x}]({p/x})' for x in i['evidence'])+'。','']
L += ['## 已通过的主要流程','','- 新档封面、新入口图标、设置音效、取消清档、自动开战、补给和强化。','- v2.32 起的新读档契约：回当前楼层首怪、满血开局，保留金币、碎片、装备、技能；不是恢复原敌人和残血。对应用例已按明确的新设计更新。','- 上轮“读档后复位残血”和“已有技能时取消复位吞弹窗”均通过；后者本轮用 Tab/Enter 真实键盘路径复验，候选保持一致。','- 技能待选存档及正确层号、单次低品质优先合成、较高装备保留、产物提示、拆解即时保存、永久加成树扣费。','- 死亡重塑满血与奖励、广告倍奖防重复调用（逻辑层）、已通关 2 倍速和新楼层恢复常速、同帧击杀反击互斥、天枢蓄力/主炮/恢复相位。','- 玩家跑入时血盾条同步隐藏及恢复；新触摸监听维持 5→5（含 4 个触摸监听及 visibilitychange），未再逐帧累积。','- 运行期间存储异常后主循环继续（实测帧龄约 13.9ms），损坏 JSON 可退回新档；注意这不覆盖 F01 的启动日志路径。','- 音频资源解码及播放请求、日志抽屉、封存新段、JSON/CSV 内容生成。','','## 数值仿真','','使用实际游戏函数，DOM/音频模拟，30 FPS 虚拟时钟。每 2 秒尝试各部位合成并购买可负担强化；按“攻击升级成本 / 比率 ≤ 生命升级成本”选择攻击，否则选生命；技能取三选一中的首项，不领取补给广告，已通关楼层 2 倍速，重塑后碎片投入伤害树。没有主动刷新存档。','','三种成本比率为 0.67（相对偏生命）、1.5（与前轮一致的基准）、3（相对偏攻击）。这不是实际金币支出比例。各策略均使用种子 1～10；由于随机数消费路径不同，同种子不意味着每次获得相同装备/技能。','','| 策略比率 | 循环 | 受阻层范围 | 中位层 | 中位用时/分钟 |','|---:|---:|---:|---:|---:|']
for r in sim:L.append(f'| {r["ratio"]} | {r["cycle"]} | {r["minFloor"]}～{r["maxFloor"]} | {r["medianFloor"]} | {r["medianMinutes"]} |')
L += ['','90 轮受阻原因均为 hp_zero，没有出现超时受阻。基准策略三轮中位受阻层依次为 19、22.5、25，重塑收益确实推动进度；第一轮中位用时约 12.73 分钟，第二轮约 9.05 分钟（含旧层倍速）。与 v2.31.3 同策略基线一致，没有重现更早版本的“重塑后约 1 秒再死亡”。','','三种策略首轮中位层仅在 18.5～19.5 之间。本轮不足以证明应直接上调哪项属性：生命耗尽也受输出、技能和装备共同影响。建议先修 F01/F02/F05，保证流程和数据可信；后续增加技能选择策略及“是否主动刷新”分组，结合真人日志再调整怪物成长或升级收益。新读档规则允许满血重打并保留收益，因此未刷新仿真不能代表频繁刷新的玩法。','','## 布局与可视检查','','检查 320×568、390×844、430×932、844×390、768×1024、1440×900 六种视口并留图；均无文档水平溢出，320 宽技能弹窗完整可见。已人工查看小屏、大屏和技能弹窗截图，F04 正是宽度断言通过后进一步查看计算样式发现的问题。移动端固定战斗区保留，下方面板需纵向滚动。','','新入口图标成功加载，手机倍速按钮在右上；大屏倍速位置和单列面板受 F04 影响。截图文件名 layout-* 对应视口；其余文件记录关键流程与缺陷。','','## 范围、限制与文件','','- 本轮真实浏览器为内置 Chromium。本地 origin 为 127.0.0.1:19322，与用户正常游戏存档隔离；没有访问线上站点或用户真实存档。','- 高层战斗状态以测试装置直接设定，界面动作采用实际点击/键盘；百层 Boss 不是从第 1 层手动打到。','- 触摸用合成 TouchEvent 检查应用处理逻辑；当前浏览器控制接口未提供可用原生触摸注入。单指容差通过不等于真机滚动/兼容点击通过，F03 仍需 iOS/Android 复验。','- 六视口不等于六种设备；未测试 Safari、Android/iOS 真机、刘海安全区、系统后台恢复、离线网络、真实广告/CrazyGames SDK、线上版本、平台审核或数小时持续运行。','- 180 帧性能是本机短采样，不是低端手机帧率或长期内存证明；90 轮模拟是虚拟时钟逻辑循环，不是浏览器长时间挂机。','- JSON/CSV 数据及封存通过；页面提示回退浏览器下载，但未确认原生下载落盘或目录授权路径。exports/ 文件由测试工具保存，不能当作原生下载成功证据。','- 无限补给属于当前测试版设计；读档满血回本层起点属于 v2.32 明确变更，均未计为缺陷。','',f'- 冻结源 SHA-256：`{c["sourceHash"]}`。测试结束与 game/ 全部清单比较：{"一致" if not changed else str(changed)}。','- 运行依据：site/、source-manifest.json；原始结果：core-results.json、browser-results.json、asset-results.json、simulation-results.json、simulation-summary.json、performance.json。','- 可执行脚本：core-tests.cjs（74 项）、simulation-matrix.cjs（90 轮）、asset-check.py；浏览器结果含实际状态、期望及触摸序列摘要。','- CHANGELOG 截至收尾仍以 v2.32 为末条，v2.33 图标修改应补记录；工程当前不使用 Git，版本依靠快照管理。','','在报告目录运行：','','```sh','node core-tests.cjs','node simulation-matrix.cjs','python3 -m http.server 19322 --bind 127.0.0.1 --directory site','# 另一个终端执行资源检查：','python3 asset-check.py','```','']
(p/'全量测试报告.md').write_text('\n'.join(L))
print(json.dumps(s,ensure_ascii=False,indent=2))
