---
name: aiszwl-code-generated-mv
description: 用代码（Canvas 2D 程序化动画 + Playwright 逐帧截图 + ffmpeg）给一首歌做歌词同步的动画 MV / 歌词MV / 动画MV，可做任意画风（皮克斯 3D 感、新海诚、功夫熊猫、大鱼海棠 2D 国风、纸艺 RPG 等），带逐字卡拉 OK 字幕，也可用用户提供的角色图做成纸偶动画。用户说"给某首歌做个 MV / 动画 / 歌词视频"、指定画风或角色、要求字幕跟唱时使用。
---

# AISZWL-code-generated MV · 代码生成歌词动画 MV 全流程

把一首歌变成 1080p30 有声 MP4：画面全部由代码逐帧绘制（每帧是时间 `T` 的纯函数），镜头按歌词逐句编排，字幕逐字填色跟唱。
本流程已在 5 支 MV 上跑通（达拉崩吧 / 嘉宾 / 下山 / 不凡 / 月光），案例见 `references/`，起步工程见 `templates/starter/`。

---

## 0. 速查

| 阶段 | 产物 | 验收 |
|---|---|---|
| 1 需求 | `docs/brief.md` | 歌名、原唱版本、画风、角色、字幕要求都写清 |
| 2 音频+歌词 | `assets/audio/song.m4a`、`assets/audio/lines.json`、`src/cues.js` | 时长与网易云/酷狗元数据一致；偏移校准 ≤ ±0.1 s |
| 3 分镜 | `docs/blocks.json`（块）+ 每块镜头表 | 块边界首尾相接、覆盖全片；每句歌词有对应画面 |
| 4 定妆 | 风格帧 + 角色 lineup | 自己看图评审过至少两轮 |
| 5 制作 | `src/scenes/bNN_*.js` | 每块联系表自查 |
| 6 QA | lint / fontcheck / seams / pops | 全部 OK，pops 只剩有意的切/闪/淡 |
| 7 渲染 | `dist/chunks/*.mp4` | 0 engine errors |
| 8 交付 | 母版、分享版 < 95 MB、8 张截图 | ffprobe、blackdetect、freezedetect 干净 |
| 9 发送 | 大文件分享链接（Wormhole） | 链接带 `#` 后面部分 |

---

## 1. 需求确认（intake）

写进 `docs/brief.md`：

- **歌**：歌名、**原唱/版本**（录音室原版 / Live / 翻唱）、词曲作者（从酷狗 KRC 头、网易云、B 站简介交叉核对，只写查到的）。
- **画风**：参考作品只取"质感"（配色、光、材质、镜头语言），**不复刻原作角色/画面**（例如"大鱼海棠风，但不出现大鱼海棠角色"）。
- **角色**：原创角色，或用户提供的角色图（走第 6.2 节纸偶路线）。用户点名的主角镜头占比要最高（用 `tools/share.mjs` 统计）。
- **字幕**：要不要歌词字幕；字幕风格要和画风统一。
- **交付**：时长=整首歌；1080p30；用户偏好的网盘。
- 用户已授权"全程批准、不用停下来问"时：自己评审、自己推进，到交付再汇报。

## 2. 音频与逐字歌词

### 2.1 音频（B 站 Web API）

```bash
tools/audio/bili_audio.sh BVxxxxxxxxxx assets/audio/song.m4a
```

- 走 `x/player/pagelist` → `x/player/playurl`（`fnval=4048`），带匿名会话 cookie（先访问首页拿到的，**不需要登录、不存任何账号 cookie**）和 `Referer`；yt-dlp 常被 412 拒。
- 选码率最高的音轨（含 flac/dolby 时也比较）。
- **核对版本**：时长对照网易云 / 酷狗元数据（误差 < 1 s，前置静音要记录）；优先"专辑/Hi-Res 原版"上传，避开 Live、伴奏、加速版。

### 2.2 逐字歌词（首选酷狗 KRC）

```bash
# 1) 搜索候选：https://krcs.kugou.com/search?ver=1&man=yes&client=mobi&keyword=<歌手 - 歌名>&duration=<ms>
#    取返回里的 id + accesskey（选"官方推荐歌词"、时长最接近的那条）
python3 tools/audio/kugou_krc.py <id> <accesskey> out/song.krc   # 解密 KRC（公开格式）
python3 tools/audio/krc_lines.py out/song.krc assets/audio/lines.json
```

