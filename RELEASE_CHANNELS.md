# GitHub 分支与发布配置

2026-09-22 · Codex · Neon Hunter v2.63

| Git 分支 | 源码默认配置 | 用途 |
| --- | --- | --- |
| `codex/develop` | `development` | 开发、数值测试；保留日志、复位、清档、结束测试、4×/8×、模拟广告 |
| `main` | `basic` | Basic候选；关闭测试工具与后台日志，免费定时补给，普通重塑 |

`full` 是预留配置，不另建长期分支。真实广告/云存档SDK、平台QA尚未完成，构建器明确拒绝Full出包。不能只把配置名改成full就提交。

## 当前行为

- Basic：补给仍以在线60秒为冷却，原金币公式不改，改为免费领取；写入失败不发奖、不扣领取机会。普通重塑/技能/阶段改装、无尽与构筑独立进度、正常玩家2×保留。
- 发布关闭项同时检查界面和函数入口，不能只依赖CSS隐藏。日志不再自动收集、写localStorage、请求文件夹权限或导出。
- 只使用源码里的BUILD_PROFILE，URL和玩家存储不能打开测试模式。
- 测试目录、历史快照、文档、日志和未引用素材不进入发布包。`scripts/neon-release.cjs`从实际启动/改装/样式依赖生成运行文件集合。
- 本次不接云存档；当前两配置使用原存档键。平台测试应使用独立测试账号/环境，勿把本地测试数据当作线上玩家进度。

## 本地命令

需要Node.js 24；Neon构建与专项测试无npm依赖。实际运行入口为game/index.html。

```sh
node scripts/neon-release.cjs check codex/develop
npm run neon:check
npm run neon:basic
npm run neon:dev
node scripts/neon-tests/package.cjs
```

出包目录：`dist/neon/basic` 或 `dist/neon/development`；对应清单在上一级`*-manifest.json`。package检查验证的是源码当前通道，需先构建该通道。上传CrazyGames时使用Basic运行包，index.html在ZIP根部。不要上传整个源码仓库或development包。

本地预览示例：`python3 -m http.server 8000 --directory dist/neon/basic`。

## 发布到main

开发完成后先通过开发分支检查。准备指向main的PR时，将源配置切换为basic：

```sh
node scripts/neon-release.cjs configure basic
node scripts/neon-release.cjs check main
npm run neon:check
node scripts/neon-release.cjs build
node scripts/neon-tests/package.cjs
```

在发布PR中提交配置变化，再合并main。后续同步main回开发分支时，将development配置恢复并提交；不要把Basic配置误带到开发分支。配置矩阵的唯一维护入口为release/profiles.json。

## GitHub Actions

`Neon release checks / Validate and package`检查目标分支默认配置，运行15项发布专项、76项核心回归和38项技能池回归，打包后上传对应通道产物及校验报告。只上传GitHub Actions产物，不自动部署、不提交CrazyGames审核。

核心C75是原v2.62已有的开发日志归档问题：数量4而非3。报告始终显示75/76；只容许这一项已知错误签名，其余失败会阻止构建。Basic关闭日志系统，但未来仍应修复开发版C75。

当前Basic包为候选版本，仍需CrazyGames Preview、云存档接入、真机、长期免费补给节奏测试。GitHub CI通过不等于平台审核通过。

## 工作目录与历史资料

- 实际开发源：`/Users/zmy/WorkBuddy/CrazyGames`（保持development）。
- Git管理/同步目录：`/Users/zmy/Documents/ChatGPT/CrazyGames_1`。
- `game/`、`design/`、`交接文档.md`为当前工程；原`src/`和旧Phaser配置是历史环境，不能替代当前发布包。
- 私人工作工具缓存、文件夹授权数据和玩家测试日志不上传。发布包与Git源码包分开。

本轮冻结说明：同步期间WorkBuddy目录出现其他任务的音效修改，GitHub版本使用已通过本轮测试的v2.63运行源（保存在实际工程design/release-v2.63-20260922/verified/game/index.html）。这些并行音效代码未纳入本次分支提交，也未覆盖实际工作目录中的修改。后续同步须以差异合并为准，不能整目录反向覆盖。

## 分支保护

- 两个长期分支均禁止强制推送和删除，规则同样适用于管理员。
- main要求通过PR更新，批准人数设为0（适配个人项目）；合并前必须通过`Validate and package`且解决讨论，检查要求与目标分支保持最新。
- codex/develop允许正常直接提交，开发中的失败会保留在Actions结果里，不阻断后续修复提交。
- main仍是GitHub默认分支；这只是源码与候选构建管理，不启用自动平台发布。
