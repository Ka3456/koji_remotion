// このファイルは自動生成されます。直接編集しないでください。
// src/script/<動画名>/script.json を編集して npm run generate を実行してください。

import { Format01 } from "./template/format01";
import { Format04 } from "./template/format04";
import { Format26 } from "./template/format26";

export const TEMPLATE_MAP: Record<string, React.FC<any>> = {
  format01: Format01,
  format04: Format04,
  format26: Format26,
};

export const VIDEOS: Record<string, { slides: any[] }> = {
  "1-1": {
    "slides": [
      {
        "slideNumber": 1,
        "format": "format01",
        "title": "1R投資の落とし穴\n契約の瞬間に詰む理由",
        "subtitle": "知らないと損する",
        "seconds": 7
      },
      {
        "slideNumber": 2,
        "format": "format04",
        "title": "今日話す3つのこと",
        "items": [
          "1R投資の誘い",
          "契約の罠",
          "出口の無さ"
        ],
        "seconds": 7
      },
      {
        "slideNumber": 3,
        "format": "format26",
        "powerpointTitle": "1R投資のターゲット",
        "powerpointItems": [
          "新社会人が狙われる",
          "年収500〜700万円",
          "電話やアプリで接触"
        ],
        "seconds": 8
      },
      {
        "slideNumber": 4,
        "format": "format26",
        "powerpointTitle": "収支の現実",
        "powerpointItems": [
          "家賃収入からローン",
          "管理費と修繕費",
          "**毎月 -1〜3万円**"
        ],
        "seconds": 8
      },
      {
        "slideNumber": 5,
        "format": "format26",
        "powerpointTitle": "節税の誤解",
        "powerpointItems": [
          "節税は損失の一部返還",
          "利益は生まれない",
          "現金は増えない"
        ],
        "seconds": 8
      },
      {
        "slideNumber": 6,
        "format": "format26",
        "powerpointTitle": "空室と売却のリスク",
        "powerpointItems": [
          "空室で収入ゼロ",
          "物件が売れない",
          "出口が無い構造"
        ],
        "seconds": 8
      },
      {
        "slideNumber": 7,
        "format": "format04",
        "title": "結論",
        "items": [
          "契約で詰み",
          "毎月の赤字",
          "出口の無さ"
        ],
        "seconds": 7
      }
    ]
  },
  "test": {
    "slides": [
      {
        "slideNumber": 1,
        "format": "format01",
        "title": "お金の増やし方\n完全ガイド",
        "subtitle": "知らないと損する",
        "seconds": 7
      },
      {
        "slideNumber": 2,
        "format": "format04",
        "title": "今日のテーマ",
        "items": [
          "収入を増やす方法",
          "支出を減らす方法",
          "資産を運用する方法"
        ],
        "seconds": 7
      },
      {
        "slideNumber": 3,
        "format": "format26",
        "powerpointTitle": "収入を増やすには",
        "powerpointItems": [
          "本業のスキルアップ",
          "**副業**でプラス収入",
          "投資で資産を働かせる"
        ],
        "seconds": 8
      },
      {
        "slideNumber": 4,
        "format": "format26",
        "powerpointTitle": "支出を減らすコツ",
        "powerpointItems": [
          "**固定費**から見直す",
          "サブスクを整理する",
          "家計簿アプリを活用"
        ],
        "seconds": 8
      },
      {
        "slideNumber": 5,
        "format": "format04",
        "title": "まとめ",
        "items": [
          "収入アップを目指す",
          "固定費を見直す",
          "コツコツ資産運用"
        ],
        "seconds": 7
      }
    ]
  }
};

export const VIDEO_NAMES = ["1-1","test"] as const;
