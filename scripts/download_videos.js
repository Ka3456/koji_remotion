#!/usr/bin/env node
// download_videos.js
// Pexels API から医療系の短い動画を自動ダウンロードし
// public/assets/videos/medical/ に保存する。
//
// 使い方:
//   PEXELS_API_KEY=xxxxxx node scripts/download_videos.js
//   or
//   echo "PEXELS_API_KEY=xxxxxx" > .env  (then run without env var)

const { createClient } = require("pexels");
const fs = require("fs");
const path = require("path");
const https = require("https");
const http = require("http");

const DEST_DIR = path.join(__dirname, "../public/assets/videos/medical");

const KEYWORDS = [
  "medical",
  "hospital",
  "doctor",
  "surgery",
  "health",
  "anatomy",
  "heartbeat",
  "medicine",
  "dna",
  "blood cells",
  "stethoscope",
  "laboratory",
  "microscope",
  "pharmacy",
];

const VIDEOS_PER_KEYWORD = 2;
const MAX_DURATION_SECONDS = 15;

function loadEnv() {
  const envPath = path.join(__dirname, "../.env");
  if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, "utf-8").split("\n");
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eqIdx = trimmed.indexOf("=");
      if (eqIdx > 0) {
        const key = trimmed.slice(0, eqIdx).trim();
        const val = trimmed.slice(eqIdx + 1).trim();
        if (!process.env[key]) process.env[key] = val;
      }
    }
  }
}

function downloadFile(url, destPath) {
  return new Promise((resolve, reject) => {
    const proto = url.startsWith("https") ? https : http;
    proto.get(url, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return downloadFile(res.headers.location, destPath).then(resolve, reject);
      }
      if (res.statusCode !== 200) {
        return reject(new Error(`HTTP ${res.statusCode} for ${url}`));
      }
      const ws = fs.createWriteStream(destPath);
      res.pipe(ws);
      ws.on("finish", () => ws.close(resolve));
      ws.on("error", reject);
    }).on("error", reject);
  });
}

function pickBestVideoFile(videoFiles) {
  const sdFile = videoFiles.find(
    (f) => f.quality === "sd" && f.width && f.width <= 1920,
  );
  if (sdFile) return sdFile;

  const hdFile = videoFiles.find(
    (f) => f.quality === "hd" && f.width && f.width <= 1920,
  );
  if (hdFile) return hdFile;

  return videoFiles[0];
}

async function main() {
  loadEnv();

  const apiKey = process.env.PEXELS_API_KEY;
  if (!apiKey) {
    console.error(
      "エラー: PEXELS_API_KEY が設定されていません。\n" +
        "  PEXELS_API_KEY=xxxxx node scripts/download_videos.js\n" +
        "  または .env ファイルに PEXELS_API_KEY=xxxxx を記載してください。",
    );
    process.exit(1);
  }

  const client = createClient(apiKey);
  fs.mkdirSync(DEST_DIR, { recursive: true });

  const manifest = [];
  let fileIndex = 1;
  const seenIds = new Set();

  for (const keyword of KEYWORDS) {
    console.log(`\n🔍 キーワード: "${keyword}"`);

    let results;
    try {
      results = await client.videos.search({
        query: keyword,
        per_page: VIDEOS_PER_KEYWORD * 3,
        size: "medium",
      });
    } catch (err) {
      console.warn(`  ⚠ 検索エラー: ${err.message}`);
      continue;
    }

    if (!results || !results.videos || results.videos.length === 0) {
      console.log("  動画が見つかりませんでした");
      continue;
    }

    let downloaded = 0;
    for (const video of results.videos) {
      if (downloaded >= VIDEOS_PER_KEYWORD) break;
      if (seenIds.has(video.id)) continue;
      if (video.duration > MAX_DURATION_SECONDS) continue;

      const bestFile = pickBestVideoFile(video.video_files);
      if (!bestFile || !bestFile.link) continue;

      const filename = `medical_${String(fileIndex).padStart(3, "0")}.mp4`;
      const destPath = path.join(DEST_DIR, filename);

      console.log(
        `  ⬇ ${filename} (${video.duration}s, ${bestFile.width}x${bestFile.height}) — ${video.url}`,
      );

      try {
        await downloadFile(bestFile.link, destPath);
        seenIds.add(video.id);
        manifest.push({
          filename,
          pexelsId: video.id,
          pexelsUrl: video.url,
          duration: video.duration,
          width: bestFile.width,
          height: bestFile.height,
          keyword,
          photographer: video.user?.name || "Unknown",
          photographerUrl: video.user?.url || "",
          license: "Pexels License (commercial use allowed)",
        });
        fileIndex++;
        downloaded++;
      } catch (err) {
        console.warn(`  ⚠ ダウンロード失敗: ${err.message}`);
      }
    }
  }

  const manifestPath = path.join(DEST_DIR, "videos_manifest.json");
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), "utf-8");

  console.log(`\n✅ 完了: ${manifest.length} 本の動画をダウンロードしました`);
  console.log(`📁 保存先: ${DEST_DIR}`);
  console.log(`📋 マニフェスト: ${manifestPath}`);
}

main().catch((err) => {
  console.error("致命的エラー:", err);
  process.exit(1);
});
