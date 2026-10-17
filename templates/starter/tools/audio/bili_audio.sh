#!/usr/bin/env bash
# usage: tools/audio/bili_audio.sh BVID out.m4a   (web API + cookie + Referer; yt-dlp gets 412)
BV=$1; OUT=$2; UA="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Safari/537.36"; J=$(mktemp)
curl -s -m 20 -c $J -A "$UA" https://www.bilibili.com/ -o /dev/null
CID=$(curl -s -m 20 -b $J -A "$UA" -H "Referer: https://www.bilibili.com/" "https://api.bilibili.com/x/player/pagelist?bvid=$BV" | python3 -c "import json,sys;print(json.load(sys.stdin)['data'][0]['cid'])")
URL=$(curl -s -m 20 -b $J -A "$UA" -H "Referer: https://www.bilibili.com/video/$BV" "https://api.bilibili.com/x/player/playurl?bvid=$BV&cid=$CID&fnval=4048&fourk=1" | python3 -c "
import json,sys;d=json.load(sys.stdin)['data']['dash']
a=list(d.get('audio') or [])
if d.get('flac') and d['flac'].get('audio'): a.append(d['flac']['audio'])
if d.get('dolby') and d['dolby'].get('audio'): a+=d['dolby']['audio']
a.sort(key=lambda x:-x['bandwidth']); print(a[0]['baseUrl']); import sys as s; s.stderr.write('bw %d id %d\n'%(a[0]['bandwidth'],a[0]['id']))")
curl -s -m 300 -b $J -A "$UA" -H "Referer: https://www.bilibili.com/video/$BV" "$URL" -o "$OUT.tmp" && ffmpeg -v error -y -i "$OUT.tmp" -c copy "$OUT" 2>/dev/null || mv "$OUT.tmp" "$OUT.raw"
rm -f "$OUT.tmp"; ffprobe -v error -show_entries format=duration:stream=codec_name,bit_rate,sample_rate -of compact "$OUT" 2>&1 | head -3
rm -f "$J"  # anonymous session cookie jar only, no login
