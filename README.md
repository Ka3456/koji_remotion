# koji-youtube 使い方

## ファイルの場所

| 何をしたいか | 場所 |
|-------------|------|
| 完成した動画（MP4）を確認する | `/Users/kojihotta/Developer/koji-youtube/out/{id}.mp4` |
| スライドの内容を手で直す | `/Users/kojihotta/Developer/koji-youtube/src/script/{id}/script.json` |
| 新しい素材（台本）を追加する | `/Users/kojihotta/Developer/koji-youtube/pretexts/{id}.txt` |

---

## 流れ

```
1. pretexts/ に {id}.txt を置く
        ↓
2. 01_make_sample_video.sh   # スクリプト生成 + Remotion Studio 起動
        ↓
3. src/script/{id}/script.json を手で微調整（必要なら）
        ↓
4. 02_make_mp3.sh            # ナレーション音声生成
        ↓
5. 03_save_mp4.sh            # MP4 書き出し → out/{id}.mp4
```

---

## コマンド（nohup でバックグラウンド実行）

### 01 スクリプト生成 + プレビュー起動

```bash
cd /Users/kojihotta/Developer/koji-youtube
nohup ./01_make_sample_video.sh > logs/01.log 2>&1 &
```

### 02 ナレーション音声生成

```bash
cd /Users/kojihotta/Developer/koji-youtube
nohup ./02_make_mp3.sh > logs/02.log 2>&1 &
```

### 03 MP4 書き出し

```bash
cd /Users/kojihotta/Developer/koji-youtube
nohup ./03_save_mp4.sh > logs/03.log 2>&1 &
```

---

## ログ確認・停止

```bash
# ログをリアルタイムで見る
tail -f logs/01.log

# バックグラウンドのジョブ一覧
jobs

# 停止
kill %1
```

---

## PRE_TEXT の変更

各スクリプト冒頭の `PRE_TEXT` を変更するだけ。
`01_make_sample_video.sh` を実行すると `02` / `03` の `PRE_TEXT` も自動で揃う。

