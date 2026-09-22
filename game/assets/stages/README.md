# 五阶段人物运行素材（Codex，2026-09-21）

阶段 1 沿用原 gunner 三动作和 stage01-death.png；阶段 2–5 使用已交付的 game-128 横向图集。
来源：`/Users/zmy/Documents/Codex/2026-09-15/xian/outputs/neon-hunter-stages01-05-complete-v1/`。

- 阶段 2 来源 stage02/animations/game-128；阶段 3–5 来源 stages03-05/stage0N/game-128。
- 原始 atlas.json 随各阶段保留。128×128，锚点 (60,116)，游戏显示帧 110×110。
- stages.css 按各 atlas 的逐帧 durationsMs 生成离散关键帧，保留非均匀射击／死亡时长。
- 射击时长：1–3 阶段 320ms、阶段 4 为 400ms、阶段 5 为 560ms。游戏 lunge 根据配置移除动作类，不再统一 330ms 截断。
- stage 2–5 待机 880ms、移动 640ms、死亡 1000ms。沿用战斗倍速、受击与迷彩容器效果。
- upgrade.css 为通关、改装演出与完成页样式，信息块为 #17202b / #3c4b5a，橙色改装按钮、青色入场按钮。

未重绘、裁切或修改现有美术。四段改装素材见相邻 upgrades 目录。
