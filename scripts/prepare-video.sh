#!/usr/bin/env bash
# يجهّز فيديوهات حقيقية للسكرول: ضع المقاطع في media-src/ (بالترتيب: 01-*.mp4, 02-*.mp4 ...) ثم شغّل:
#   bash scripts/prepare-video.sh
# الناتج: public/media/tour.mp4 (ديسكتوب) و tour-m.mp4 (موبايل) و poster.jpg
set -euo pipefail
cd "$(dirname "$0")/.."
shopt -s nullglob; files=(media-src/*.mp4 media-src/*.mov media-src/*.webm)
[ ${#files[@]} -gt 0 ] || { echo "ضع مقاطع الفيديو داخل media-src/ أولاً"; exit 1; }
list=$(mktemp); for f in "${files[@]}"; do echo "file '$PWD/$f'" >> "$list"; done
enc() { # width height out crf
  ffmpeg -y -loglevel error -f concat -safe 0 -i "$list" -an \
    -vf "scale=$1:$2:force_original_aspect_ratio=increase,crop=$1:$2,fps=30,format=yuv420p" \
    -c:v libx264 -preset slow -crf "$4" -g 6 -keyint_min 6 -sc_threshold 0 -movflags +faststart "$3"
}
enc 1920 1080 public/media/tour.mp4 24
enc 720 1280 public/media/tour-m.mp4 26   # عمودي للموبايل
ffmpeg -y -loglevel error -i public/media/tour.mp4 -frames:v 1 -q:v 3 public/media/poster.jpg
ls -lh public/media