- KRC 是逐字时间轴（`[行起点,行长]<字偏移,字长,0>字`），直接驱动卡拉 OK 填色。
- **兜底**：网易云 LRC（`music.163.com/api/song/lyric?id=<id>&lv=1`，只有逐行），逐字时间按字数均分。

### 2.3 校准（真实秒，不做 warp）

```bash
ffmpeg -i assets/audio/song.m4a -ac 1 -ar 22050 -f s16le out/m22.raw
python3 tools/audio/calibrate.py out/m22.raw   # HPSS 谐波谱通量 onset vs KRC 字起点 → 全局/分段偏移
python3 tools/audio/linecal.py  out/m22.raw    # 人声频段能量上升 vs 行起点（安静主歌更稳）
python3 tools/audio/build_cues.py --dur <秒> --off <偏移> --skip-before <首句前秒数> --bpm <BPM>
```

- 实测各曲偏移都在 0.00～+0.09 s；超过 ±0.15 s 先怀疑版本不对。
- 分段得分会在节拍网格上"混叠"，以行起点峰值为准。
- 末字时长截到 2.6 s（KRC 常把末字拖到下一句）。
- 只有一个音频版本时**用真实秒**；要对齐多个版本（原版 + Live）才用 warp（见达拉崩吧手册 §3.3）。

## 3. 分镜：按歌词分块

- 全片切 **9～17 块**，每块 8～40 s，边界落在乐句/段落上（前奏、主歌、导歌、副歌、间奏、尾声）。写进 `docs/blocks.json`：`id, file, start, end, group, desc(覆盖哪些 L 行 + 画面)`。
- **画面跟歌词走**：每句歌词至少一个能"读出来"的画面意象（月光→满月、"情关"→关隘大门、"破空"→御剑穿云）。
- **故事线**：开头建立人物与世界 → 主歌铺情绪 → 副歌给大场面 → 间奏给动作戏 → 终副歌高潮 → 尾声收在安静画面。
- **连贯**：块的入场状态 = 上一块出场状态（写进 blocks.json 的 entry/exit），用接缝合同（`src/scenes/_seams.js`）约束；镜头切换优先落在字的起点或节拍上。
- 片头标题卡写歌名 + 演唱 + 词曲；片尾可放 credits。

## 4. 风格帧与 lineup 自评（开工前必做）

1. 先做 2～4 张**风格帧**（关键场景的成品质感）和**角色 lineup**（`src/sheets/lineup.js`，`node tools/render.mjs stills --sheet lineup --times 1`）。
2. 用 Read 看 PNG，按第 10 节"质量教训"逐条挑错，改到满意再铺开做块。
3. 每块做完出联系表：`node tools/render.mjs sheet --only b05 --from A --to B --every 0.25`，看连贯性、构图、字幕区。

## 5. 引擎规则（`src/core`）

- **每帧是 T 的纯函数**：`draw(g, T, lt, ctx)` 只依赖时间；**禁止** `Math.random` / `Date.now` / `new Date` / `performance.now` / 跨帧状态。随机用 `hash1/hash2(seed…)`。好处：任意跳帧、多 worker 分段渲染、断点续渲、接缝像素对比。
- **镜头（shot）**：`S(id, start, end, draw, z)`；块文件 `export default [shots…]`，在 `src/scenes/index.js` 注册。
- **相机**：`cam(x,y,zoom,rot)` + `camKeys(T, [[t,cam]…])` 关键帧 + `withDrift` 手持漂移；`layer(g, c, depth, fn)` 多平面视差。
- **后期**：`grade(ctx,{sat,contrast,vignette,bloom,bloomThreshold,fade,flash,…})`，引擎做 bloom、调色、暗角、颗粒、淡入淡出。
- **离屏层**：`ctx.layer / ctx.dof / ctx.mask` 做景深、遮罩。
- **字体**：只用 OFL 字体（`tools/get_fonts.sh` 下载 Ma Shan Zheng、ZCOOL XiaoWei），`tools/fontcheck.py` 保证 0 缺字。

