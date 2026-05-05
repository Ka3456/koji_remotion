const fs = require("fs");
const path = require("path");

const scriptDir = path.join(__dirname, "../src/script");
const outputPath = path.join(__dirname, "../src/scriptContent.ts");

function main() {
  const entries = fs.readdirSync(scriptDir, { withFileTypes: true });
  const videoDirs = entries
    .filter((e) => e.isDirectory())
    .map((e) => e.name);

  if (videoDirs.length === 0) {
    console.error("Error: src/script/ に動画フォルダが見つかりません");
    process.exit(1);
  }

  console.log(`${videoDirs.length} 本の動画を検出: ${videoDirs.join(", ")}\n`);

  const allFormats = new Set();
  const videos = {};

  for (const dir of videoDirs) {
    const jsonPath = path.join(scriptDir, dir, "script.json");
    if (!fs.existsSync(jsonPath)) {
      console.warn(`  ${dir}/script.json が見つかりません → スキップ`);
      continue;
    }


    const scriptData = JSON.parse(fs.readFileSync(jsonPath, "utf-8"));

    console.log(`【${dir}】`);
    for (const slide of scriptData.slides) {
      if (!slide.format) {
        slide.format = "format01";
      }
      allFormats.add(slide.format);

      const seconds = slide.seconds || 8;
      if (!slide.seconds) slide.seconds = seconds;

      console.log(
        `  スライド ${slide.slideNumber}: format=${slide.format}, ${seconds}秒, title="${slide.title || ""}"`,
      );
    }

    const totalSeconds = scriptData.slides.reduce(
      (sum, s) => sum + (s.seconds || 8),
      0,
    );
    console.log(
      `  全 ${scriptData.slides.length} スライド（合計: ${totalSeconds}秒）\n`,
    );

    videos[dir] = scriptData;

    const srcAssets = path.join(scriptDir, dir, "assets");
    const destAssets = path.join(__dirname, `../public/script/${dir}/assets`);
    if (fs.existsSync(srcAssets)) {
      fs.cpSync(srcAssets, destAssets, { recursive: true });
      console.log(
        `  ${dir}/assets/ → public/script/${dir}/assets/ にコピー完了`,
      );
    }

    const srcNarration = path.join(scriptDir, dir, "narration");
    const destNarration = path.join(__dirname, `../public/script/${dir}/narration`);
    if (fs.existsSync(srcNarration)) {
      fs.cpSync(srcNarration, destNarration, { recursive: true });
      console.log(
        `  ${dir}/narration/ → public/script/${dir}/narration/ にコピー完了`,
      );
    }
  }

  console.log(`\n使用フォーマット: ${[...allFormats].join(", ")}`);

  const templateImports = [...allFormats]
    .map((f) => `import { ${capitalize(f)} } from "./template/${f}";`)
    .join("\n");

  const templateMap = [...allFormats]
    .map((f) => `  ${f}: ${capitalize(f)},`)
    .join("\n");

  const videosJson = JSON.stringify(videos, null, 2);

  const output = `// このファイルは自動生成されます。直接編集しないでください。
// src/script/<動画名>/script.json を編集して npm run generate を実行してください。

${templateImports}

export const TEMPLATE_MAP: Record<string, React.FC<any>> = {
${templateMap}
};

export const VIDEOS: Record<string, { slides: any[] }> = ${videosJson};

export const VIDEO_NAMES = ${JSON.stringify(videoDirs)} as const;
`;

  fs.writeFileSync(outputPath, output, "utf-8");
  console.log("\nsrc/scriptContent.ts を生成しました");
}

function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

try {
  main();
} catch (error) {
  console.error("エラー:", error);
  process.exit(1);
}
