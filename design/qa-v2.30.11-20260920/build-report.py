# -*- coding: utf-8 -*-
from pathlib import Path
import json, hashlib, statistics, datetime
p=Path(__file__).resolve().parent
read=lambda f:json.loads((p/f).read_text())
core=read('core-results.json');browser=read('browser-results.json');assets=read('asset-results.json');soak=read('soak-results.json');perf=read('performance.json')
source=p.parents[1]/'game';manifest=read('source-manifest.json'); changed=[f for f,h in manifest.items() if not (source/f).exists() or hashlib.sha256((source/f).read_bytes()).hexdigest()!=h]
issues=[
 {'id':'N01','priority':'P1','title':'运行态血量与存档恢复字段混用，导致换层、重塑、读档出现相反的回血错误','lines':[540,646,799,1012,1517], 'tests':['C52','C53','C54','C59','C61','C62','C64','B08','B11','B12'], 'detail':'''`save()` 每次把当前血量写回 `S.playerHp`，`spawnMob()` 却把这个字段当作“待恢复的读档血量”。因此普通保存也会影响后续战斗初始化；启动时 `spawnMob()` 与跑入结束的 `spawnMob()` 又会重复消费同一段恢复流程。

复现及实际结果：

- **换层失血**：390×844，Boss 前血量设为 33，安排在 5 秒自动保存周期刚开始时击杀。转场一度回满（本次掉落装甲，上限为 145），下一敌人就位又变为约 33；随后实测 32.50。桌面转场较长，自动保存可能在中途写入满血，因而同场景会偶尔通过。
- **重塑再死亡**：死亡后正常点击重塑，结算即时存档写入 `playerHp:0`。若自动保存在跑入期间、敌人刷新前触发，下一场以 0 血量开打；浏览器实测约 2.3 秒后 `hp=-0.02846, wall=true`。未命中此时序的对照操作能正常恢复，说明这是时序缺陷。
- **快速读档刷血**：首只怪战斗中存 33 血，刷新后立即点击进入，约 1.9 秒后剩余 98.82 血；重新进场曾把血量回满。只断言 `load();spawnMob()` 的原有测试漏掉了第二次跑入刷新。
- **升级增量丢失**：击杀后、下一敌人跑入前升级生命，实际血量由 50 增为 64.5，但敌人就位后被旧字段恢复到 50（可重复逻辑测试）。

建议：持久化时序列化独立快照，不把“待恢复”状态写回运行态；让读档恢复只在真正开始战斗时消费一次。新楼层和重塑明确初始化新生命值，再保存新状态。覆盖自动保存前后、手机/桌面转场、立即/延迟进入等时序。涉及多个调用点，不宜只再交换一次 if/else 顺序。''',
 'evidence':['hp-transition-mobile-trace.json','prestige-trace.json','screenshots/04-mobile-hp-regression.png','screenshots/07-prestige-dead-loop.png']},
 {'id':'N02','priority':'P1','title':'触摸事件监听在每帧注册，长期运行持续累积','lines':[1227,1230,1233], 'tests':['C55','B06'], 'detail':'''触摸反馈桥放在 `loop()` 内，每帧为 `document` 新增 touchstart、touchend、touchcancel 三个闭包监听，暂停时同样执行。

复现：开页面并暂停，读取 `DOMDebugger.getEventListeners(document)`，3 秒内总监听由 11,365 增至 11,947，新增 582 个。逻辑测试调用 600 帧新增 1,800 个。重复监听会增加内存与每次触摸的处理量；按 60 FPS 外推，10 分钟约新增 108,000 个监听（这是推算，未实跑 10 分钟）。

建议：将三个监听移至启动初始化，只绑定一次；使用具名处理函数，必要时在销毁时解绑。验收应检查长时间暂停和运行时监听数量均恒定，再做手机触摸耗时检查。当前约 60 FPS 的短采样不能抵消这项泄漏。''', 'evidence':['browser-results.json']},
 {'id':'N03','priority':'P2','title':'等待复位确认时，Boss 技能回调覆盖确认框','lines':[730,1391], 'tests':['C63','B31'], 'detail':'''第 5 层 Boss 死亡后立刻点“复位”，先不确认。约 900 ms 后的技能回调用三选一替换“确认复位”弹窗，原确认按钮消失。浏览器实测等待 1.3 秒后弹窗变为神经技能。

如果在回调之前已经“确认复位”，旧回调确实已被 runSeq 修复拦截；问题只在等待用户确认的窗口仍存在。

建议：集中管理弹窗的类型、优先级和待显示队列。确认框显示期间暂存技能请求；取消复位则恢复待选，确认复位则废弃旧请求。不要仅关闭技能弹窗，否则可能丢奖励。''', 'evidence':['screenshots/16-reset-dialog-overwritten.png']},
 {'id':'N04','priority':'P3','title':'刷新恢复技能三选一仍显示下一层号','lines':[789,947,958], 'tests':['C60','B17'], 'detail':'''正常击败第 10 层时文案已修为“突破第 10 层”。保存三选一、刷新、进入游戏后，候选保持一致，但文案变为“突破第 11 层”。恢复入口没有传入完成楼层。

建议：把完成楼层写进 pendingOffer，并在所有展示入口读取；迁移旧 pendingOffer 时按推进语义回填。''', 'evidence':['screenshots/08-skills.png','screenshots/09-restored-skill-floor.png']},
 {'id':'N05','priority':'P3','title':'低阶合成产物入背包时仍提示“已装备升阶”','lines':[920,925], 'tests':['B19','B20'], 'detail':'''已装备 q5 原型武器，背包有 3 件 q0 与 3 件 q2。点击一次合成，正确消耗 q0 并生成 q1 放入背包，q5 装备未变，但提示“合成完成（已装备升阶）”。

建议：根据产物去向分别提示“已装备…”或“已存入背包…”，带上产物品质/部位。单次合成、低品质优先、保留较高装备的实际逻辑均通过。''', 'evidence':['browser-results.json']}
]
(p/'issues.json').write_text(json.dumps(issues,ensure_ascii=False,indent=2))
summary={'version':core['version'],'date':'2026-09-20','verdict':'未通过：优先修复 P1 后复测','core':{'total':core['count'],'pass':core['passed'],'fail':core['failed']},'browser':{'total':len(browser),'pass':sum(x['status']=='PASS' for x in browser),'fail':sum(x['status']=='FAIL' for x in browser)},'assets':assets['assetCount'],'issues':{k:sum(x['priority']==k for x in issues) for k in ['P1','P2','P3']},'sourceChanged':changed,'sourceHash':core['sourceHash'],'performance':perf}
(p/'summary.json').write_text(json.dumps(summary,ensure_ascii=False,indent=2))
lines=['# v2.30.11 全量测试报告','', '测试日期：2026-09-20。结论：**本轮未通过，建议先修复 2 项 P1，再进行数值调整或发布验收。**', '', '原有 48 项逻辑回归全部通过，但扩展真实流程和时序后发现 5 类问题：2 项 P1、1 项 P2、2 项 P3。上轮首怪读档血量、技能层号问题仍有遗漏路径；“已有用例全绿”不能代表全流程无回归。', '', '| 测试层级 | 结果 | 说明 |','|---|---|---|',f'| 核心逻辑 | {core["passed"]}/{core["count"]} 通过，{core["failed"]} 失败 | 直接执行冻结源码的真实函数；DOM/音频模拟，虚拟时钟 |',f'| 浏览器交互与布局 | {summary["browser"]["pass"]}/{len(browser)} 通过，{summary["browser"]["fail"]} 失败 | Chromium 内置浏览器；包括 6 种视口 |',f'| 静态资源 | {assets["assetCount"]}/{assets["assetCount"]} 通过 | HTTP、图片/音频/SVG 解码、引用、重复 ID |','| 连续循环 | 10 种子 × 3 循环完成 | 无非有限数/负资源/越界品质，但进度严重异常，不能记为玩法通过 |',f'| 性能采样 | 180 帧，平均 {perf["averageMs"]:.2f} ms，P95 {perf["p95Ms"]:.2f} ms | 约 {1000/perf["averageMs"]:.1f} FPS；本机前台短采样 |','', '## 问题与建议','']
for i in issues:
    refs='、'.join(f'[game/index.html:{n}]({source}/index.html:{n})' for n in i['lines'])
    lines += [f'### {i["id"]} · {i["priority"]} · {i["title"]}','',i['detail'],'',f'定位：{refs}。验证：{", ".join(i["tests"])}。','', '证据：'+ '、'.join(f'[{f}]({p/f})' for f in i['evidence'])+'。','']
