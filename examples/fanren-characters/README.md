# 示例角色图：凡人修仙传 6 角色（《不凡》MV 使用）

用户提供的 6 张 3D 渲染角色图，经用户同意作为本 skill 的模板示例。仅作学习/演示用途，角色形象版权归原作方。

| 文件 | key（`puppet.js`） | 角色 |
|---|---|---|
| c1.png | hanli | 韩立（主角，镜头占比 76.8%） |
| c2.png | ally | 南宫婉 |
| c3.png | fox | 狐女 |
| c4.png | schemer | 墨大夫 |
| c5.png | sorc | 妖女 |
| c6.png | demon | 魔修 |

这些文件是 `tools/prep_chars.py` **清理后**的版本（为控制仓库体积量化成 256 色 PNG，尺寸不变），所以与 `templates/starter/src/rigs/puppet.js` 里 `CHARS` 的像素坐标一一对应，可直接使用：

```bash
cp examples/fanren-characters/c*.png templates/starter/assets/chars/   # 或你的新项目 assets/chars/
node tools/render.mjs stills --sheet lineup --times 1 --outdir out/review
```

## 怎么"切"和动起来

不是切成独立的手臂/腿图层，而是**整张图按水平细条带变形**（一张图就能动，不需要用户提供分层素材）：

1. **清理**（`tools/prep_chars.py`）：alpha 重映射去掉软边灰雾；半透明边缘像素用内部可信像素颜色替换（去掉原背景色污染）；按 bbox 紧裁并留 8 px。
2. **标点**（`CHARS`）：`neck` 下巴所在 y、`eyes` 两眼框 `[x,y,w,h]`、`hand` 左右手、`hem` 裙摆起点 y、`face` 脸心、`chest` 胸口（用于挂法宝光效、对齐镜头）。
3. **条带变形**（`drawChar`）：
   - 以脚底为轴整体倾斜（身体重心摆动）；
   - `neck` 以上的条带额外旋转 = 头部轻摆；
   - 呼吸：胸口附近条带轻微缩放；
   - 风：越接近发梢、裙摆（`hem` 以下）摆幅越大，相位沿 y 递增，形成飘动；
   - 挤压拉伸用于落地、出招。
4. **眨眼**：在 `eyes` 框上画眼皮，颜色取样自眼睛下方的皮肤；眨眼时间表由角色 key 的种子哈希决定（纯函数，可复现）。
5. **打光融合**：每个场景用 `LIGHT` 预设——整体亮度/饱和度、色调罩染、方向边缘光（rim）、侧光、脚底 AO、接触阴影、可选光环，让同一张 3D 渲染图放进黎明云海、夜园、洞府、血色战场都不突兀。
6. **镜头占比**：`node tools/share.mjs` 每 0.2 s 采样统计各角色出镜比例，确认主角最多。

## 换成你自己的角色
1. 原图（透明背景 PNG 最好）放 `assets/chars/src/c1.png…`，运行 `python3 tools/prep_chars.py`（改脚本里的数量）。
2. 打开 lineup，量出每张图的 neck / eyes / hand / hem / face / chest 像素坐标，填进 `CHARS`。
3. 闭眼角色（或眼睛太小）把 `eyes` 设为 `[]` 就不画眨眼。

## ../stills/
几支已完成 MV 的缩小截图（960 px）：`bufan*.jpg`（不凡）、`yueguang*.jpg`（月光）、`jiabin.jpg`（嘉宾）、`xiashan.jpg`（下山）。
