#!/bin/bash
# Mixkit (商用利用無料) から医療・健康・運動・タバコ・酒・風景系の動画をダウンロード
# Mixkit License: https://mixkit.co/license/

DEST="/Users/kaise/Desktop/job/KaiTech/youtube-projects/video_maker/model002/public/assets/videos/medical"
mkdir -p "$DEST"

# [ID] [filename] [description]
declare -a VIDEOS=(
  "1563:medical_004:heart-rate-monitor"
  "4063:medical_005:running-exercise"
  "3994:medical_006:woman-jogging"
  "1149:medical_007:smoking-cigarette"
  "34563:medical_008:pouring-beer"
  "3573:medical_009:city-traffic-night"
  "1538:medical_010:tokyo-city-timelapse"
  "4367:medical_011:ocean-waves-aerial"
  "1567:medical_012:scientist-lab-work"
  "3703:medical_013:nature-mountain-landscape"
)

for entry in "${VIDEOS[@]}"; do
  IFS=':' read -r id filename desc <<< "$entry"
  url="https://assets.mixkit.co/videos/${id}/${id}-720.mp4"
  outpath="${DEST}/${filename}.mp4"

  if [ -f "$outpath" ]; then
    echo "✅ ${filename}.mp4 already exists, skipping"
    continue
  fi

  echo "⬇  Downloading ${filename}.mp4 (${desc})..."
  curl -L -s -o "$outpath" "$url"

  if [ $? -eq 0 ] && [ -s "$outpath" ]; then
    size=$(du -h "$outpath" | cut -f1)
    echo "   ✅ Done (${size})"
  else
    echo "   ⚠  Failed or empty file, removing"
    rm -f "$outpath"
  fi
done

echo ""
echo "📁 Saved to: ${DEST}"
ls -lh "${DEST}"/medical_*.mp4