lines += ['## 上轮 11 项问题复验','','| 上轮编号 | 本轮结论 | 证据与范围 |','|---|---|---|', '| F01 重复读档装备 +2 | 通过 | C28/C51，新标记档重复加载保持品质，旧档迁移一次 |', '| F02 同帧击杀死亡竞态 | 通过 | C12/C48/B14，死敌不再反击 |', '| F03 复位后旧技能回调 | 已确认复位路径通过 | C15/B13；尚在等待确认的新边界见 N03 |', '| F04 读档背景不匹配 | 通过 | C56/B04/B34；第 10 层恢复棱镜背景 |', '| F05 首怪刷新回满血 | 未完全修复 | C31 单次恢复通过，C61/B12 完整开场仍失败，见 N01 |', '| F06 存储失败终止循环 | 通过 | C47/C58/B30，故障注入后帧龄约 10.4 ms |', '| F07 拆解未及时保存 | 通过 | C27/B21 |', '| F08 重塑奖励未即时保存 | 奖励持久化通过 | C35；但血量快照及进场新回归见 N01 |', '| F09 受阻按钮重复 class | 通过 | HTML/源码检查及受阻弹窗检查 |', '| F10 技能层号偏一层 | 未完全修复 | 正常展示通过；刷新恢复失败，见 N04 |', '| F11 版本文字不同步 | 通过 | 页面标题/封面/顶栏/新日志段使用 v2.30.11 |','', '## 连续循环与数值解释','', '配置：种子 1～10；每种子 3 次重塑；30 FPS 虚拟时钟；每 2 秒尝试各部位合成并购买可负担升级，攻击/生命成本比阈值 1.5；三选一取第一个候选；不领广告补给；已通关楼层 2 倍速；重塑后即时投入伤害树。执行的是当前源码，不是重新实现的公式模型。','', '| 种子 | 首轮受阻层 | 首轮秒数 | 第二轮受阻层 / 秒 | 第三轮受阻层 |','|---|---:|---:|---:|---:|']
for r in soak['results']:
    a,b,c=r['cycles'];lines.append(f'| {r["seed"]} | {a["floor"]} | {a["seconds"]:.1f} | {b["floor"]} / {b["seconds"]:.2f} | {c["floor"]} |')
