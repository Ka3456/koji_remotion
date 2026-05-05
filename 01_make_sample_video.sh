#!/usr/bin/env bash
# pre_text から Remotion プレビューまで一発で完結する
#
# 使い方: PRE_TEXT の値を変更して bash 01_make_sample_video.sh を実行するだけ

set -euo pipefail

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
#  ここを変更するだけ！
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PRE_TEXT="0-1"
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

MODEL002_DIR="$(cd "$(dirname "$0")" && pwd)"
SCRIPT_MAKER_DIR="$MODEL002_DIR/script_maker"
PRETEXTS_DIR="$MODEL002_DIR/pretexts"
LOG_FILE="$MODEL002_DIR/make_sample_video.log"

# 引数があれば上書き
while [[ $# -gt 0 ]]; do
  case "$1" in
    -*)  echo "[警告] 不明なオプション: $1" >&2; shift ;;
    *)   PRE_TEXT="$1"; shift ;;
  esac
done

PRE_TEXT_FILE="$PRETEXTS_DIR/${PRE_TEXT}.txt"
TITLE="$PRE_TEXT"

if [[ ! -f "$PRE_TEXT_FILE" ]]; then
  echo "[エラー] ファイルが見つかりません: $PRE_TEXT_FILE" >&2
  exit 1
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  make_sample_video"
echo "    pre_text : $PRE_TEXT_FILE"
echo "    title    : $TITLE"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# ── Step 1: agent.py でスクリプト生成 ─────────────────────────────────────────
echo ""
echo "[Step 1/3] agent.py を実行してスクリプトを生成します…"
cd "$SCRIPT_MAKER_DIR"

rm -rf out
mkdir -p out

if [[ -f ".env" ]]; then
  set -a
  source ".env"
  set +a
fi

echo "---- agent $(date '+%Y-%m-%d %H:%M:%S') ----" | tee -a "$LOG_FILE"
PYTHONUNBUFFERED=1 python3 agent.py \
  --pretext "$PRE_TEXT_FILE" \
  --out "out/script.json" \
  --no-full \
  --no-research 2>&1 | tee -a "$LOG_FILE"

DEST_SCRIPT_DIR="$MODEL002_DIR/src/script/$TITLE"
mkdir -p "$DEST_SCRIPT_DIR"
cp "$SCRIPT_MAKER_DIR/out/script.json" "$DEST_SCRIPT_DIR/script.json"
echo "  → src/script/$TITLE/script.json 生成完了。"

# ── 02/03 の PRE_TEXT を揃える ────────────────────────────────────────────────
sed -i '' "s/^PRE_TEXT=.*/PRE_TEXT=\"$PRE_TEXT\"/" "$MODEL002_DIR/02_make_mp3.sh"
sed -i '' "s/^PRE_TEXT=.*/PRE_TEXT=\"$PRE_TEXT\"/" "$MODEL002_DIR/03_save_mp4.sh"
echo "  → 02_make_mp3.sh / 03_save_mp4.sh の PRE_TEXT を \"$PRE_TEXT\" に揃えました。"

# ── Step 2: scriptContent.ts を再生成 ─────────────────────────────────────────
echo ""
echo "[Step 2/3] scriptContent.ts を再生成します…"
cd "$MODEL002_DIR"

node scripts/convert_script.js --name "$TITLE"
rm -rf "$SCRIPT_MAKER_DIR/out"
node scripts/generate.js

echo "  → scriptContent.ts 更新完了。"

# ── Step 3: Remotion Studio 起動 ──────────────────────────────────────────────
echo ""
echo "[Step 3/3] Remotion Studio を起動します…"

EXISTING_PID=$(lsof -ti :3000 2>/dev/null || true)
if [[ -n "$EXISTING_PID" ]]; then
  echo "  → ポート 3000 を解放します (PID: $EXISTING_PID)…"
  kill "$EXISTING_PID" 2>/dev/null || true
  sleep 1
fi

(sleep 4 && open "http://localhost:3000") &

npm run dev &
STUDIO_PID=$!

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  完了！ http://localhost:3000 で確認してください"
echo "  Composition名: $TITLE"
echo "  停止するには Ctrl+C を押してください"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

wait $STUDIO_PID
