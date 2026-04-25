#!/usr/bin/env bash
# make_sample_video.sh — pre_text から Remotion プレビューまで一発で完結する
#
# 使い方: PRE_TEXT の値を変更して bash make_sample_video.sh を実行するだけ

set -euo pipefail

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
#  ここを変更するだけ！
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PRE_TEXT="1-1"
SPEAKER="13"
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

MODEL002_DIR="$(cd "$(dirname "$0")" && pwd)"
SCRIPT_MAKER_DIR="$MODEL002_DIR/script_maker"
VOICEBOX_DIR="$MODEL002_DIR/voicebox"
PRETEXTS_DIR="$MODEL002_DIR/pretexts"
LOG_FILE="$MODEL002_DIR/make_sample_video.log"

# 引数があれば上書き
while [[ $# -gt 0 ]]; do
  case "$1" in
    --speaker) SPEAKER="$2"; shift 2 ;;
    -*)        echo "[警告] 不明なオプション: $1" >&2; shift ;;
    *)         PRE_TEXT="$1"; shift ;;
  esac
done

PRE_TEXT_FILE="$PRETEXTS_DIR/${PRE_TEXT}.txt"

if [[ ! -f "$PRE_TEXT_FILE" ]]; then
  echo "[エラー] ファイルが見つかりません: $PRE_TEXT_FILE" >&2
  exit 1
fi

# ── タイトル自動抽出 ─────────────────────────────────────────────────────────
# pretext は CP932 のため grep で # 行を取ると文字化けする。
# シンプルに PRE_TEXT (例: 1-1) をディレクトリ名として使う。
TITLE="$PRE_TEXT"
if [[ -z "$TITLE" ]]; then
  TITLE="Main"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  make_sample_video"
echo "    pre_text : $PRE_TEXT_FILE"
echo "    title    : $TITLE"
echo "    speaker  : $SPEAKER"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# ── Step 1: Docker + VOICEVOX ─────────────────────────────────────────────────
echo ""
echo "[Step 1/6] Docker + VOICEVOX 起動チェック…"

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

# ── Step 2: agent.py でスクリプト生成 ─────────────────────────────────────────
echo ""
echo "[Step 2/6] agent.py を実行してスクリプトを生成します…"
cd "$SCRIPT_MAKER_DIR"

rm -rf out
mkdir -p out

# 仮想環境 koji-youtube-env を有効化
VENV_DIR="$MODEL002_DIR/koji-youtube-env"
if [[ -f "$VENV_DIR/bin/activate" ]]; then
  # shellcheck disable=SC1091
  source "$VENV_DIR/bin/activate"
  echo "  → venv 有効化: $VENV_DIR"
else
  echo "[警告] venv が見つかりません: $VENV_DIR (システム python を使います)" >&2
fi

if [[ -f ".env" ]]; then
  set -a
  source ".env"
  set +a
fi

echo "---- agent $(date '+%Y-%m-%d %H:%M:%S') ----" | tee -a "$LOG_FILE"
PYTHONUNBUFFERED=1 python agent.py \
  --pretext "$PRE_TEXT_FILE" \
  --out "out/script.json" \
  --full \
  --no-research 2>&1 | tee -a "$LOG_FILE"

echo "  → script.json 生成完了。"

# ── Step 3: 音声生成（一時的にスキップ） ───────────────────────────────────────
echo ""
echo "[Step 3/6] 音声生成をスキップします（臨時）…"
# VOICEBOX_URL="http://localhost:50021" \
# VOICEBOX_SPEAKER="$SPEAKER" \
# python generate_narration.py
echo "  → スキップ完了。"

# ── Step 4: convert_script.js でフォーマット変換 + アセット配置 ────────────────
echo ""
echo "[Step 4/6] スクリプトを model002 形式に変換・配置します…"
cd "$MODEL002_DIR"

node scripts/convert_script.js --name "$TITLE"

echo "  → src/script/$TITLE/ に配置完了。"

# ── Step 5: generate.js で scriptContent.ts を再生成 ──────────────────────────
echo ""
echo "[Step 5/6] scriptContent.ts を再生成します…"

node scripts/generate.js

echo "  → scriptContent.ts 更新完了。"

# ── Step 6: Remotion Studio 起動 ──────────────────────────────────────────────
echo ""
echo "[Step 6/6] Remotion Studio を起動します…"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  完了！ http://localhost:3000 で確認してください"
echo "  Composition名: $TITLE"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

npx remotion studio
