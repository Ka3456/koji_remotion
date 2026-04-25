/**
 * ナレーション WAV と script.json の audioFile / seconds を同期する。
 * generate.js と generate_narration_wav.js から利用。
 *
 * 既定（npm run generate）:
 *   既存の long_scene_<番号>.wav のみ参照し、audioFile / seconds を整える。VOICEVOX は呼ばない。
 * 合成モード:
 *   環境変数 NARRATION_SYNTH=1、または opts.enableSynth === true（CLI）のときだけ VOICEVOX で不足分を合成。
 *
 * 環境変数:
 *   VOICEVOX_URL / VOICEVOX_SPEAKER  合成時のみ使用
 *   SKIP_NARRATION=1                 ナレーション処理をすべてスキップ
 *   NARRATION_FORCE=1                合成時、既存 WAV も上書き再合成
 */
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const axios = require("axios");
const { execSync } = require("child_process");

function hashNarrationText(cleanText) {
  return crypto.createHash("sha256").update(cleanText, "utf8").digest("hex");
}

function cleanTextForSpeech(text) {
  let t = String(text).replace(/\*\*([^*]+)\*\*/g, "$1").replace(/\*/g, "");
  t = t.replace(/ → /g, "、つまり");
  if (t && !/[。！？』）!?]$/.test(t)) {
    t += "。";
  }
  return t.trim();
}

function getAudioDurationSeconds(filePath) {
  try {
    const out = execSync(
      [
        "ffprobe",
        "-v",
        "error",
        "-show_entries",
        "format=duration",
        "-of",
        "default=noprint_wrappers=1:nokey=1",
        filePath,
      ].join(" "),
      { encoding: "utf-8" },
    ).trim();
    return parseFloat(out, 10);
  } catch {
    return null;
  }
}

async function checkVoicevox(baseUrl) {
  try {
    const r = await axios.get(`${baseUrl}/version`, { timeout: 3000 });
    return r.status === 200;
  } catch {
    return false;
  }
}

async function synthesizeWav(baseUrl, speaker, text, outPath) {
  const r1 = await axios.post(`${baseUrl}/audio_query`, null, {
    params: { text, speaker },
    timeout: 60_000,
  });
  if (r1.status !== 200) {
    throw new Error(`audio_query failed: ${r1.status}`);
  }
  const r2 = await axios.post(`${baseUrl}/synthesis`, r1.data, {
    params: { speaker },
    headers: { "Content-Type": "application/json" },
    responseType: "arraybuffer",
    timeout: 120_000,
  });
  if (r2.status !== 200) {
    throw new Error(`synthesis failed: ${r2.status}`);
  }
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, Buffer.from(r2.data));
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

/**
 * @param {object} opts
 * @param {boolean} [opts.enableSynth] true のとき VOICEVOX で不足分を合成（CLI 用）。未指定時は NARRATION_SYNTH=1 のみ合成。
 */