## 6. 画面两条路线

### 6.1 纯程序化绘制（原创角色/场景）
- 角色用路径绘制：头、发（成簇、带明暗和高光带）、五官（分层虹膜 + 高光）、衣服（A 字形、宽袖下垂）、实心四肢。
- 场景用可复用 kit（`src/env/world.js` 仙侠山水云海；`src/variants/dayu-2d/` 大鱼海棠式 2D 国风：土楼、祥云、海浪、天灯、月晕、宣纸纹+水彩晕染）。
- 线宽随镜头缩放（近景变细，`LW.k`）。

### 6.2 用户角色图 → 纸偶（cutout puppet）
1. 原图放 `assets/chars/src/`，`python3 tools/prep_chars.py`：alpha 重映射、边缘去色污染、紧裁 + 留边 → `assets/chars/c{i}.png`。
2. 在 `src/rigs/puppet.js` 的 `CHARS` 里标坐标（下巴 neck、双眼框 eyes、双手 hand、裙摆 hem、脸心 face、胸口 chest）。
3. `drawChar(g, key, {x,y,h,t,wind,rim,side,shadow,a})`：按水平细条带变形——脚底为轴的整体倾斜、颈部以上的头部摆动、呼吸、越往发梢/裙摆越大的风动、挤压拉伸；眨眼用从原图取样的肤色画眼皮（种子化时间表）；按场景打边缘光、侧光、色调、脚底 AO 与接触阴影。
4. 用 `tools/share.mjs` 统计每个角色的出镜占比（主角应最高，不凡里韩立 76.8%）。
- 详见 `examples/fanren-characters/README.md`。

## 7. 卡拉 OK 字幕（`src/ui/subs.js`）

- 数据：`LINES[].syl = [[t0, dur, 字]…]`；每字在自己的时间段内从"未唱色"填成"已唱色"（渐变 + 柔光 + 轻微上浮）。
- 窗口：句前 0.4 s 入场，句尾 +0.7 s 退场（与下一句间隔 < 1.2 s 时提前 0.12 s 让位）。
- **风格适配画风**（每个项目重写外观，不改数据层）：
  - 仙侠：ZCOOL XiaoWei + 羽化水墨底带，金→玉渐变填色，灵气粒子入场，墨散出场（不凡）。
  - 功夫：毛笔楷书写在宣纸手卷上，木轴 + 红印，逐字墨填（下山）。
  - 大鱼海棠国风：Ma Shan Zheng 书法字，月银未唱、墨金填色，墨晕入场、溶解出场（月光）。
- **不挡脸**：`SUB_POS = [[t0,t1,{x,y}]…]` 按镜头移位；剑光、特效也要让开脸和字幕区。

## 8. QA（每块 + 集成）

```bash
bash tools/lint.sh               # 语法 / U+FFFD 乱码 / 非确定性 API
python3 tools/fontcheck.py       # 歌词与画面里所有汉字在字体里都有
node tools/seams.mjs [--render]  # 块边界与接缝合同一致；--render 输出接缝前后帧对比
node tools/pops.mjs --from 0 --to <dur>   # 全片逐帧低清扫描：POP 意外跳变 / ERR / EMPTY / FLAT
node tools/render.mjs cues --from 0 --to <dur> --cols 8   # 逐句联系表
node tools/share.mjs             # 角色出镜占比（纸偶路线）
node tools/prof.mjs              # 每帧耗时
```

pops 里每条 CUT/POP 都要解释：只能是计划内的硬切、闪白、淡入淡出。

## 9. 渲染、合成与交付

