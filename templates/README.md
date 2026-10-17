# templates/starter — 新项目起步工程

从《不凡》项目抽出的通用引擎 + 工具链（继承自达拉崩吧 → 嘉宾 → 下山 → 小镇姑娘 → 不凡 → 月光），去掉了所有歌曲、歌词、音频和项目专属场景。自带 20 秒示例（示例文字是原创占位句，不是真实歌词）。

## 环境
- Node 18+、`playwright-core`（`npm i`），系统 Chrome（默认 `/usr/bin/google-chrome`，可用环境变量 `CHROME=` 指定）
- ffmpeg / ffprobe；Python 3 + numpy、Pillow、fontTools

## 开新项目
```bash
cp -r templates/starter ~/my-mv && cd ~/my-mv && git init
npm i
bash tools/get_fonts.sh                          # 下载 OFL 字体（不随仓库分发）
python3 tools/audio/build_cues.py --dur 20       # 用示例 lines.json 生成 src/cues.js
bash tools/lint.sh && node tools/seams.mjs
node tools/render.mjs stills --times 2,12 --outdir out/review
node tools/server.mjs 8123                       # 浏览器打开 http://127.0.0.1:8123 预览（空格播放，[ ] 跳句）
```
然后按 `../SKILL.md` 第 2～9 节：下载音频 → 取 KRC → 校准 → 写 `docs/blocks.json` → 每块一个 `src/scenes/bNN_*.js` → QA → 渲染。

## 目录
```
index.html                 预览/截帧页面（?capture=1&dpr=2&only=b05&sheet=lineup&nosubs&nograin&stamp）
src/main.js                启动：字体、角色、故事、字幕叠加；暴露 renderFrame / grabFrameScaled
src/cues.js                build_cues.py 生成：DURATION、LINES(逐字)、CUE_LIST、cue()、beat()
src/story.js               汇总所有块的镜头
src/core/                  引擎（engine 调度+后期、camera、look 光效/调色、particles、ease、util 种子哈希、fonts）
src/ui/subs.js             卡拉 OK 字幕（数据层通用；外观按画风重写；SUB_POS 让开人脸）
src/rigs/puppet.js         用户角色图纸偶（CHARS 坐标示例对应 examples/fanren-characters）
src/env/world.js           仙侠山水 kit：天空、星、日月、山峰、云海、雾、亭台、仙门、台阶、树、瀑布、视差 layer
src/fx/magic.js            剑、剑光拖尾、灵气、法阵等特效
src/scenes/kit.js          LIGHT/GRADE 预设、vista、转场辅助；S() 镜头构造
src/scenes/index.js        块注册表；_seams.js 接缝合同
src/scenes/b01_demo.js     示例块
src/sheets/lineup.js       角色 lineup 定妆页
src/variants/dayu-2d/      大鱼海棠式 2D 国风画法（art/draw,chars,paint + scenes_kit + ui/subs）；替换 env/rigs/ui 时参考
tools/renderfilm.mjs       断点续渲（chunk=150 帧，nohup 运行，重跑即续）+ --concat
tools/render.mjs           stills / sheet / cues 联系表 / time 测速 / video 快速出片
tools/pops.mjs             全片逐帧跳变扫描；tools/seams.mjs 接缝检查
tools/lint.sh              语法 + 乱码 + 非确定性 API；tools/fontcheck.py 缺字检查
tools/share.mjs            角色镜头占比；tools/prof.mjs 每帧耗时；tools/montage.py 拼图
tools/prep_chars.py        角色图清理
tools/get_fonts.sh         下载 OFL 字体
tools/audio/bili_audio.sh  B 站音频（匿名会话，不需要登录）
tools/audio/kugou_krc.py   酷狗 KRC 下载解密；krc_lines.py 转 lines.json；build_cues.py 生成 cues.js
tools/audio/calibrate.py   HPSS 谱通量 onset 校准；linecal.py 行起点能量校准
```

## 注意
- `src/variants/dayu-2d/` 是《月光》项目原样抽出的画法库，import 路径已按新位置调整，但没有接入示例块；使用时把它的 art 放进 `src/art/` 并按需替换 `src/ui/subs.js`；月光版字幕默认字体是 Ma Shan Zheng，把 `src/core/fonts.js` 里 `FONT.sub` 改成 `'MaShan'` 即可。
- 不要把音频、歌词文件、成片提交到公开仓库（`.gitignore` 已排除）。