async function syncNarrationAudio(opts) {
  const {
    modelRoot,
    dirName,
    scriptData,
    jsonPath,
    onlySlideNumbers = null,
    force = false,
    enableSynth: enableSynthOpt,
  } = opts;

  const result = {
    wroteJson: false,
    generated: 0,
    skipped: 0,
    errors: [],
  };

  if (process.env.SKIP_NARRATION === "1") {
    console.log(`  [ナレーション] SKIP_NARRATION=1 のためナレーション処理をスキップ`);
    return result;
  }

  const enableSynth =
    enableSynthOpt === true || process.env.NARRATION_SYNTH === "1";

  const baseUrl = (process.env.VOICEVOX_URL || "http://localhost:50021").replace(
    /\/$/,
    "",
  );
  const speaker = parseInt(process.env.VOICEVOX_SPEAKER || "13", 10);
  const forceAll = force || process.env.NARRATION_FORCE === "1";

  const cachePath = path.join(
    modelRoot,
    "src",
    "script",
    dirName,
    "assets",
    "narration",
    ".narration-cache.json",
  );
  let hashCache = {};
  try {
    if (fs.existsSync(cachePath)) {
      hashCache = JSON.parse(fs.readFileSync(cachePath, "utf-8"));
    }
  } catch {
    hashCache = {};
  }
  let cacheDirty = false;

  const slides = scriptData.slides || [];

  if (!fs.existsSync(cachePath)) {
    for (const slide of slides) {
      const raw = (slide.narration || "").trim();
      if (!raw || slide.skipNarrationTts === true) continue;
      const clean = cleanTextForSpeech(raw);
      hashCache[String(slide.slideNumber)] = hashNarrationText(clean);
    }
    if (Object.keys(hashCache).length > 0) {
      cacheDirty = true;
    } else {
      fs.mkdirSync(path.dirname(cachePath), { recursive: true });
      fs.writeFileSync(cachePath, "{}\n", "utf-8");
    }
  }

  const onlySet =
    onlySlideNumbers && onlySlideNumbers.length
      ? new Set(onlySlideNumbers)
      : null;

  let needWrite = false;
  let generated = 0;

  function slidePaths(slide) {
    const sn = slide.slideNumber;
    const expectedName = `long_scene_${sn}.wav`;
    const expectedAudioFile = `script/${dirName}/assets/narration/${expectedName}`;
    const wavPath = path.join(
      modelRoot,
      "src",
      "script",
      dirName,
      "assets",
      "narration",
      expectedName,
    );
    return { sn, expectedName, expectedAudioFile, wavPath };
  }

  function wavReadable(wavPath) {
    try {
      fs.accessSync(wavPath, fs.constants.R_OK);
      return true;
    } catch {
      return false;
    }
  }

  /** 既存 WAV のみ script.json に紐づけ（VOICEVOX なし） */
  function runLinkOnly() {
    for (let i = 0; i < slides.length; i++) {
      const slide = slides[i];
      const { sn, expectedName, expectedAudioFile, wavPath } = slidePaths(slide);
      if (onlySet && !onlySet.has(sn)) continue;

      const raw = (slide.narration || "").trim();
      if (!onlySet && raw && slide.skipNarrationTts === true) {
        continue;
      }

      if (!raw) {
        if (slide.audioFile) {
          delete slide.audioFile;
          needWrite = true;
        }
        if (hashCache[String(sn)] != null) {
          delete hashCache[String(sn)];
          cacheDirty = true;
        }
        continue;
      }

      const wavExists = wavReadable(wavPath);
      const clean = cleanTextForSpeech(raw);
      const h = hashNarrationText(clean);

      if (wavExists) {
        if (!slide.audioFile || slide.audioFile !== expectedAudioFile) {
          slide.audioFile = expectedAudioFile;
          needWrite = true;
        }
        const dur = getAudioDurationSeconds(wavPath);
        if (dur != null) {
          const sec = Math.ceil(dur);
          if (slide.seconds !== sec) {
            slide.seconds = sec;
            needWrite = true;
          }
        }
        if (hashCache[String(sn)] !== h) {
          hashCache[String(sn)] = h;
          cacheDirty = true;
        }
        result.skipped++;
      } else {
        const af = slide.audioFile;
        if (
          af &&
          (af === expectedAudioFile || af.endsWith(expectedName))
        ) {
          delete slide.audioFile;
          needWrite = true;
        }
        if (hashCache[String(sn)] != null) {
          delete hashCache[String(sn)];
          cacheDirty = true;
        }
      }
    }
  }

  if (!enableSynth) {
    runLinkOnly();
    if (needWrite) {
      fs.writeFileSync(jsonPath, JSON.stringify(scriptData, null, 2) + "\n", "utf-8");
      result.wroteJson = true;
    }
    if (cacheDirty) {
      fs.mkdirSync(path.dirname(cachePath), { recursive: true });
      fs.writeFileSync(cachePath, JSON.stringify(hashCache, null, 2) + "\n", "utf-8");
    }
    return result;
  }

  const online = await checkVoicevox(baseUrl);
  if (!online) {
    console.warn(
      `  [ナレーション] VOICEVOX に接続できません (${baseUrl})。合成はスキップし、既存 WAV のリンクのみ行います。`,
    );
    runLinkOnly();
    if (needWrite) {
      fs.writeFileSync(jsonPath, JSON.stringify(scriptData, null, 2) + "\n", "utf-8");
      result.wroteJson = true;
    }
    if (cacheDirty) {
      fs.mkdirSync(path.dirname(cachePath), { recursive: true });
      fs.writeFileSync(cachePath, JSON.stringify(hashCache, null, 2) + "\n", "utf-8");
    }
    return result;
  }

  for (let i = 0; i < slides.length; i++) {
    const slide = slides[i];
    const { sn, expectedName, expectedAudioFile, wavPath } = slidePaths(slide);
    if (onlySet && !onlySet.has(sn)) continue;

    const raw = (slide.narration || "").trim();

    if (!onlySet && raw && slide.skipNarrationTts === true) {
      continue;
    }

    if (!raw) {
      if (slide.audioFile) {
        delete slide.audioFile;
        needWrite = true;
      }
      if (hashCache[String(sn)] != null) {
        delete hashCache[String(sn)];
        cacheDirty = true;
      }
      continue;
    }

    const wavExists = wavReadable(wavPath);
    const clean = cleanTextForSpeech(raw);
    const h = hashNarrationText(clean);
    const audioMismatch = slide.audioFile && slide.audioFile !== expectedAudioFile;
    const textChanged = hashCache[String(sn)] !== h;

    if (wavExists && !forceAll) {
      if (!slide.audioFile || slide.audioFile !== expectedAudioFile) {
        slide.audioFile = expectedAudioFile;
        needWrite = true;
      }
      const dur = getAudioDurationSeconds(wavPath);
      if (dur != null) {
        const sec = Math.ceil(dur);
        if (slide.seconds !== sec) {
          slide.seconds = sec;
          needWrite = true;
        }
      }
      if (hashCache[String(sn)] !== h) {
        hashCache[String(sn)] = h;
        cacheDirty = true;
      }
      result.skipped++;
      continue;
    }

    const needGenerate = forceAll || !wavExists || audioMismatch || textChanged;

    if (!needGenerate) {
      if (!slide.audioFile) {
        slide.audioFile = expectedAudioFile;
        needWrite = true;
      }
      result.skipped++;
      continue;
    }

    try {
      if (generated > 0) {
        await sleep(500);
      }
      console.log(`  [ナレーション] スライド ${sn}: 合成中…`);
      await synthesizeWav(baseUrl, speaker, clean, wavPath);
      const dur = getAudioDurationSeconds(wavPath);
      if (dur != null) {
        slide.seconds = Math.ceil(dur);
      }
      slide.audioFile = expectedAudioFile;
      hashCache[String(sn)] = h;
      cacheDirty = true;
      needWrite = true;
      generated++;
      result.generated++;
      console.log(
        `  [ナレーション]   → ${expectedName}（${slide.seconds ?? "?"}秒）`,
      );
    } catch (e) {
      const msg = e.message || String(e);
      result.errors.push(`slide ${sn}: ${msg}`);
      console.error(`  [ナレーション] スライド ${sn} 失敗: ${msg}`);
    }
  }

  if (needWrite) {
    fs.writeFileSync(jsonPath, JSON.stringify(scriptData, null, 2) + "\n", "utf-8");
    result.wroteJson = true;
  }

  if (cacheDirty) {
    fs.mkdirSync(path.dirname(cachePath), { recursive: true });
    fs.writeFileSync(cachePath, JSON.stringify(hashCache, null, 2) + "\n", "utf-8");
  }

  return result;
}

module.exports = {
  cleanTextForSpeech,
  getAudioDurationSeconds,
  syncNarrationAudio,
  checkVoicevox,
};
