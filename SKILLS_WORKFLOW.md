# 推荐 Skills 与工作流引入方案

更新日期：2026-09-08

关联文档：[项目交接](PROJECT_HANDOFF.md) · [开发工具链](TOOLCHAIN.md) · [工作习惯](agent.md)

## 安装进度更新（2026-09-09）

第 1 个 `input-keyboard-mouse-touch` 已安装到 `/Users/zmy/.codex/skills/input-keyboard-mouse-touch`。来源 Phaser 官方仓库提交 `02d8931b626d9764c133cbb3fbf99966c03c757c`，保留 SKILL.md、references/REFERENCE.md、MIT 许可证和 SOURCE.json。正文及参考已审阅；无附带执行脚本。关联技能改为固定提交的远程链接，新增独立安装的源码路径与 TypeScript 空值处理说明。

在 Phaser 4.2.1 的临时 Chromium 页面验证：鼠标点击、空格键、模拟触屏点击均通过。未验证真实多点触控、失焦恢复或完整游戏操作；当前回合已在可用技能列表确认输入技能被自动发现。以下早期“均未安装”状态以本节为准。

第 2 个 `scale-and-responsive` 已安装到 `/Users/zmy/.codex/skills/scale-and-responsive`，沿用相同官方提交与 MIT 许可证。上游仅有 SKILL.md，无附带脚本或参考文件；已全文审阅。关联技能链接固定到该提交，新增独立安装源码路径、监听器清理和真机验证说明，SOURCE.json 记录原始文件哈希及改动。

Phaser 4.2.1 临时页面在 Chromium、Firefox、WebKit 三浏览器通过 FIT 等比例、居中、窗口变化及点击映射检查，尺寸为 1280×720、844×390、390×844。竖屏只测试缩放，不改变项目横屏规则。全屏、方向锁定、安全区、真机尚未验证；当前可用技能列表已确认 scale-and-responsive 自动发现。

第 3 个 `physics-arcade` 已安装到 `/Users/zmy/.codex/skills/physics-arcade`，沿用官方提交 `02d8931b626d9764c133cbb3fbf99966c03c757c`，保留 MIT 许可证和 SOURCE.json。上游仅含 SKILL.md，已全文审阅，无脚本或额外依赖。关联技能改为固定来源链接，增加零重力、离散碰撞、重复 overlap、暂停范围及性能调优边界说明。

使用 Phaser 4.2.1 的临时场景，在 Chromium / Firefox / WebKit 验证：零重力速度移动、静态墙分离、overlap 拾取后禁用只计一次、物理暂停不移动、恢复后世界边界阻挡，三浏览器均通过。尚未验证高速弹丸、冲刺、地图碰撞、完整暂停与实际游戏逻辑。当前可用技能列表已确认 physics-arcade 自动发现。

第 4 个 `scenes` 已安装到 `/Users/zmy/.codex/skills/scenes`，使用相同 Phaser 官方固定提交，保留 MIT 许可证和 SOURCE.json。安装器 Git 下载失败后，通过 GitHub API 获取正文及 references/REFERENCE.md，并校验 Git blob 哈希；全文审阅，无附带执行脚本。关联技能链接固定，补充独立源码路径、外部监听器清理及查询方法不属于排队操作的说明。

Phaser 4.2.1 临时内存页面在 Chromium、Firefox、WebKit 均通过：连续重启 3 次、init 数据重置、对象和全局监听器不累积、旧计时器回调未串入新一轮、switch 的休眠/唤醒、stop 后监听器移除。尚未验证场景过渡动画、真实资源加载或游戏流程。当前可用技能列表已确认 scenes 自动发现。

