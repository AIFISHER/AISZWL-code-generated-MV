# AISZWL-code-generated MV

**用代码生成歌词同步的动画 MV。** 每一帧都由 Canvas 2D 程序化绘制（时间 `T` 的纯函数），Playwright 驱动 Chrome 逐帧截图，ffmpeg 合成 1080p30 有声 MP4；镜头按歌词逐句编排，字幕逐字卡拉 OK 填色，画风可换（皮克斯 3D 感、新海诚、功夫熊猫、大鱼海棠 2D 国风、纸艺 RPG…），也能把用户给的角色图做成会动的纸偶。

> English summary: An Agent Skill + starter template for producing lyric-synced, fully code-generated animated music videos. Procedural Canvas 2D animation (deterministic, seeded, pure function of time), word-level karaoke subtitles from Kugou KRC, audio onset calibration, block storyboard with seam contracts, automated QA (lint / font coverage / seams / pop scan), resumable chunked headless-Chrome rendering at 2× supersampling, and ffmpeg delivery. Includes five case studies and a cutout-puppet system for user-supplied character art.

![examples](examples/stills/yueguang.jpg)

## 内容
| 路径 | 说明 |
|---|---|
| `SKILL.md` | Skill 主文件：从需求到交付的完整流程 + 质量教训 |
| `references/` | 5 个项目的复现案例：达拉崩吧原始手册、嘉宾、下山、不凡、月光 |
| `templates/starter/` | 通用起步工程（引擎、字幕、纸偶、QA 与渲染工具、音频/歌词脚本） |
| `examples/fanren-characters/` | 凡人修仙传 6 张角色示例图 + 纸偶做法说明 |
| `examples/stills/` | 已完成 MV 的截图 |

## 安装为 Agent Skill
把仓库放进你的 agent 的 skills 目录（例如 `~/.claude/skills/aiszwl-code-generated-mv/` 或对应平台的技能库），agent 会根据 `SKILL.md` 的 frontmatter 在"给歌做 MV / 歌词动画"时自动调用。

## 快速开始
```bash
cp -r templates/starter my-mv && cd my-mv
npm i && bash tools/get_fonts.sh
python3 tools/audio/build_cues.py --dur 20
node tools/render.mjs stills --times 2,12 --outdir out/review
```

## 版权说明
- 本仓库**不包含**任何歌曲音频、完整歌词、成片视频或字体文件。字体由 `tools/get_fonts.sh` 从 google/fonts 下载（SIL OFL）。
- 下载的音频/歌词仅供个人学习与观看；公开发布作品请注明原唱、词曲作者并遵守平台规则。
- `examples/fanren-characters/` 的角色图由用户提供并同意作为示例，角色形象版权归原作方。
- 代码以 MIT 许可发布。
