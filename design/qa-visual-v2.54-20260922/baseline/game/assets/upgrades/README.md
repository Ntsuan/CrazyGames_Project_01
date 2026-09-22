# 义体改装运行素材（Codex，2026-09-21）

四段原始包在 `/Users/zmy/Documents/Codex/2026-09-15/xian/outputs/`：

1. neon-hunter-upgrade-01-02-v1
2. neon-hunter-upgrade-animation-v2-walk
3. neon-hunter-upgrade-03-05-v1/03-04
4. neon-hunter-upgrade-03-05-v1/04-05

运行时仅复制 renderer.js 依赖的分层 PNG，以 SHA-256 前 16 位命名去重；完整来源／哈希见 sources.json，引用映射见 manifest.json。原包的烘焙大图集、预览和制作原图均未加入预加载。

每档 20 张唯一 PNG：desktop 合计 11,381,686 字节，mobile 合计 3,304,330 字节；进入封面时按视口 <=800px 选择 mobile，否则 desktop。本次进入期间保持同一档，不下载另一档。两档均为已完成美术，未编辑图片。

四脚本输出独立命名空间 NeonUpgrade0102 / 0203 / 0304 / 0405，避免覆盖。仅调整导出命名，以及减少动态效果偏好下的装饰闪光强度；渲染构图与 8 秒时间线保留。

游戏只调用 render，不使用原演示 Player 的 seek/finish。前台播放时间、存档恢复、暂停、重试和完成提交统一在 game/index.html 管理。进入前所有本次所选素材就绪；任一图片、脚本或样式失败均保留加载页并允许重试。