第 5 个 `game-playtest` 已安装到 `/Users/zmy/.codex/skills/game-playtest`。来源 openai/plugins 提交 `d416fd5a43426019986b1e489506db3db66dee3d`，正文、agents/openai.yaml、共享检查清单已审阅并校验 Git blob 哈希。安装器遇到 Python HTTPS 证书验证错误，改用系统 curl 正常验证证书获取文件；未修改证书配置。共享清单复制到技能内，其他可选引用固定到上游提交；SOURCE.json 记录原始哈希与适配。所审提交的根目录和 game-studio 子树未发现许可证文件，未推断授权类型。

使用项目现有 Playwright 在 Chromium、Firefox、WebKit 验证环境页启动、1280×720 与 844×390 画布边界及连续点击，未捕获页面异常；保存 6 张截图到 `/tmp/crazygames-playtest-evidence`，人工查看 Chromium 桌面和 WebKit 横屏截图，文字与按钮无明显遮挡。临时服务已停止。仅验证技能工作流，尚无实际游戏玩法可试玩，也未进行真机验收。当前可用技能列表已确认 game-playtest 自动发现。

第 6 个 `save-systems` 已安装到 `/Users/zmy/.codex/skills/save-systems`。来源 gamedev-skills/awesome-gamedev-agent-skills 固定提交 `cf44d99a0315dabff6ac6f407c6ccc026190f16c`，保留 Apache-2.0 LICENSE、NOTICE 和 SOURCE.json。正文及 references/versioning-and-migration.md 已完整审阅；安装器仍遇 Python 证书错误，采用系统 curl 正常证书验证获取，校验上游 Git blob 哈希。

安装验证：元数据名称、引用文件、安装副本逐字节一致性均通过；共 5 个文件，无执行脚本或新增依赖。新增浏览器适用范围、版本和迁移链检查、迁移输入克隆、备份校验与写入失败说明，文件内标注改动。上游示例为 Godot/Python 设计示意，不是可直接运行的浏览器存档实现。本次仅完成技能安装和内容检查，未实现或验证项目存档、迁移、断电恢复或多标签页冲突。当前可用技能列表已确认 save-systems 自动发现。

第 7 个 `game-feel` 已安装到 `/Users/zmy/.codex/skills/game-feel`，沿用上项同一仓库提交 `cf44d99a0315dabff6ac6f407c6ccc026190f16c`，保留 Apache-2.0 LICENSE、NOTICE 和 SOURCE.json。通过已验证的系统 curl 获取并核对上游 Git blob 哈希；正文和 references/feedback-recipes.md 已全文审阅，无附带程序或新运行依赖。

安装验证：元数据、引用文件及 5 个文件的安装副本一致性通过。新增 Phaser 适用边界、hit-stop 与暂停冲突、叠加效果归属、原始视觉状态恢复、C# 配方未使用 overshoot 变量等说明；改动在正文标注。此次没有添加游戏效果，未进行实际手感、输入响应或无障碍验收。当前可用技能列表已确认 game-feel 自动发现。

第 8 个 `sprite-pipeline` 已安装到 `/Users/zmy/.codex/skills/sprite-pipeline`，来源 openai/plugins 固定提交 `d416fd5a43426019986b1e489506db3db66dee3d`。正文、元数据、共享参考和 3 个 Python 脚本已完整审阅、校验上游 blob 哈希，SOURCE.json 记录来源；独立安装共 7 文件，修正引用与脚本路径。许可证查找结果沿用 game-playtest，未推断授权类型。

Homebrew Python 缺 Pillow；使用 Codex 自带 Python 与 Pillow 12.3.0，无新增安装。临时合成图验证三个脚本全部运行成功：参考画布、4 张 RGBA 固定尺寸帧、底部对齐、首帧像素完全锁定、预览尺寸；已查看预览图。测试数据在 `/tmp/crazygames-sprite-test`。补充输出覆盖、逐帧边界对齐局限及锁定首帧可能与其余帧比例不同的说明。未生成正式素材，未验证角色动作一致性或引擎播放。

首批 8 个技能均已安装并确认自动发现。2026-09-09 已修复 Python HTTPS 证书链接，GitHub、PyPI 及技能安装器 list-skills.py 联网验证通过；上文下载方式保留为历史记录。