lines += ['', '首轮 9/10 个种子在第 2 层受阻，1/10 在第 3 层；第二轮全部约 1.07 秒再次受阻于第 1 层。第二轮脚本即时买树会触发保存，因此特别容易命中重塑血量问题。浏览器另外通过定时自动保存复现了同类缺陷，不能把结果仅归因于测试脚本。', '', '**优化顺序**：先修血量的初始化/恢复/保存语义，再消除监听累积，然后补齐弹窗和文本。之后保持同样种子与操作策略重跑，确认循环不再受这些缺陷影响，才比较首卡层、到达时间、重塑收益和各成长分支。当前阶段直接降低怪物血攻、提高掉落或强化收益，会掩盖流程错误。', '', '## 覆盖范围与限制','', '- 已测：启动与设置、取消清档、复位、自动战斗、升级、普通/棱镜/天枢参数与相位、死亡与超时、技能选择与恢复、掉落保底、合成拆解、重塑奖励、加成树、倍速限制、补给原型、日志封存、损坏存档和配额异常、音效调用、版本与资源。', '- 视口：320×568、390×844、430×932、844×390、768×1024、1440×900。均无文档水平溢出；小屏需纵向滚动访问下方模块，320 宽技能弹窗完整可见。截图保存在 screenshots/；layout-top-* 为滚动到顶部后的复核图，layout-* 保留此前滚动位置。', '- 浏览器高层状态使用隔离测试档直接设置，Boss 等场景并非从第 1 层手动打到。自然启动、补给、强化、按钮、选择、复位与日志入口使用实际点击；时序缺陷通过控制状态/自动保存相位复现。', '- 封面常态/悬停计算样式一致，鼠标按下位移 3 px。触摸桥使用合成 DOM 事件测试；该浏览器不支持原生触摸注入，**未测试 iOS/Safari/Android 真机**。', '- 本轮浏览器页面未捕获 warn/error。音频已验证资源解码和播放进度，不代表硬件听感验收。', '- JSON/CSV 内容与封存已验证并归档；页面报告回退浏览器下载，但**原生下载落盘、目录授权路径未确认**。exports/ 文件由测试工具写入，不冒充原生下载结果。', '- 未做 CrazyGames 线上 SDK、真实广告、平台审核、跨浏览器/真机、断网/进程强杀或数小时稳定性验收。测试版无限补给是当前明确设计，未当作缺陷。', '', '## 复现与交付','', f'- 测试源：`game/index.html` v2.30.11；冻结 SHA-256：`{core["sourceHash"]}`。', '- 冻结副本：site/；逐文件哈希：source-manifest.json。测试没有修改 game/ 源码和资源。', f'- 收尾时原文件与冻结清单对比：{"一致" if not changed else "存在变化："+str(changed)}。', '- 原始结果：core-results.json、browser-results.json、soak-results.json、asset-results.json、performance.json；问题清单：issues.json。','', '在本报告目录执行：','', '```sh','node core-tests.cjs','node soak-tests.cjs','python3 -m http.server 19320 --bind 127.0.0.1 --directory site','# 另一个终端：','python3 asset-check.py','```','', '浏览器测试的具体设置、断言和采样见 browser-results.json 与两份 trace JSON。core-tests.cjs 可直接回归问题；soak-tests.cjs 的 passed 字段仅表示完成 3 次循环且未触发数值不变量异常，不能解释为进度平衡通过。','']
(p/'全量测试报告.md').write_text('\n'.join(lines))
print(json.dumps(summary,ensure_ascii=False,indent=2))
