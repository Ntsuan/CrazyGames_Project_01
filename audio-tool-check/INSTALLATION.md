# 游戏音频工具安装记录

日期：2026-09-18

| 技能 | 安装位置 | 用途 |
| --- | --- | --- |
| jfxr-audio | `/Users/zmy/.codex/skills/jfxr-audio` | 本地程序合成音效，已安装官方 jfxr 0.13.0 |
| kenney-audio | `/Users/zmy/.codex/skills/kenney-audio` | 选取、导入 Kenney CC0 素材；已缓存 173 个 OGG |
| suno-songwriter | `/Users/zmy/.codex/skills/suno-songwriter` | 社区配乐/歌曲提示词技能，来源 regiellis/suno-songwriter-agent-skill |

前两个技能是本次编写的本地集成，不是 Jfxr/Kenney 官方发布的 skill。现有 audio-design、ElevenLabs 技能保持可用。已复用本机 Node.js、FFmpeg、ffprobe，无须重复安装。

## 使用

在后续对话中可请求：

- “用 jfxr-audio 为霓虹猎手做激光射击、金币和按钮音效。”
- “用 kenney-audio 筛选一组科幻战斗音效，保留许可与来源记录。”
- “用 suno-songwriter 编写战斗 BGM 的纯音乐提示词。”

命令示例：

```sh
node /Users/zmy/.codex/skills/jfxr-audio/scripts/generate.mjs --preset laser --output /absolute/output/laser.wav
```

支持 laser、click、pickup、impact 四个起始预设，也可用 `--input /absolute/input/file.jfxr` 读取完整参数。脚本拒绝覆盖已有文件。

## 验证结果

- 三个技能均通过 quick_validate.py。
- 四个 Jfxr 预设均导出非静音、无削波的 44.1 kHz 单声道 PCM16 WAV，峰值 0.5。
- laser.jfxr 再次渲染得到逐字节一致的 WAV。
- FFmpeg 已成功转出 laser.ogg；ffprobe 和解码检查通过。
- Kenney 两包各抽取一个音效，格式和解码检查通过；未逐一试听全部素材。

本文件夹的音频是安装验证样本，尚未作为正式游戏素材验收或接入项目。

## 来源与使用边界

- Jfxr：[官方仓库](https://github.com/ttencate/jfxr)、[官方编辑器与 FAQ](https://jfxr.frozenfractal.com)。软件为 BSD-3-Clause；生成声音使用说明与软件许可证分开保留。
- Kenney：[科幻音效](https://kenney.nl/assets/sci-fi-sounds)、[界面音效](https://kenney.nl/assets/interface-sounds)。每包附原始 License.txt、来源 URL、下载日期及 ZIP SHA-256。页面列出的科幻包数量为 70，下载包实际含 73 个 OGG；界面包含 100 个。
- Suno 技能：[社区仓库](https://github.com/regiellis/suno-songwriter-agent-skill)。仅提供提示词和编曲指导；没有安装第三方生成代理，也未开通付费订阅。实际生成和下载使用官网，商用前按当时官方条款核实账号、作品来源与下载权限；安装技能本身不赋予音频商用许可。

全局技能通常在下一轮对话加载；如没有识别，可重启 Codex。