## 1. 状态与选用原则

用户要求整理最优推荐 skills，供后续引入工作流。本文件是选用方案，本次未安装技能、执行外部脚本或开始开发。

来源沿用前序 GitHub 调研：已查看仓库目录与部分技能正文，但未完整审查所有引用文件和脚本，未完成项目运行验证。链接指向可变分支，正式引入时需固定提交。

采用“Phaser 官方实现技能 + 试玩与资产流程 + 少量通用设计技能”的组合。首批推荐 8 个，按任务加载。技能提供方法与参考，不代替开发工具、第三方账号、素材授权和平台验收。

## 2. 首批推荐：8 个

### Phaser 官方技能

来源：[phaserjs/phaser — skills](https://github.com/phaserjs/phaser/tree/master/skills)，参考分支 `master`。

| Skill 与源码 | 调用时机 | 本项目用途与验收重点 |
| --- | --- | --- |
| [input-keyboard-mouse-touch](https://github.com/phaserjs/phaser/blob/master/skills/input-keyboard-mouse-touch/SKILL.md) | 编写或修改输入 | 电脑与触屏操作；验证多指组合、滑出按钮、失焦和触控中断后的输入释放 |
| [scale-and-responsive](https://github.com/phaserjs/phaser/blob/master/skills/scale-and-responsive/SKILL.md) | 画布、布局、尺寸变化 | 屏幕适配；验证安全区、输入坐标与显示位置一致性 |
| [physics-arcade](https://github.com/phaserjs/phaser/blob/master/skills/physics-arcade/SKILL.md) | 移动与碰撞实现 | 玩家、敌人、障碍、命中；检查穿墙、重复命中和高速弹丸漏检 |
| [scenes](https://github.com/phaserjs/phaser/blob/master/skills/scenes/SKILL.md) | 场景建立和切换 | 加载、基地、战斗、结算；反复进入不累积监听器、计时器和对象 |

选择理由：直接对应项目引擎，输入和缩放尤其贴合移动端要求。技能引用的 API 必须与项目锁定的 Phaser 4 版本匹配。

阅读状态：前序已读取输入、响应式与 Arcade Physics 原始文件；`scenes` 正文及引用也已审阅，安装验证见上方最新进度。

### OpenAI Game Studio 技能

来源：[openai/plugins — game-studio](https://github.com/openai/plugins/tree/main/plugins/game-studio)，参考分支 `main`。

| Skill 与源码 | 调用时机 | 本项目用途与验收重点 |
| --- | --- | --- |
| [game-playtest](https://github.com/openai/plugins/blob/main/plugins/game-studio/skills/game-playtest/SKILL.md) | 可玩改动完成后 | 浏览器流程、截图、布局检查；问题附复现步骤和证据 |
| [sprite-pipeline](https://github.com/openai/plugins/blob/main/plugins/game-studio/skills/sprite-pipeline/SKILL.md) | 角色短动画制作 | 参考帧、短动画条、比例和锚点统一；检查游戏尺寸下的动作与透明背景 |

选择理由：试玩技能补充实际体验验证，精灵流程解决 AI 动画帧大小和位置漂移。两者正文已读取，引用脚本未执行验证。

依赖与适配要求：

- 包内引用共享 `scripts/`、`references/` 和相邻技能，不能仅复制一个 `SKILL.md`。
- 保留必要目录结构；若拆为独立技能包，修正并验证全部引用。
- `sprite-pipeline` 原工作流使用 `imagegen`，不能宣称安装后即可调用 Scenario。采用 Scenario 时需要适配生成环节。
- 图像编辑遵循当前环境的图像工具规则；所附 Python 脚本是待检查的候选，不代表可直接执行。
- 从少量短动画帧验证，不扩大首版动作数量。
- 浏览器模拟与截图不代替 iPhone、Android 真机检查。

### 社区通用技能

来源：[gamedev-skills/awesome-gamedev-agent-skills](https://github.com/gamedev-skills/awesome-gamedev-agent-skills)，参考分支 `main`。

| Skill 与源码 | 调用时机 | 本项目用途与验收重点 |
| --- | --- | --- |
| [game-feel](https://github.com/gamedev-skills/awesome-gamedev-agent-skills/blob/main/skills/disciplines/game-feel/SKILL.md) | 战斗机制已正确运行后 | 枪击、受击、拾取和打造反馈；不卡输入，不遮挡敌人预警 |
| [save-systems](https://github.com/gamedev-skills/awesome-gamedev-agent-skills/blob/main/skills/disciplines/save-systems/SKILL.md) | 库存与进度持久化 | 数据版本、加载校验、恢复和迁移；防止重复结算及进度损坏 |

选择理由：搜打撤需要清楚的战斗反馈，装备打造需要可靠的进度保存。两者正文已读取，部分 Godot、Unity 示例必须转化为项目 TypeScript 实现。

特别注意：`save-systems` 的原生临时文件写入、重命名示例不能直接用于浏览器。采用其版本、验证和恢复原则，存储接口按 CrazyGames Data 模块与项目实际方案实现；不能承诺客户端存档防作弊。

## 3. 后续按需补充

以下已在仓库目录或前序调研中发现，引入前仍需逐个检查完整内容与依赖。

| 阶段 | Skill | 仓库内路径 | 加入条件 |
| --- | --- | --- | --- |
| 正式地图 | `tilemaps` | Phaser：`skills/tilemaps` | 导入 Tiled 地图与碰撞层 |
| 资源增多 | `loading-assets` | Phaser：`skills/loading-assets` | 图集、分组加载与首屏优化 |
| 音频接入 | `audio-and-sound` | Phaser：`skills/audio-and-sound` | 音乐、音效和中断恢复 |
| 敌人行为 | `game-ai` | 社区：`skills/disciplines/game-ai` | 巡逻、发现、追击与返回 |
| 关卡迭代 | `level-design` | 社区：`skills/disciplines/level-design` | 搜索路线、危险区与撤离点调整 |
| 音频打磨 | `audio-design` | 社区：`skills/disciplines/audio-design` | 混音、预警与音乐切换 |
| 实测性能问题 | `performance-optimization` | 社区：`skills/disciplines/performance-optimization` | 已有帧耗时、内存或载入数据；前序已读取原始文件 |

不默认全量引入社区整套技能或路由器。项目已选 Phaser，其他引擎内容按需查阅即可。

## 4. 暂不引入

| 候选 | 原因与处理 |
| --- | --- |
| Game Studio `phaser-2d-game` | 已读正文，可参考系统与显示分离；默认 DOM HUD 与当前 Phaser UI 基线不同，先不作为主实现规则 |
| Game Studio `game-ui-frontend` | 作为界面参考候选，使用前检查是否改变既有技术方案 |
| 社区 `survival-crafting` | 打造设计需要时参考；不因技能引入饥饿、建造等未确认玩法 |
| Phaser `v3-to-v4-migration` | 接触旧代码或示例时加载，新项目不常驻 |
| [horn111/web-game-ad-skills](https://github.com/horn111/web-game-ad-skills) | 此前只读到 README，主技能抓取失败；参考代码与测试未核验，暂作候选资料 |

CrazyGames 广告按官方文档与项目平台适配方案推进，社区宣称“已测试”不代表项目验收通过。后续引入广告技能时单独核对 SDK 版本、暂停状态和奖励结算。

## 5. 工作流映射

| 步骤 | 使用技能 | 输入 | 应产出 |
| --- | --- | --- | --- |
| 1. 确定本次范围 | 先读取项目文档 | 已确认需求、工具链、待确认事项 | 任务范围与验收条件 |
| 2. 搭建场景 | `scenes` | 场景和生命周期设计 | 可启动、切换、反复进入的场景 |
| 3. 电脑与手机操作 | 输入 + 响应式技能 | 已确认操作方案、视口范围 | 输入映射、缩放和操作界面 |
| 4. 战斗与碰撞 | `physics-arcade` | 移动、障碍和命中规则 | 最小战斗闭环 |
| 5. 撤离、打造与保存 | `save-systems` | 战利品、配方、失败规则 | 一次性结算、保存恢复与逻辑验证 |
| 6. 正式短动画 | `sprite-pipeline` | 认可的参考帧及规格 | 帧资产、预览与来源记录 |
| 7. 战斗反馈 | `game-feel` | 正确工作的战斗事件 | 分层反馈、参数及手机可读性检查 |
| 8. 可玩改动验收 | `game-playtest` | 运行地址和验收条件 | 流程结果、截图、复现问题和未覆盖范围 |
| 9. 专项迭代 | 对应后续技能 | 实际需求或性能测量 | 有依据的地图、音频与性能改动 |
| 10. 平台验收 | 官方文档 + 项目清单 | 生产包 | 平台预览、真机和广告状态检查 |

步骤 8 随可玩改动反复进行，不等全部内容完成。检查范围与本次改动相称，不要求每次小改动重复全部流程。

当前输入与战斗任务须覆盖已确认的射击、近战、切枪、换弹、冲刺五按钮，以及同时携带三类武器、两枪独立弹药。具体行为与待定动作中断规则以 GAME_DESIGN.md 为准，不沿用早期单武器与默认自动换弹提案。

## 6. 后续调用模板

**移动端输入：**

> 先阅读项目交接、工具链和 skills 工作流文档。使用 input-keyboard-mouse-touch 与 scale-and-responsive 实现已确认的操作方案，验证多指组合、视口变化和输入中断。不改动未授权的玩法范围。

**存档与结算：**

> 使用 save-systems 设计库存和打造进度的版本化数据，按 CrazyGames 平台适配保存。检查重复结算、异常数据和旧版本迁移，不照搬原生文件 API。

**短动画：**

> 使用 sprite-pipeline，基于认可的参考帧制作短动作，保持方向、比例和锚点。先检查本环境支持的图像工具与依赖，再制作预览并在游戏尺寸下验收。

**试玩：**

> 使用 game-playtest 检查出发、搜索、战斗、撤离、打造与再次出发。报告实际平台、截图、复现步骤和未覆盖事项，不把桌面模拟记成真机通过。

这些是后续实施模板，不代表本次授权执行。

## 7. 引入前检查与记录

1. 读取技能和必需引用，按本任务选择依赖，不直接照搬仓库全量安装命令。
2. 记录仓库、路径、提交 SHA、许可证与安装位置。当前未固定 SHA，不填写虚构版本。
3. 检查脚本的文件写入、网络访问和依赖；保留现有工作习惯与项目资料，不覆盖 `agent.md`。
4. Game Studio 保留所需共享结构；拆分时验证相对路径和相邻技能引用。
5. 核验 Phaser 版本、Node.js / Python、Intel Mac 和现有图像工具的适配。
6. 使用一个小任务验证技能加载、引用与结果；安装成功和任务通过分别记录。
7. 项目适配改动保留来源及说明，后续更新不静默覆盖。

状态建议：候选 → 正文与依赖检查完成 → 已安装 → 小任务通过 → 工作流启用。当前首批技能均未在本项目完成安装与小任务验证。

技能不能把设计建议变成用户已确认需求，不覆盖平台最新规则，也不代表可开通付费服务、发布游戏或修改账号。

## 8. 首次引入顺序

- 原型开始：Phaser 四个基础技能 + `game-playtest`。
- 开始保存进度：加入 `save-systems`。
- 战斗可玩后：加入 `game-feel`。
- 角色风格认可后：加入 `sprite-pipeline` 及必要支持文件。

本次只完成方案整理，待用户要求引入工作流或开始相关开发后执行。
