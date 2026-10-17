#!/usr/bin/env bash
# Download the OFL fonts used by src/core/fonts.js (google/fonts repo). Fonts are NOT bundled in this repo.
set -e; cd "$(dirname "$0")/.."; mkdir -p assets/fonts; B=https://raw.githubusercontent.com/google/fonts/main/ofl
curl -fsSL -o assets/fonts/MaShanZheng-Regular.ttf  $B/mashanzheng/MaShanZheng-Regular.ttf
curl -fsSL -o assets/fonts/ZCOOLXiaoWei-Regular.ttf $B/zcoolxiaowei/ZCOOLXiaoWei-Regular.ttf
curl -fsSL -o assets/fonts/OFL_MaShanZheng.txt      $B/mashanzheng/OFL.txt
curl -fsSL -o assets/fonts/OFL_ZCOOLXiaoWei.txt     $B/zcoolxiaowei/OFL.txt
ls -la assets/fonts
