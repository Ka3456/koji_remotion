// このファイルは自動生成されます。直接編集しないでください。
// src/script/<動画名>/script.json を編集して npm run generate を実行してください。

import { Format01 } from "./template/format01";
import { Format04 } from "./template/format04";
import { Format26 } from "./template/format26";
import { Format10 } from "./template/format10";
import { Format11 } from "./template/format11";

export const TEMPLATE_MAP: Record<string, React.FC<any>> = {
  format01: Format01,
  format04: Format04,
  format26: Format26,
  format10: Format10,
  format11: Format11,
};

export const VIDEOS: Record<string, { slides: any[] }> = {
  "0-0": {
    "slides": [
      {
        "slideNumber": 1,
        "format": "format01",
        "title": "その1R投資\n契約した瞬間に詰みます",
        "subtitle": "知らないと損する",
        "seconds": 9,
        "narration": "1R投資に興味がありますか？契約した瞬間に後悔することも。今日はその理由を詳しく解説します。",
        "audioFile": "script/0-0/narration/long_scene_1.wav"
      },
      {
        "slideNumber": 2,
        "format": "format04",
        "title": "今日話す3つのこと",
        "items": [
          "1R投資の危険性",
          "節税の罠",
          "よくある誘い"
        ],
        "seconds": 9,
        "narration": "今日は、1R投資がなぜ危険なのか、節税の落とし穴、そしてよくある勧誘方法についてお話しします。",
        "audioFile": "script/0-0/narration/long_scene_2.wav"
      },
      {
        "slideNumber": 3,
        "format": "format26",
        "powerpointTitle": "1R投資のリスクとは",
        "powerpointItems": [
          "契約後の**詰み**",
          "節税の名目に注意",
          "誘い文句に気をつけて"
        ],
        "seconds": 11,
        "narration": "1R投資のリスクについてですが、契約後に後悔するケースが多いです。節税という名目も要注意で、甘い誘い文句に惑わされないようにしましょう。",
        "audioFile": "script/0-0/narration/long_scene_3.wav"
      }
    ]
  },
  "0-1": {
    "slides": [
      {
        "slideNumber": 1,
        "format": "format01",
        "title": "その1R投資は危険\n契約した瞬間に詰む",
        "subtitle": "知らぬ間に赤字化",
        "seconds": 19,
        "narration": "もし「手堅いワンルームですよ」と勧められたら、ちょっと待って。契約直後から赤字に傾く仕組みを、短時間でわかりやすく解きほぐします。なぜ危ないのか、価格・税金・出口の三つの視点で、落ち着いて確認していきます。",
        "audioFile": "script/0-1/narration/long_scene_1.wav"
      },
      {
        "slideNumber": 2,
        "format": "format04",
        "title": "今日話す3つのこと",
        "items": [
          "1R投資が詰む理由",
          "節税トークの罠",
          "誘いが来たら？"
        ],
        "seconds": 17,
        "narration": "まず、ワンルーム投資が契約直後から苦しくなる仕組みを、実例ベースで押さえます。次に「節税」トークの注意点。最後に、勧誘が来たときの落ち着いた対処を確認し、ポイントを順に見ていきましょう。",
        "audioFile": "script/0-1/narration/long_scene_2.wav"
      },
      {
        "slideNumber": 3,
        "format": "format10",
        "question": "「1R投資しませんか？」\nこの誘い、来たことありますか？",
        "label": "問いかけ",
        "seconds": 18,
        "narration": "さて、質問です。電話や街頭アンケート、セミナー後などで「ワンルーム投資どうですか」と声をかけられた経験、ありますか？ちょっと思い出してみてください。SNSのDMや、職場への連絡という形もあります。",
        "characterImage": "assets/images/thinking-businessman.png",
        "audioFile": "script/0-1/narration/long_scene_3.wav"
      },
      {
        "slideNumber": 4,
        "format": "format26",
        "powerpointTitle": "なぜ1R契約が即詰みに？",
        "powerpointItems": [
          "割高価格と低家賃の固定化",
          "初期諸費用で手元資金が減",
          "**売却・解約が難しい**"
        ],
        "seconds": 23,
        "narration": "新築や築浅は販売価格が家賃水準に対して高くなりがちで、家賃はすぐには上がりません。さらに手数料や登記費用で現金が減少。加えて解約や売却にコストがかかり、身動きが取りづらくなります。結果として返済と維持費の比重が増し、月次の収支が圧迫されやすいのです。",
        "characterImage": "assets/images/realestate-icons.png",
        "audioFile": "script/0-1/narration/long_scene_4.wav"
      },
      {
        "slideNumber": 5,
        "format": "format26",
        "powerpointTitle": "「節税になります」の正体",
        "powerpointItems": [
          "**減税効果は一時的**",
          "所得や控除で結果が大きく変動",
          "赤字前提の提案に要注意"
        ],
        "seconds": 21,
        "narration": "減価償却や金利で一時的に課税所得が下がることはありますが、所得水準や扶養・医療費控除の状況で効果は大きく変わります。長期で赤字前提の想定なら、現金流出が続く点を冷静に点検しましょう。将来の売却益で相殺できるかも、条件次第です。",
        "characterImage": "assets/images/investment-tools-icons.png",
        "audioFile": "script/0-1/narration/long_scene_5.wav"
      },
      {
        "slideNumber": 6,
        "format": "format11",
        "situation": "「節税になります」で即契約。\n家賃不足と返済負担が重なり資金難に。",
        "label": "危険な状況",
        "seconds": 22,
        "narration": "これは本当に危険なパターンです。「節税になります」で即契約すると、思ったより家賃が伸びず、返済・管理費・修繕積立が重なります。生活費に食い込み、カードや借入で補う前に、必ず収支の見直しを。専門家への早めの相談も有効です。",
        "characterImage": "assets/images/stressed-man-worker.png",
        "audioFile": "script/0-1/narration/long_scene_6.wav"
      },
      {
        "slideNumber": 7,
        "format": "format04",
        "title": "今日のまとめ",
        "items": [
          "即決しない・契約前相談",
          "収支と出口を必ず試算",
          "勧誘は記録を残す"
        ],
        "seconds": 18,
        "narration": "焦ってサインしないこと。迷ったら契約前に第三者へ相談。購入前は家賃・金利・売却の想定まで収支を試算し、勧誘の連絡や資料は日時ごとに記録しておきましょう。感情で決めない仕組みづくりが大切です。",
        "audioFile": "script/0-1/narration/long_scene_7.wav"
      }
    ]
  },
  "1-2": {
    "slides": [
      {
        "slideNumber": 1,
        "format": "format01",
        "title": "その1R投資\n契約した瞬間に詰みます",
        "subtitle": "第1話",
        "seconds": 7,
        "narration": ""
      },
      {
        "slideNumber": 2,
        "format": "format26",
        "powerpointTitle": "その1R投資",
        "powerpointItems": [
          "契約した瞬間に詰みます"
        ],
        "seconds": 8,
        "narration": ""
      },
      {
        "slideNumber": 3,
        "format": "format26",
        "powerpointTitle": "「節税になります」",
        "powerpointItems": [
          "って言われた人、危険です"
        ],
        "seconds": 8,
        "narration": ""
      },
      {
        "slideNumber": 4,
        "format": "format26",
        "powerpointTitle": "「1R投資しませんか？」",
        "powerpointItems": [
          "この誘い、来たことある？"
        ],
        "seconds": 8,
        "narration": ""
      },
      {
        "slideNumber": 5,
        "format": "format26",
        "powerpointTitle": "オイラ、これ",
        "powerpointItems": [
          "何十件も見てきた"
        ],
        "seconds": 8,
        "narration": ""
      },
      {
        "slideNumber": 6,
        "format": "format26",
        "powerpointTitle": "結論：",
        "powerpointItems": [
          "ほぼ負け確です（理由バラす）"
        ],
        "seconds": 8,
        "narration": ""
      },
      {
        "slideNumber": 7,
        "format": "format26",
        "powerpointTitle": "新社会人",
        "powerpointItems": [
          "年収500?700万"
        ],
        "seconds": 8,
        "narration": ""
      },
      {
        "slideNumber": 8,
        "format": "format26",
        "powerpointTitle": "ある日、連絡が来る",
        "powerpointItems": [
          "ある日、連絡が来る"
        ],
        "seconds": 8,
        "narration": ""
      },
      {
        "slideNumber": 9,
        "format": "format26",
        "powerpointTitle": "電話 or マッチングアプリ",
        "powerpointItems": [
          "電話 or マッチングアプリ"
        ],
        "seconds": 8,
        "narration": ""
      },
      {
        "slideNumber": 10,
        "format": "format26",
        "powerpointTitle": "「資産形成してますか？」",
        "powerpointItems": [
          "「資産形成してますか？」"
        ],
        "seconds": 8,
        "narration": ""
      },
      {
        "slideNumber": 11,
        "format": "format26",
        "powerpointTitle": "カフェで面談",
        "powerpointItems": [
          "カフェで面談"
        ],
        "seconds": 8,
        "narration": ""
      },
      {
        "slideNumber": 12,
        "format": "format26",
        "powerpointTitle": "「節税できます」",
        "powerpointItems": [
          "「節税できます」"
        ],
        "seconds": 8,
        "narration": ""
      },
      {
        "slideNumber": 13,
        "format": "format26",
        "powerpointTitle": "「年金代わりになります」",
        "powerpointItems": [
          "「年金代わりになります」"
        ],
        "seconds": 8,
        "narration": ""
      },
      {
        "slideNumber": 14,
        "format": "format26",
        "powerpointTitle": "「家賃収入でローン返せます」",
        "powerpointItems": [
          "「家賃収入でローン返せます」"
        ],
        "seconds": 8,
        "narration": ""
      },
      {
        "slideNumber": 15,
        "format": "format26",
        "powerpointTitle": "「自己資金ほぼ不要です」",
        "powerpointItems": [
          "「自己資金ほぼ不要です」"
        ],
        "seconds": 8,
        "narration": ""
      },
      {
        "slideNumber": 16,
        "format": "format26",
        "powerpointTitle": "→ なんか良さそう",
        "powerpointItems": [
          "→ なんか良さそう"
        ],
        "seconds": 8,
        "narration": ""
      },
      {
        "slideNumber": 17,
        "format": "format26",
        "powerpointTitle": "→ 契約（ここで詰み）",
        "powerpointItems": [
          "→ 契約（ここで詰み）"
        ],
        "seconds": 8,
        "narration": ""
      },
      {
        "slideNumber": 18,
        "format": "format26",
        "powerpointTitle": "どこが罠かわかる？",
        "powerpointItems": [
          "どこが罠かわかる？"
        ],
        "seconds": 8,
        "narration": ""
      },
      {
        "slideNumber": 19,
        "format": "format26",
        "powerpointTitle": "（10秒考えて）",
        "powerpointItems": [
          "（10秒考えて）"
        ],
        "seconds": 8,
        "narration": ""
      },
      {
        "slideNumber": 20,
        "format": "format26",
        "powerpointTitle": "まず収支",
        "powerpointItems": [
          "まず収支"
        ],
        "seconds": 8,
        "narration": ""
      },
      {
        "slideNumber": 21,
        "format": "format26",
        "powerpointTitle": "家賃 ? ローン ? 管理費 ? 修繕費",
        "powerpointItems": [
          "家賃 ? ローン ? 管理費 ? 修"
        ],
        "seconds": 8,
        "narration": ""
      },
      {
        "slideNumber": 22,
        "format": "format26",
        "powerpointTitle": "いくら残る？",
        "powerpointItems": [
          "いくら残る？"
        ],
        "seconds": 8,
        "narration": ""
      },
      {
        "slideNumber": 23,
        "format": "format26",
        "powerpointTitle": "答え：毎月 -1?3万円",
        "powerpointItems": [
          "答え：毎月 -1?3万円"
        ],
        "seconds": 8,
        "narration": ""
      },
      {
        "slideNumber": 24,
        "format": "format26",
        "powerpointTitle": "止めない限り",
        "powerpointItems": [
          "ずっと出血"
        ],
        "seconds": 8,
        "narration": ""
      },
      {
        "slideNumber": 25,
        "format": "format26",
        "powerpointTitle": "「節税あるから大丈夫でしょ？」",
        "powerpointItems": [
          "「節税あるから大丈夫でしょ？」"
        ],
        "seconds": 8,
        "narration": ""
      },
      {
        "slideNumber": 26,
        "format": "format26",
        "powerpointTitle": "節税＝損の一部が戻るだけ",
        "powerpointItems": [
          "節税＝損の一部が戻るだけ"
        ],
        "seconds": 8,
        "narration": ""
      },
      {
        "slideNumber": 27,
        "format": "format26",
        "powerpointTitle": "→ 利益じゃない（現金は増えない）",
        "powerpointItems": [
          "→ 利益じゃない（現金は増えない）"
        ],
        "seconds": 8,
        "narration": ""
      },
      {
        "slideNumber": 28,
        "format": "format26",
        "powerpointTitle": "さらに地獄：空室",
        "powerpointItems": [
          "さらに地獄：空室"
        ],
        "seconds": 8,
        "narration": ""
      },
      {
        "slideNumber": 29,
        "format": "format26",
        "powerpointTitle": "入居者いなければ収入ゼロ",
        "powerpointItems": [
          "入居者いなければ収入ゼロ"
        ],
        "seconds": 8,
        "narration": ""
      },
      {
        "slideNumber": 30,
        "format": "format26",
        "powerpointTitle": "じゃあ売る？",
        "powerpointItems": [
          "じゃあ売る？"
        ],
        "seconds": 8,
        "narration": ""
      },
      {
        "slideNumber": 31,
        "format": "format26",
        "powerpointTitle": "→ 売れない（出口なし）",
        "powerpointItems": [
          "→ 売れない（出口なし）"
        ],
        "seconds": 8,
        "narration": ""
      },
      {
        "slideNumber": 32,
        "format": "format26",
        "powerpointTitle": "最初から負けてる構造",
        "powerpointItems": [
          "次回：なぜか全部バラす"
        ],
        "seconds": 8,
        "narration": ""
      }
    ]
  },
  "1-3": {
    "slides": [
      {
        "slideNumber": 1,
        "format": "format01",
        "title": "その1R投資\n契約した瞬間に詰む",
        "subtitle": "知らないと危ない",
        "seconds": 16,
        "narration": "ワンルーム投資、実は契約した直後から不利になることがあります。今日は、なぜそうなるのかと、回避の考え方を短く解説します。営業で聞く節税トークの注意点と、断り方のコツもお伝えします。",
        "audioFile": "script/1-3/narration/long_scene_1.wav"
      },
      {
        "slideNumber": 2,
        "format": "format04",
        "title": "今日話す3つのこと",
        "items": [
          "なぜ詰む？",
          "節税トークの罠",
          "断るコツ"
        ],
        "seconds": 17,
        "narration": "まず、どこでお金が先に減るのかを整理し、次に節税という言葉の落とし穴を確認。最後に、勧誘を無理なく断る具体的な言い回しを共有します。流れを追えば、危険なサインが見えてきます。一緒に確認しましょう。",
        "audioFile": "script/1-3/narration/long_scene_2.wav"
      },
      {
        "slideNumber": 3,
        "format": "format10",
        "question": "『1R投資しませんか？』\nこの誘い、来たことある？",
        "label": "問いかけ",
        "seconds": 17,
        "narration": "さて、質問です。電話やSNSで「ワンルーム投資どうですか？」と勧誘を受けたこと、ありませんか。ちょっと考えてみてください。もし心当たりがあるなら、この先のポイントが役立ちます。ぜひ聞いてください。",
        "characterImage": "assets/images/thinking-businessman.png",
        "audioFile": "script/1-3/narration/long_scene_3.wav"
      },
      {
        "slideNumber": 4,
        "format": "format26",
        "powerpointTitle": "契約直後に詰むカラクリ",
        "powerpointItems": [
          "初期費用と手数料で赤字出発",
          "家賃収入より返済が重くなる",
          "売却コスト高で**出口**が狭い"
        ],
        "seconds": 21,
        "narration": "最初に諸費用や手数料で一気に現金が減り、スタートが赤字になりやすい。さらに返済額が家賃を上回る月が続くと、持ち出しが常態化。最後は売却時の諸費用が重く、出口が狭くなります。想定外の空室や修繕が重なると、さらに資金繰りが悪化しがちです。",
        "characterImage": "assets/images/realestate-icons.png",
        "audioFile": "script/1-3/narration/long_scene_4.wav"
      },
      {
        "slideNumber": 5,
        "format": "format26",
        "powerpointTitle": "『節税になります』の落とし穴",
        "powerpointItems": [
          "税額よりトータル収支が大事",
          "減価償却だけでは現金増えず",
          "将来の修繕費も見落としがち"
        ],
        "seconds": 21,
        "narration": "節税と聞くと得に見えますが、肝心なのは税額より手元資金のトータル収支です。減価償却は帳簿上の費用で、現金は増えません。さらに将来の修繕や設備更新も、計画に織り込む必要があります。数字を年単位で並べ、実質の出入りを確認しましょう。",
        "characterImage": "assets/images/investment-tools-icons.png",
        "audioFile": "script/1-3/narration/long_scene_5.wav"
      },
      {
        "slideNumber": 6,
        "format": "format11",
        "situation": "『節税になる』と契約。\n毎月の持ち出しが発生し、売却も難航",
        "label": "危険な状況",
        "seconds": 21,
        "narration": "これは本当に危険なパターンです。節税だと信じて契約すると、毎月の持ち出しが続き、心が折れた頃に売却も難航します。資金が細る連鎖が起きる前に、条件と数字を必ず点検してください。一度赤字化すると巻き戻すのは難しく、時間も手数料も奪われます。",
        "characterImage": "assets/images/stressed-man-worker.png",
        "audioFile": "script/1-3/narration/long_scene_6.wav"
      },
      {
        "slideNumber": 7,
        "format": "format04",
        "title": "今日の結論",
        "items": [
          "節税を理由にしない",
          "収支を自分で試算",
          "即決セールスは断る"
        ],
        "seconds": 17,
        "narration": "結論、節税という言葉だけで判断しないこと。まず自分で収支を試算し、数字に根拠を持つ。さらに即決を迫る営業には、期日を置いて丁寧に断りましょう。自分のペースで検討するだけで、守れるお金があります。",
        "audioFile": "script/1-3/narration/long_scene_7.wav"
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
        "seconds": 7,
        "narration": ""
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

export const VIDEO_NAMES = ["0-0","0-1","1-2","1-3","test"] as const;
