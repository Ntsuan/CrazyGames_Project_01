# Boss 死亡残留修复与验收（v2.40.1）

2026-09-21 · 修改者 **Codex** · 基线 v2.40 → v2.40.1。

## 结论

已修复 Boss 死亡后尸体留在场上的问题。流程现为：**完整播放死亡 → 300ms 淡出 → 技能选择或玩家跑出转场**。进入转场还会防御性隐藏旧敌人；下一只敌人开始跑入时才重新显示。300ms 是 1× 演出时间，2× 为 150ms，途中切速保留进度。

本地修复与自动化验收完成，**未发布**。2026-09-21 本次核验线上为 v2.40，尚未包含该修复。发布仍需 WorkBuddy 的现有应用通道；Codex 未向 WorkBuddy 会话发送消息。

## 录屏与根因

用户提供 ScreenRecording_09-21-2026 08-38-02_1.MP4，时长约 10.38 秒。约 6～8 秒可以看到第三层典狱长倒地后，玩家已经向右跑出，尸体仍在右侧固定位置。

v2.40 的 onKill() 中，普通怪有“停留→淡出→换怪”，Boss 分支却在等待 900/1100ms 后直接进入技能弹窗或转场。startFloorTransit() 也只处理玩家，没有隐藏旧敌人。因此死亡末帧修正后，Boss 不再因为切片越界意外消失，缺失的退场逻辑就暴露了。

这是上一轮只验收死亡末帧、未完整覆盖 Boss 后续退场的遗漏。基线回放 f3/f5/f10/f100，击杀后 1500ms 的 enemy opacity 均为 1，其中 f3 已进入转场，其他三者已出现技能选择；见 baseline-reproduction.json。

## 修改范围

- `game/index.html` 的 `onKill()`：原 Boss 死亡等待之后，补充 presentationTween 的 300ms 透明度淡出；结束后才执行原技能/转场分支，使用同一 runSeq 取消机制。
- `startFloorTransit()`：新流程开始后将旧敌人 opacity 置为 0，持续到 enemyRunIn() 显式恢复，避免旧尸体随玩家穿过背景。
- VERSION 改为 v2.40.1；CHANGELOG 和快照同步。
- 无战斗、掉率、装备合成、补给收益变更。原金币、碎片和存档意图逻辑保持。

| 时序（1× 基础时间） | 修改前 | 修改后 |
|---|---:|---:|
| 普通 Boss 击杀到转场/技能 | 900ms | 900ms 完整倒地等待 + 300ms 淡出 |
| 逢 10 层 Boss 击杀到技能 | 1100ms | 1100ms 等待 + 300ms 淡出 |
| 转场中的旧敌人 | 仍然显示 | 始终隐藏，直至新敌人开始跑入 |

## 验证

| 项目 | 结果 |
|---|---|
| 新增 Boss 逻辑回归 | 15/15 |
| 浏览器 Boss 专项 | 14/14 |
| 核心回归 | 75/76；基线也是 75/76，同一独立 C75 日志保留数量失败 |
| 内联 JS 语法 | 通过 |
| 浏览器捕获的运行错误 | 0 |
| 主文件、版本快照、冻结测试页 | SHA-256 完全一致 |

浏览器环境为内置 Chromium、390×844。8 项固定速度场景覆盖 f3 普通转场、f5 触发器技能、f10 棱镜、f100 天枢，各测 1×/2×；4 项验证 f3/f10 淡出过程中双向切速；2 项验证淡出过程中复位。检查透明度中间值确有渐隐、技能/转场开始时 opacity=0、技能等待期间不反显、转场没有尸体、下一只敌人正常显示。

1× 典狱长约 1208ms 后进入转场，2× 约 615ms；棱镜约 1410/711ms 后进入技能选择。数值为本地单次观测，不是手机性能基准。

核心用例 C57/C67/C68 的等待点调整至 1500ms，以覆盖新增的 300ms 退场，原有楼层文案和确认弹窗断言保留。C75 未删改、未修复，属于独立日志问题。

用户录屏来自真机；**修复后的 iPhone Safari 真机尚未测试**，需发布后复测。

## 证据和复跑

- `boss-tests.cjs` / `boss-results.json`：实际游戏函数配合虚拟时钟，15 项边界与取消测试。
- `core-tests.cjs` / `core-results.json`：本版本核心回归。脚本沿用旧实现，不能只以进程退出码判断通过，应读取 JSON。
- `baseline-core-tests.cjs` / `baseline-core-results.json` / `baseline-reproduction.json`：修改前核心回归和残留复现。
- `browser-boss.js`：在独立本地测试页安装 qaBoss 后运行；夹具复用 ../qa-v2.40-20260920/browser-fixture.js。
- `browser-warden.json`、`browser-prism-tianshu.json`、`browser-dynamic.json`、`browser-reset.json`：浏览器结果。
- `screenshots/recording-contact.jpg`：用户录屏每秒取样；其他截图为测试夹具下的完整死亡末帧、转场无尸体、技能选择无尸体。
- `changes.diff`、`summary.json`、`online-status.json`：改动、散列和线上版本核验。

项目根目录执行：

```sh
node design/qa-boss-death-v2.40.1-20260921/boss-tests.cjs
node --check design/qa-boss-death-v2.40.1-20260921/syntax.js
```

## WorkBuddy 接手和发布

**给 WorkBuddy：本次由 Codex 完成 v2.40.1，修复 Boss 死亡末帧长期残留。请以当前 game/index.html 为准更新现有“霓虹猎手”应用，不恢复旧 Boss 直接转场逻辑。15 项逻辑及 14 项浏览器专项通过，核心只有原有 C75 未通过。**

发布包：本目录 `neon-hunter-v2.40.1.zip`，仅 index.html 与 assets/，不含测试、日志和历史版本，压缩包完整性通过。

沿用应用 locator `wbapp_4QnNeb5xhXaduj6Io31tHn`、域名 `https://neon-hunter.app.workbuddy.host/`，在 WorkBuddy 使用 updateExistingApp 重发；用户此前已授权推送线上。发布后核验 VERSION v2.40.1 和 SHA-256 `4af92354634ad579ad7443cba4974a8e4da7c48775a4dcc86260444e556c4ba4`。

回退入口：`baseline/index_v2.40.html`；回退会重新带回 Boss 残留问题。版本快照：`game/versions/index_v2.40.1.html`。当前仅共享文档交接，无外部消息发送。