```bash
nohup node tools/renderfilm.mjs --dpr 2 --workers 3 > dist/render_stdout.log 2>&1 &   # 断了就原样再跑，已完成的 chunk 自动跳过
node tools/renderfilm.mjs --concat dist/video.mp4
ffmpeg -i dist/video.mp4 -i assets/audio/song.m4a -map 0:v -map 1:a -c:v copy -c:a aac -b:a 256k -t <dur> -movflags +faststart dist/<歌名>_MV_1080p.mp4
# 分享版 < 95 MB：2-pass x264，码率 ≈ (95*8192/dur - 160) k
ffmpeg -y -i master.mp4 -c:v libx264 -b:v 2050k -pass 1 -an -f mp4 /dev/null && ffmpeg -i master.mp4 -c:v libx264 -b:v 2050k -pass 2 -c:a aac -b:a 160k -movflags +faststart share.mp4
# 截图 8 张
for t in ...; do ffmpeg -ss $t -i master.mp4 -frames:v 1 dist/stills/s_$t.jpg; done
# 验收
ffprobe -v error -show_entries stream=codec_name,width,height,r_frame_rate,nb_frames:format=duration master.mp4
ffmpeg -i master.mp4 -vf blackdetect=d=0.2:pix_th=0.1 -an -f null - 2>&1 | grep black_
ffmpeg -i master.mp4 -vf freezedetect=n=0.003:d=1.5 -an -f null - 2>&1 | grep freeze_
```

- dpr 2 超采样再缩到 1920×1080（`grabFrameScaled`），每 chunk 150 帧（5 s）独立编码 CRF 14。
- 执行环境常被打断：渲染**必须 nohup**，进度写 `docs/progress.md`，恢复时先查 git log / progress / `pgrep`，不要重开已在跑的渲染。
- 实测墙钟：平均 0.17～0.77 s/帧（dpr 2，3 workers）；3～5 分钟的歌渲染 24～82 分钟。
- 母版约 10 Mb/s（250～435 MB）；再复制一份 ASCII 文件名，方便上传。
- 验收：帧数 = 时长×30；音视频流都从 0.000 开始；blackdetect 只在有意的淡入淡出；freezedetect 只在静止片尾。

### 9.1 发送
- 大文件用 Wormhole（https://wormhole.app，免注册）：页面隐藏的 file input 上传，等出现 "Uploaded"，链接要带 `#` 后面的密钥；24 h 或 100 次下载后失效。
- 实测 Wormhole 可传约 500 MB；SwissTransfer 400 MB 以上会卡在 76～79%，需拆成约 200 MB 分卷。
- 交付消息：链接 + 简述（时长/分辨率/大小/音频版本）+ 如实列出瑕疵 + 版权提示（音频取自公开平台，个人观看没问题，公开发布需注明原唱与词曲）。

## 10. 质量教训（每个项目都踩过）

- **别发灰**：不要奶白雾（`lighten` lift 压到 ~0），bloom 0.2～0.3、阈值 0.8 左右，只给真实光源加光晕；保住黑位与饱和度（contrast 1.1～1.16，sat 1.12～1.26）。
- **脸和头发要有细节**：成簇的刘海（尖端、明暗条、高光带、发际投影）、侧光明暗分面而不是上下两截、杏仁眼分层虹膜 + 高光、唇色。
- **四肢画实心形体**，不要"管子"。
- **溶解 ≤ 0.2 s**，除非是刻意的软转场（显式 `soft: true`）；长溶解会出"鬼影"。跨块溶解要延续上一块最后一个镜头，不能从黑场淡入；溶解后的调色要从中性值过渡，不能跳。
- **字幕和特效不挡脸**；举剑的手臂画在头后面，袖子别盖住脸。
- **别做大特写**：程序化脸放到 5 倍以上会像 Mii 头像，改成头肩近景（~3.3 倍）。
- **场景要能"读"**：土楼要有夯土高墙、檐下阴影、外挑瓦圈，不能像"篮子"；关隘大门要退远让人看出是门；战场要有暗色地面。
- **对打要拉开**：两人间距 ≥ 210 px；道具（剑）要在角色手里。
- **避免重复**：云、士兵剪影换种子、换尺寸。
- **镜头连贯**：多用顺着运镜的转场，少一句一硬切。
- **先看图再说好**：每轮都 Read PNG；没看过的帧不算完成。

## 11. 起步

```bash
cp -r templates/starter my-mv && cd my-mv && git init
npm i && bash tools/get_fonts.sh
python3 tools/audio/build_cues.py --dur 20   # 先用自带示例歌词跑通
node tools/render.mjs stills --times 2,12 --outdir out/review
```

详见 `templates/README.md`。
