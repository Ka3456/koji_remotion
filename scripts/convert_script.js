#!/usr/bin/env node
// convert_script.js
// script_maker の out/script.json + out/narration/*.wav を
// model002 の src/script/<name>/ へ変換・コピーする。
//
// 使い方: node scripts/convert_script.js --name Main

const fs = require("fs");
const path = require("path");

// ── パス定数 ──────────────────────────────────────────────────────────────────
const MODEL002_DIR = path.join(__dirname, "..");
const SCRIPT_MAKER_DIR = path.join(MODEL002_DIR, "script_maker");

// ── 引数パース ────────────────────────────────────────────────────────────────
let NAME = "Main";
const args = process.argv.slice(2);
for (let i = 0; i < args.length; i++) {
  if (args[i] === "--name" && args[i + 1]) {
    NAME = args[i + 1];
    i++;
  }
}

// ── フォーマットマッピング ────────────────────────────────────────────────────
// agent.py が model002 のフォーマット名を直接出力するため、パススルー
function mapFormat(fmt) {
  return fmt;
}

// ── 不要フィールドの除去 ───────────────────────────────────────────────────────
const STRIP_FIELDS = [
  "showDoctor",
  "doctorImage",
  "showPatient",
  "patientImages",
  "organ",
  "isTitleCard",
];

// ── メイン処理 ────────────────────────────────────────────────────────────────
function main() {
  const srcJsonPath = path.join(SCRIPT_MAKER_DIR, "out", "script.json");
  const narrationDir = path.join(SCRIPT_MAKER_DIR, "out", "narration");

  if (!fs.existsSync(srcJsonPath)) {
    console.error(`[エラー] script.json が見つかりません: ${srcJsonPath}`);
    process.exit(1);
  }

  const raw = fs.readFileSync(srcJsonPath, "utf-8");
  const data = JSON.parse(raw);

  const destScriptDir = path.join(MODEL002_DIR, "src", "script", NAME);
  const destAssetsDir = path.join(destScriptDir, "assets", "narration");

  fs.mkdirSync(destScriptDir, { recursive: true });
  fs.mkdirSync(destAssetsDir, { recursive: true });

  // ── 音声ファイルをコピー ──────────────────────────────────────────────────
  let copiedAudio = 0;
  if (fs.existsSync(narrationDir)) {
    const wavFiles = fs.readdirSync(narrationDir).filter((f) => f.endsWith(".wav"));
    for (const wav of wavFiles) {
      fs.copyFileSync(
        path.join(narrationDir, wav),
        path.join(destAssetsDir, wav)
      );
      copiedAudio++;
    }
    console.log(`  音声ファイルをコピーしました: ${copiedAudio} 件 → assets/narration/`);
  } else {
    console.log("  [情報] narration ディレクトリが存在しません。音声なしで続行します。");
  }

  // ── スライドを変換 ────────────────────────────────────────────────────────
  const convertedSlides = data.slides.map((slide, index) => {
    const originalFormat = slide.format || "format03";
    const newFormat = mapFormat(originalFormat);

    const converted = { ...slide, format: newFormat };

    // audioFile パスを model002 の staticFile() で参照できる形式に更新
    if (converted.audioFile) {
      const filename = path.basename(converted.audioFile);
      converted.audioFile = `script/${NAME}/assets/narration/${filename}`;
    }

    // 不要フィールドの除去
    for (const field of STRIP_FIELDS) {
      delete converted[field];
    }

    return converted;
  });

  const output = { slides: convertedSlides };

  const destJsonPath = path.join(destScriptDir, "script.json");
  fs.writeFileSync(destJsonPath, JSON.stringify(output, null, 2), "utf-8");

  console.log(`  変換完了: ${destJsonPath}`);
  console.log(`  スライド数: ${convertedSlides.length}`);

  // フォーマット使用状況の表示
  const formatCounts = {};
  for (const s of convertedSlides) {
    formatCounts[s.format] = (formatCounts[s.format] || 0) + 1;
  }
  console.log(
    "  使用フォーマット: " +
      Object.entries(formatCounts)
        .map(([f, n]) => `${f}×${n}`)
        .join(", ")
  );
}

try {
  main();
} catch (err) {
  console.error("[エラー]", err.message);
  process.exit(1);
}
