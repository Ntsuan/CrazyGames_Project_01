# Neon Hunter / 霓虹猎手

当前游戏为v2.63 HTML/CSS/JavaScript放置爬塔游戏，入口 `game/index.html`。GitHub仓库：Ntsuan/CrazyGames_Project_01。

- `codex/develop`：开发版，保留测试工具和模拟广告。
- `main`：Basic候选版，关闭测试功能/广告模拟，补给在线60秒免费领取。
- Full配置预留且禁止出包，尚未接CrazyGames云存档/真实广告SDK；未提交平台审核。

先读 [分支与发布配置](RELEASE_CHANNELS.md)、[当前游戏交接](交接文档.md) 和 [发布规则](CRAZYGAMES_PUBLISHING_GUIDE.md)。

```sh
# Node.js 24，无需安装依赖即可运行当前游戏检查和构建
npm run neon:check
npm run neon:basic
python3 -m http.server 8000 --directory dist/neon/basic
```

GitHub Actions自动生成对应分支运行包，下载Basic产物后仍需平台预览与真机验收。

## 旧开发环境说明（历史资料）

以下命令/Phaser代码属于已取消的旧方案，不能用于构建当前Neon Hunter。当前游戏使用上面的neon命令。

# CrazyGames 开发环境

当前为环境验证工程，尚未实现搜打撤玩法，也未接入 CrazyGames SDK。

## 使用

使用 Node.js 24.18.0（见 `.nvmrc`）。首次拉取后运行 `npm ci`；浏览器测试另需 `npx playwright install chromium firefox webkit`。

```bash
npm run dev
```

按终端显示的本地地址打开页面，点击画布中的按钮验证输入。

| 命令               | 用途                             |
| ------------------ | -------------------------------- |
| `npm run check`    | 类型、ESLint、格式与工具冒烟测试 |
| `npm run build`    | 类型检查并构建到 dist            |
| `npm run preview`  | 预览生产包                       |
| `npm run test:e2e` | 重新构建并运行三浏览器测试       |
| `npm run format`   | 格式化工程文件                   |

手机局域网访问可运行 `npm run dev -- --host 0.0.0.0`，在同一 Wi-Fi 的手机上打开终端给出的 Network 地址。结束时 Ctrl+C 停止服务。

## 配置边界

- Phaser 4.2.1、TypeScript 6.0.3、Vite 8.2.2，所有直接依赖固定版本，保留 package-lock.json。
- TypeScript 使用 strict；skipLibCheck 跳过 Phaser 依赖声明中的已发现错误，仍检查应用代码。
- Vite 使用相对资源路径。当前加载整个 Phaser，引擎包有超过 500 kB 的构建提示；尚未做资源与载入优化。
- Playwright 测试桌面和手机横屏尺寸下的画布输入；不代表真机触控、性能、声音、存档或平台验收通过。
- 当前单元测试仅验证工具能处理 TypeScript，并非游戏逻辑测试。测试配置与页面上的 data 属性仅用于环境验证；正式游戏需另行设计调试边界。
- 地图和正式素材尚未生成，assets:build 尚未配置。Git 远程为 https://github.com/Ntsuan/CrazyGames_Project_01；CI 尚未配置，游戏尚未部署。

## 已安装工具

Tiled 1.12.2、Krita 5.3.3、Audacity 4.0.0、TexturePacker 8.2.2、Python 3.13.15、Command Line Tools 26.3 已验证；Homebrew 已更新到 6.0.21，pkgconf 链接已修复。现有 FFmpeg 4.4.1 已成功解码 jsfxr 生成的 WAV。

TexturePacker 安装与许可协议步骤已完成，商业许可证未核验；在线美术与音频服务、手机真机联调仍待处理；首批 8 个 skills 已安装并确认加载。误装在用户主目录的 Playwright 未删除，项目已独立安装正确版本。

设计和已确认规则见 PROJECT_HANDOFF.md、GAME_DESIGN.md；本工程页面不构成玩法、美术或数值决定。

## 本机验证结果（2026-09-09）

npm run check、npm run build 均通过；生产包在 Chromium、Firefox、WebKit 共 3 项测试通过，覆盖 1280×720 与 844×390 视口、Phaser 初始化、点击响应及无页面脚本异常。尚未验证音频播放、真实多点触控或性能指标。

Python HTTPS 证书路径已修复，GitHub、PyPI 和技能安装器联网验证通过。精灵处理脚本使用 Codex 自带 Python/Pillow，普通 Homebrew Python 尚未安装 Pillow。
