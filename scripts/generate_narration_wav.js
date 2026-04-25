/**
 * 指定スライドだけナレーション WAV を VOICEVOX で強制再生成する CLI。
 *
 * 普段のフロー:
 *   - `npm run generate` … 既存 WAV を script.json に紐づけるだけ（合成しない）
 *   - `npm run generate:voice` … 不足分を VOICEVOX で合成してから上記と同様に反映
 *
 * 使い方:
 *   node scripts/generate_narration_wav.js <動画フォルダ名> <slideNumber> [<slideNumber> ...]
 *
 * 例:
 *   node scripts/generate_narration_wav.js 1_地中海食とは 54 63
 *   NARRATION_FORCE=1 node scripts/generate_narration_wav.js 1_地中海食とは 54
 */
const fs = require("fs");
const path = require("path");
const { syncNarrationAudio } = require("./narration_synthesis");

const MODEL002_DIR = path.join(__dirname, "..");

async function main() {
  const dirName = process.argv[2];
  const slideArgs = process.argv.slice(3).map((s) => parseInt(s, 10));
  if (!dirName || slideArgs.length === 0 || slideArgs.some((n) => Number.isNaN(n))) {
    console.error(
      "使い方: node scripts/generate_narration_wav.js <動画フォルダ名> <slideNumber> [...]",
    );
    process.exit(1);
  }

  const jsonPath = path.join(MODEL002_DIR, "src", "script", dirName, "script.json");
  if (!fs.existsSync(jsonPath)) {
    console.error(`script.json が見つかりません: ${jsonPath}`);
    process.exit(1);
  }

  const scriptData = JSON.parse(fs.readFileSync(jsonPath, "utf-8"));
  const r = await syncNarrationAudio({
    modelRoot: MODEL002_DIR,
    dirName,
    scriptData,
    jsonPath,
    onlySlideNumbers: slideArgs,
    force: true,
    enableSynth: true,
  });

  if (r.errors.length) {
    process.exit(1);
  }
  console.log(`\n完了: 生成 ${r.generated} 件`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
