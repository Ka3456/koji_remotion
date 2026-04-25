"""
Voicebox (VOICEVOX) API で script.json のナレーションから音声（WAV）を生成する。

前提:
- Voicebox サーバーを起動しておく: docker compose up -d && node app.js
- http://localhost:8000 で POST /synthesize が利用できること
"""

import os
import re
import math
import argparse
import json
import time
from pathlib import Path
import subprocess
import requests

# Paths
current_dir = Path(__file__).parent.absolute()
SCRIPT_JSON_PATH = current_dir / "out" / "script.json"
OUTPUT_DIR = current_dir / "out" / "narration"
RUN_LOG_PATH = current_dir / "run.log"

# VOICEVOX API（環境変数で上書き可）
VOICEBOX_URL = os.getenv("VOICEBOX_URL", "http://localhost:50021")
DEFAULT_SPEAKER = int(os.getenv("VOICEBOX_SPEAKER", "13"))  # 青山龍星・ノーマル


def log_message(message: str) -> None:
    with open(RUN_LOG_PATH, "a", encoding="utf-8") as f:
        f.write(message + "\n")


def get_audio_duration(file_path: Path) -> float | None:
    """ffprobe で音声長（秒）を取得"""
    cmd = [
        "ffprobe", "-v", "error", "-show_entries", "format=duration",
        "-of", "default=noprint_wrappers=1:nokey=1", str(file_path)
    ]
    try:
        result = subprocess.run(cmd, capture_output=True, text=True, check=True)
        return float(result.stdout.strip())
    except Exception as e:
        print(f"Error getting duration for {file_path}: {e}")
        return None


def clean_text_for_speech(text: str) -> str:
    """TTS 用にテキストを整形"""
    text = re.sub(r"\*\*([^*]+)\*\*", r"\1", text)
    text = text.replace("*", "")
    if text.startswith("「") and text.endswith("」"):
        text = text[1:-1]
    text = text.replace(" → ", "、つまり")
    if text and not text.endswith(("。", "！", "？", "ー", "）", "』", "!", "?")):
        text += "。"
    return text


MAX_RETRIES = 3
RETRY_BASE_DELAY = 5  # seconds


def synthesize_with_voicebox(
    text: str,
    output_path: Path,
    *,
    speaker: int = DEFAULT_SPEAKER,
    base_url: str = VOICEBOX_URL,
) -> None:
    """
    VOICEVOX エンジン API を直接呼び出して音声合成する。
    Step 1: POST /audio_query  → クエリ JSON を取得
    Step 2: POST /synthesis    → WAV バイナリを取得して output_path に保存
    接続エラー時は指数バックオフでリトライする。
    """
    base = base_url.rstrip("/")

    for attempt in range(1, MAX_RETRIES + 1):
        try:
            r1 = requests.post(
                f"{base}/audio_query",
                params={"text": text, "speaker": speaker},
                timeout=30,
            )
            if r1.status_code != 200:
                raise RuntimeError(f"audio_query failed {r1.status_code}: {r1.text}")

            r2 = requests.post(
                f"{base}/synthesis",
                params={"speaker": speaker},
                headers={"Content-Type": "application/json"},
                data=r1.text,
                timeout=120,
            )
            if r2.status_code != 200:
                raise RuntimeError(f"synthesis failed {r2.status_code}: {r2.text}")

            output_path.write_bytes(r2.content)
            return
        except (requests.ConnectionError, ConnectionResetError, ConnectionAbortedError) as e:
            if attempt == MAX_RETRIES:
                raise
            delay = RETRY_BASE_DELAY * (2 ** (attempt - 1))
            print(f"  Connection error (attempt {attempt}/{MAX_RETRIES}), retrying in {delay}s...")
            time.sleep(delay)


def process_script(
    target_slide_number: int | None = None,
    speaker: int = DEFAULT_SPEAKER,
) -> None:
    """
    script.json を読み、各スライドのナレーションを Voicebox で音声化し、
    out/narration/long_scene_{N}.wav に保存。秒数と audioFile を script.json に書き戻す。
    """
    if not SCRIPT_JSON_PATH.exists():
        log_message(f"Error: {SCRIPT_JSON_PATH} not found.")
        print(f"Error: {SCRIPT_JSON_PATH} not found. Check run.log for details.")
        return

    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    with open(SCRIPT_JSON_PATH, "r", encoding="utf-8") as f:
        data = json.load(f)

    slides = data.get("slides", [])
    if not slides:
        log_message("Error: No slides found in script.json")
        print("Error: No slides found in script.json")
        return

    updated = False
    processed_count = 0
    for slide in slides:
        slide_number = slide.get("slideNumber", 0)
        if target_slide_number is not None and slide_number != target_slide_number:
            continue

        narration_text = (slide.get("narration") or "").strip()
        if not narration_text:
            print(f"Skipping slide {slide_number}: No narration text")
            continue

        clean_text = clean_text_for_speech(narration_text)
        audio_filename = f"long_scene_{slide_number}.wav"
        audio_path = OUTPUT_DIR / audio_filename

        if processed_count > 0:
            time.sleep(2)

        print(f"Generating audio for slide {slide_number}: {clean_text[:50]}...")
        try:
            synthesize_with_voicebox(clean_text, audio_path, speaker=speaker)
            log_message(f"Successfully saved audio to {audio_path}")

            duration = get_audio_duration(audio_path)
            if duration is not None:
                duration_int = math.ceil(duration)
                print(f"  Duration: {duration:.2f}s -> {duration_int}s")
                slide["seconds"] = duration_int
            else:
                slide["seconds"] = 0
            slide["audioFile"] = audio_filename
            updated = True
            processed_count += 1
        except Exception as e:
            print(f"  Failed to process slide {slide_number}: {e}")
            log_message(f"Failed to process slide {slide_number}: {e}")

    if updated:
        with open(SCRIPT_JSON_PATH, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        print(f"\nSuccessfully updated {SCRIPT_JSON_PATH}")
    else:
        print("\nNo slides were processed")


if __name__ == "__main__":
    try:
        parser = argparse.ArgumentParser(
            description="Generate narration WAV via Voicebox (VOICEVOX) API"
        )
        parser.add_argument(
            "--slide", type=int,
            help="Generate audio for this slide number only.",
        )
        parser.add_argument(
            "--speaker", type=int, default=DEFAULT_SPEAKER,
            help=f"VOICEVOX speaker ID (default: {DEFAULT_SPEAKER} = 青山龍星・ノーマル)",
        )
        args = parser.parse_args()
        process_script(target_slide_number=args.slide, speaker=args.speaker)
    except Exception as e:
        log_message(f"Unhandled error: {e}")
        print("An error occurred. Check run.log for details.")
