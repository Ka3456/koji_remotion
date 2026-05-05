# koji-youtube

短尺YouTube解説動画の自動生成パイプライン。
pretext（台本素材）を入力すると、スライド構成・ナレーション・音声・MP4まで一貫して生成する。

## ワークフロー概要

```
pretexts/{id}.txt
    ↓ 01_make_sample_video.sh
agent.py (GPT-5) → script.json → scriptContent.ts → Remotion Studio
    ↓ 02_make_mp3.sh (任意)
VOICEVOX → narration/*.wav → scriptContent.ts 更新
    ↓ 03_save_mp4.sh
out/{id}.mp4
```

**PRE_TEXT の同期:** `01_make_sample_video.sh` を実行すると `02` / `03` の `PRE_TEXT` が自動的に揃う。

---

## シェルスクリプト

| スクリプト | 役割 |
|-----------|------|
| `01_make_sample_video.sh` | agent.py でスクリプト生成 → scriptContent.ts 更新 → Remotion Studio 起動 |
| `02_make_mp3.sh` | VOICEVOX で narration を WAV 合成 → scriptContent.ts 更新 |
| `03_save_mp4.sh` | `npx remotion render` で MP4 書き出し → `out/{PRE_TEXT}.mp4` |

---

## スライドフォーマット

| format | 用途 | 必須 props | 秒数 |
|--------|------|-----------|------|
| `format01` | オープニングタイトル（動画冒頭1枚のみ） | `title`, `subtitle` | 7s |
| `format04` | 3カード箇条書き（目次・まとめ） | `title`, `items[3]` | 7s |
| `format10` | 問いかけ（チャイム再生） | `question`, `label?`, `characterImage?` | 7s |
| `format11` | 危険・警告（BGM切替 + 専用BGM） | `situation`, `label?`, `characterImage?` | 8s |
| `format26` | 詳細解説（黒板 + キャラ画像） | `powerpointTitle`, `powerpointItems[1-3]`, `characterImage?` | 8s |

- `**太字**` は `format26` の `powerpointItems` のみ有効
- `format11` 再生中はメイン BGM が自動フェードアウト（Root.tsx で制御）

---

## 音声ファイル

| ファイル | 用途 |
|---------|------|
| `public/assets/music/444_long_BPM80.mp3` | メイン BGM（全スライドにループ） |
| `public/assets/music/chime_question.mp3` | format10 冒頭チャイム |
| `public/assets/music/bgm_danger.mp3` | format11 専用 BGM |

---

## キャラクター画像

`public/assets/images/` 配下の 20 枚。agent.py が内容に合わせて自動選定する。
どうしても合うものがなければ `youtube_icon.png` にフォールバック。

主な選定傾向：
- format10（問いかけ）→ `thinking-businessman.png` 系
- format11（危険）→ `stressed-man-worker.png` 系
- format26 → 内容に応じて LLM が選択

---

## agent.py

**モデル:** `gpt-5`（デフォルト。`--model` で変更可）

**主な処理:**
1. `pretexts/{id}.txt` をパースしてスライド素材を抽出
2. LLM でスライド構成を設計（5〜10 枚）
3. 各スライドのナレーション原稿を生成
4. キャラクター画像を割り当て
5. `script_maker/out/script.json` に出力後、`src/script/{id}/` にコピーして `out/` を削除

**主なフラグ:**
- `--no-full` … LLM がスライドを 5〜10 枚に集約（デフォルトは 1:1 展開）
- `--no-research` … Web 検索スキップ

**禁止フレーズ:** 「起」「承」「転」「結」をスライドテキストに含めない

---

## scriptContent.ts

`node scripts/generate.js` で自動生成。直接編集しない。
`src/script/{id}/script.json` を読んで `VIDEOS` / `TEMPLATE_MAP` を出力する。

---

## VOICEVOX スピーカー ID（主要）

| 声 | ID |
|----|-----|
| 白上虎太郎・ふつう | 12 |
| 白上虎太郎・わーい | 32 |
| ずんだもん・ノーマル | 3 |
| 四国めたん・ノーマル | 2 |

全一覧: `curl http://localhost:50021/speakers` で確認。

---

## 困ったときのファイル場所ガイド

### 完成した MP4 を確認したい
`out/` に `{id}.mp4` が書き出されている。

### スライドのデザインや演出を変えたい
`src/template/` 配下の TSX ファイルを編集する。
新しい format を追加する場合は `scriptContent.ts` への登録と `agent.py` の `ALLOWED_FORMATS` / `DESIGN_SYSTEM_PROMPT` も更新が必要。

### AI が生成するスライド構成・文言を変えたい
`script_maker/agent.py` の `DESIGN_SYSTEM_PROMPT`（構成ルール）や `NARRATION_SYSTEM_PROMPT`（ナレーション口調）を編集する。
ここを改善するほど生成品質が上がる。

### 新しい動画の素材（台本）を追加したい
`pretexts/` に `{id}.txt` を置く。
ファイル名（拡張子なし）がそのまま動画 ID・Composition 名になる。
`01_make_sample_video.sh` の `PRE_TEXT` をそのファイル名に変えて実行するだけ。

### 01 実行後にスライドの内容を手で微調整したい
`src/script/{id}/script.json` を直接編集する。
編集後は `npm run generate` を実行して `scriptContent.ts` に反映させる。

---

## エピソード命名規則

`{シリーズ番号}-{話数}` 形式（例: `0-1`, `1-2`）。
`pretexts/`, `src/script/`, `out/` のディレクトリ名と Remotion の Composition ID に使われる。
