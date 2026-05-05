#!/usr/bin/env bash
# Remotion で MP4 を書き出す
#
# 使い方: PRE_TEXT を変更して bash 03_save_mp4.sh を実行するだけ

set -euo pipefail

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
#  ここを変更するだけ！
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PRE_TEXT="0-1"
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

MODEL002_DIR="$(cd "$(dirname "$0")" && pwd)"

# 引数があれば上書き
while [[ $# -gt 0 ]]; do
  case "$1" in
    -*) echo "[警告] 不明なオプション: $1" >&2; shift ;;
    *)  PRE_TEXT="$1"; shift ;;
  esac
done

OUTPUT="$MODEL002_DIR/out/${PRE_TEXT}.mp4"
mkdir -p "$MODEL002_DIR/out"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  save_mp4"
echo "    composition : $PRE_TEXT"
echo "    output      : $OUTPUT"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

cd "$MODEL002_DIR"
npx remotion render "$PRE_TEXT" "$OUTPUT"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  完了！ $OUTPUT"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
