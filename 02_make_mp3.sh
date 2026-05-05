#!/usr/bin/env bash
# VOICEVOX でナレーション音声を生成する
#
# 使い方: PRE_TEXT と SPEAKER を変更して bash 02_make_mp3.sh を実行するだけ

set -euo pipefail

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
#  ここを変更するだけ！
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PRE_TEXT="0-1"
SPEAKER="12"
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

MODEL002_DIR="$(cd "$(dirname "$0")" && pwd)"
SCRIPT_MAKER_DIR="$MODEL002_DIR/script_maker"
VOICEBOX_DIR="$MODEL002_DIR/voicebox"

# 引数があれば上書き
while [[ $# -gt 0 ]]; do
  case "$1" in
    --speaker) SPEAKER="$2"; shift 2 ;;
    -*)        echo "[警告] 不明なオプション: $1" >&2; shift ;;
    *)         PRE_TEXT="$1"; shift ;;
  esac
done

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  make_mp3"
echo "    title   : $PRE_TEXT"
echo "    speaker : $SPEAKER"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# ── Step 1: Docker + VOICEVOX 起動 ────────────────────────────────────────────
echo ""
echo "[Step 1/3] Docker + VOICEVOX 起動チェック…"

if ! docker info > /dev/null 2>&1; then
  echo "  → Docker Desktop を起動します…"
  open -a Docker
  WAIT=0
  until docker info > /dev/null 2>&1; do
    if [[ $WAIT -ge 60 ]]; then
      echo "[エラー] Docker が 60 秒以内に起動しませんでした。" >&2
      exit 1
    fi
    sleep 3
    WAIT=$((WAIT + 3))
    echo "  … Docker 待機中 (${WAIT}s)"
  done
  echo "  → Docker 起動完了。"
else
  echo "  → Docker は既に起動中。"
fi

CONTAINER_RUNNING=$(docker ps --filter "name=voicevox" --filter "status=running" -q)
if [[ -z "$CONTAINER_RUNNING" ]]; then
  echo "  → VOICEVOX コンテナを起動します…"
  cd "$VOICEBOX_DIR"
  docker compose up -d 2>&1
  cd "$MODEL002_DIR"
else
  echo "  → VOICEVOX コンテナは既に起動中。"
fi

echo "  → VOICEVOX の準備を待機中…"
WAIT=0
until curl -sf "http://localhost:50021/version" > /dev/null 2>&1; do
  if [[ $WAIT -ge 90 ]]; then
    echo "[エラー] VOICEVOX が 90 秒以内に起動しませんでした。" >&2
    exit 1
  fi
  sleep 3
  WAIT=$((WAIT + 3))
done
echo "  → VOICEVOX 準備完了。"

# ── Step 2: 音声生成 ──────────────────────────────────────────────────────────
echo ""
echo "[Step 2/3] 音声を生成します…"
cd "$SCRIPT_MAKER_DIR"

if [[ -f ".env" ]]; then
  set -a
  source ".env"
  set +a
fi

VOICEBOX_URL="http://localhost:50021" \
python3 generate_narration.py \
  --video "$PRE_TEXT" \
  --speaker "$SPEAKER"

echo "  → 音声生成完了。"

# ── Step 3: scriptContent.ts を再生成して動画に反映 ───────────────────────────
echo ""
echo "[Step 3/3] scriptContent.ts を再生成します…"
cd "$MODEL002_DIR"

node scripts/generate.js

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  完了！音声が動画に反映されました。"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
