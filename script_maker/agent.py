# agent.py
# pretexts/N-N.txt を読み、src/template の3フォーマット (format01/04/26) だけを使う
# script.json を生成するシンプルなエージェント。
from __future__ import annotations

import os
import re
import json
import argparse
from typing import List, Dict, Optional, Tuple

from dotenv import load_dotenv


def log(msg: str) -> None:
    print(f"[agent] {msg}", flush=True)


# =========================
# OpenAI client (遅延 import: --full --no-research では openai を読み込まない)
# =========================
def get_client():
    from openai import OpenAI  # 遅延 import
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        raise ValueError("OPENAI_API_KEY が .env に設定されていません")
    return OpenAI(api_key=api_key, timeout=180)


# =========================
# Pretext loader
# =========================
PRETEXT_ENCODINGS = ("utf-8-sig", "utf-8", "cp932")


# =========================
# Image catalog (public/assets/images/ 配下)
# =========================
IMAGE_CATALOG: List[Tuple[str, str]] = [
    ("designing-floorplan.png", "間取り図を設計している様子"),
    ("floor-plan.png", "間取り図そのもの"),
    ("imagining-empty-office.png", "空室のオフィスを想像している"),
    ("imagining-property.png", "物件を想像している"),
    ("investment-tools-icons.png", "投資ツール／指標のアイコン群"),
    ("person-avatars.png", "複数の人物アバター"),
    ("phone-consultation-woman.png", "女性が電話で相談している"),
    ("property-consultation.png", "不動産の対面相談"),
    ("property-search-icons.png", "物件検索系アイコン"),
    ("realestate-icons.png", "不動産関連アイコン"),
    ("saving-money-coin.png", "貯金・コイン"),
    ("scammer-hacker-laptop.png", "詐欺師／ハッカーがPC操作"),
    ("stressed-man-worker.png", "ストレスを抱える男性会社員"),
    ("stressed-woman-worker.png", "ストレスを抱える女性会社員"),
    ("suspicious-man-laptop.png", "怪しげな男性とノートPC"),
    ("suspicious-man-phone.png", "怪しげな男性と電話"),
    ("thinking-businessman.png", "考え込むビジネスマン"),
    ("vacant-room-isometric.png", "空室のアイソメトリックイラスト"),
    ("worried-man-profile.png", "不安そうな男性のプロフィール"),
    ("worried-woman-profile.png", "不安そうな女性のプロフィール"),
    ("youtube_icon.png", "汎用フォールバック（最終手段）"),
]
ALLOWED_IMAGE_FILES = {name for name, _ in IMAGE_CATALOG}
DEFAULT_IMAGE_FILE = "youtube_icon.png"
IMAGE_PATH_PREFIX = "assets/images/"


def read_pretext(path: str) -> str:
    last_err: Optional[Exception] = None
    for enc in PRETEXT_ENCODINGS:
        try:
            with open(path, "r", encoding=enc) as f:
                return f.read()
        except UnicodeDecodeError as e:
            last_err = e
    raise UnicodeDecodeError("pretext", b"", 0, 1, f"未知のエンコード: {last_err}")


def parse_pretext(text: str) -> Dict:
    """
    pretext を以下の構造で返す。
    {
      "episode_title": "第1話",
      "hook": "その1R投資、契約した瞬間に詰みます",
      "section_labels": {1: "起", 2: "起", ..., 6: "承", ...},
      "slides": [{"number": 1, "body": "..."}, ...]
    }
    """
    lines = text.splitlines()

    episode_title = ""
    hook = ""
    section_ranges: List[Tuple[int, int, str]] = []  # (start, end, label)
    slides: List[Dict] = []

    current_num: Optional[int] = None
    current_body: List[str] = []

    def flush_slide() -> None:
        nonlocal current_num, current_body
        if current_num is not None:
            body = "\n".join(s.rstrip() for s in current_body).strip()
            slides.append({"number": current_num, "body": body})
        current_num = None
        current_body = []

    for raw in lines:
        line = raw.rstrip()

        m_h3 = re.match(r"^###\s+(\d+)\s*$", line)
        if m_h3:
            flush_slide()
            current_num = int(m_h3.group(1))
            continue

        m_section = re.match(r"^##\s+(\d+)\s*[-–~〜]\s*(\d+)\s*[（(]([^）)]+)[）)]\s*$", line)
        if m_section:
            flush_slide()
            start, end, label = int(m_section.group(1)), int(m_section.group(2)), m_section.group(3).strip()
            section_ranges.append((start, end, label))
            continue

        m_h2 = re.match(r"^##\s+(.+)$", line)
        if m_h2 and current_num is None and not hook:
            hook = m_h2.group(1).strip()
            continue

        m_h1 = re.match(r"^#\s+(.+)$", line)
        if m_h1 and not line.startswith("##"):
            episode_title = m_h1.group(1).strip()
            continue

        if line.startswith("---"):
            continue

        if current_num is not None:
            current_body.append(line)

    flush_slide()

    section_labels: Dict[int, str] = {}
    for start, end, label in section_ranges:
        for i in range(start, end + 1):
            section_labels[i] = label

    slides = [s for s in slides if s["body"]]

    return {
        "episode_title": episode_title,
        "hook": hook,
        "section_labels": section_labels,
        "slides": slides,
    }


# =========================
# Web research via OpenAI web_search tool (for credibility)
# =========================
RESEARCH_INSTRUCTIONS = """あなたはYouTube動画台本のファクトチェック担当です。
与えられた台本素材から、視聴者の信頼を得るために『裏付けたい主張』を3〜6個抽出し、
Web検索ツール (web_search) を使って具体的な数字・ニュース・調査結果・実例を集めます。

要件:
- 必ず web_search ツールを複数回（最低3回）呼び出してください
- 信頼できそうな1次/2次ソース（公的統計、業界レポート、新聞、専門メディア）を優先
- 各 finding は1文程度の事実 + 数字 + 出典名 + URL（あれば）
- 矛盾する情報があれば両論併記してよい
- 嘘・誇張・捏造は厳禁。ソースで確認できない数字は載せない

最終出力は次のJSON形式のみ:
{
  "findings": [
    {"claim": "ワンルーム投資の平均月収支は赤字傾向", "fact": "毎月-1〜3万円の持ち出しが一般的", "source": "〇〇調査(2023)", "url": "https://..."},
    ...
  ]
}
"""


def gather_research_via_openai(parsed: Dict, model: str = "gpt-5") -> List[Dict]:
    """
    OpenAI Responses API + web_search_preview ツールで台本素材をリサーチし、
    findings リストを返す。失敗時は空リスト。
    """
    client = get_client()

    bodies = "\n".join(
        f"### {s['number']} {s['body'].replace(chr(10), ' / ')}"
        for s in parsed["slides"]
    )
    user_input = (
        f"【エピソード】{parsed['episode_title']}\n"
        f"【メインフック】{parsed['hook']}\n\n"
        f"【素材】\n{bodies}\n\n"
        "上記台本を補強できる事実・数字・ニュースを web_search で調査し、"
        "最後に findings JSON を出力してください。"
    )

    try:
        log("Web リサーチ: OpenAI Responses API (web_search_preview) を実行中…")
        resp = client.responses.create(
            model=model,
            tools=[{"type": "web_search_preview", "search_context_size": "medium"}],
            instructions=RESEARCH_INSTRUCTIONS,
            input=user_input,
        )
    except Exception as e:
        log(f"Web リサーチ失敗（継続）: {e}")
        return []

    text = _extract_response_text(resp)
    if not text:
        log("Web リサーチ: レスポンスが空でした")
        return []

    findings = _parse_findings_json(text)
    log(f"Web リサーチ: {len(findings)} 件の事実を取得")
    return findings


def _extract_response_text(resp) -> str:
    """Responses API の出力からアシスタントの最終テキストを抜き出す。"""
    text = getattr(resp, "output_text", None)
    if text:
        return text
    pieces: List[str] = []
    for item in getattr(resp, "output", []) or []:
        if getattr(item, "type", None) == "message":
            for c in getattr(item, "content", []) or []:
                if getattr(c, "type", None) in ("output_text", "text"):
                    t = getattr(c, "text", None) or ""
                    if t:
                        pieces.append(t)
    return "\n".join(pieces)


def _parse_findings_json(text: str) -> List[Dict]:
    m = re.search(r"\{[\s\S]*\}", text)
    if not m:
        return []
    try:
        data = json.loads(m.group(0))
    except json.JSONDecodeError:
        return []
    findings = data.get("findings") or []
    out: List[Dict] = []
    for f in findings:
        if not isinstance(f, dict):
            continue
        out.append({
            "claim": str(f.get("claim", "")).strip(),
            "fact": str(f.get("fact", "")).strip(),
            "source": str(f.get("source", "")).strip(),
            "url": str(f.get("url", "")).strip(),
        })
    return [f for f in out if f["fact"]]


def format_research_block(findings: List[Dict]) -> str:
    if not findings:
        return ""
    lines: List[str] = [
        "【参考情報・Web 検索で得たファクト（信頼できる範囲で自然に織り込んでよい / 誇張・捏造禁止）】"
    ]
    for i, f in enumerate(findings, 1):
        src = f"（出典: {f['source']}）" if f["source"] else ""
        lines.append(f"{i}. {f['claim']} — {f['fact']}{src}")
    return "\n".join(lines)


# =========================
# LLM: design slide flow
# =========================
DESIGN_SYSTEM_PROMPT = """あなたは短尺YouTube解説動画の構成作家です。
与えられた台本素材（短いスライド断片の連なり）を読み解き、視聴維持率の高いスライド構成を設計します。

【利用可能フォーマット（この5種だけを使う。他は禁止）】
- format01: オープニングタイトル。動画冒頭1枚のみ。{title, subtitle}
    - title: 動画の主題（インパクトのある2行、合計15〜26文字、改行は \\n で表現）
    - subtitle: 視聴者の興味を引く短いキャッチ（8〜14文字、例「知らないと損する」）
- format04: 3カードの箇条書き。目次・要点まとめ・3つの選択肢など。{title, items[3]}
    - title: 16文字以内（例「今日のテーマ」「3つの罠」「結論」）
    - items: 必ず3項目。各12文字以内推奨、最大16文字。短く名詞句で。
- format10: 視聴者への問いかけ。チャイムが鳴り、視聴者を立ち止まらせる1枚。{question, label}
    - question: 視聴者に投げかける質問文（20〜40文字、改行は \\n 可）
    - label: ラベル文字（省略可。デフォルト「問いかけ」）
    - 使いどころ: 解説の前に視聴者を巻き込みたい場面、「あなたはこれ知ってますか？」系の問い。
      動画全体で1〜2枚まで。format01 直後や中盤の転換点に効果的。
- format11: 危険・警告シーン。専用BGMが流れ、緊張感を演出する1枚。{situation, label}
    - situation: 危険な状況の説明（20〜50文字、改行は \\n 可）
    - label: ラベル文字（省略可。デフォルト「危険な状況」）
    - 使いどころ: 「期限の利益を失って一括返済」「売れない・出口なし」「毎月赤字が続く」など
      視聴者にリスクを強く印象づけたい場面。動画全体で1〜2枚まで。
- format26: 黒板＋キャラの詳細解説スライド。中盤の説明用。{powerpointTitle, powerpointItems[1-3]}
    - powerpointTitle: 22文字以内、視聴者の手を止めるキャッチコピー
    - powerpointItems: 1〜3項目、各12〜18文字。最重要キーワード1箇所だけ **〜** で強調可
      （**強調** は format26 のみ。各スライドで最大1箇所まで。）

【構成方針】
- 全体で 5〜10 枚に集約する（短いスライド断片を意味のあるまとまりに束ねる）。
- 1枚目は必ず format01。動画全体の「結論／フック」を提示する。
- 2枚目あたりに format04 で「今日話す3つのこと」のような目次を置くと視聴維持に効果的。
- 中盤は format26 を中心に展開。format04 と組み合わせてリズムを作る。
- 素材にリスク・危険・損失の描写がある場合は format11 を1〜2枚挿入してインパクトを出す。
- 素材に視聴者への問いかけ・クイズ的な問いがある場合は format10 を活用する。
- 最後は format04 か format26 で「まとめ」「結論」を提示する。
- 起承転結のラベルは内部ペース配分の参考にすぎない。
  **「起」「承」「転」「結」という単語や、それを示す区切りスライドは絶対に作らない。**
  自然な流れの中に構成のリズムだけを反映させること。
- 同じフォーマットが3枚以上連続しないように調整する。

【口調・表現】
- 視聴者に語りかける自然な日本語。
- 煽り表現（「絶対」「100%」「誰でも簡単に」など）は禁止。
- 断定的な投資助言は避け、注意喚起・気づきを促すトーンで。
- 数字・固有名詞は具体的に拾う。

【参考情報の使い方（信頼性アップのため重要）】
- 後述の【参考情報】に検索で集めたニュース／統計が含まれる場合がある。
- 信頼できそうな数字（「成功率約10%」「年収400〜800万円層が中心」「平均月収支 -1〜3万円」等）は
  format04 の items や format26 の powerpointItems に**短く具体的に**織り込む。
- 出典を本文に書く必要はないが、検索結果に無い数字を勝手に作らない（誇張・捏造禁止）。
- 検索結果が薄い／無関係な場合は無理に使わず、素材スライドだけで構成する。

【出力】
以下のJSONのみを出力。説明文は不要。
{
  "slides": [
    {"format": "format01", "source_indices": [], "title": "〜\\n〜", "subtitle": "〜"},
    {"format": "format04", "source_indices": [1,2,3], "title": "〜", "items": ["...", "...", "..."]},
    {"format": "format10", "source_indices": [4], "question": "〜\\n〜？", "label": "問いかけ"},
    {"format": "format11", "source_indices": [8,9], "situation": "〜\\n〜", "label": "危険な状況"},
    {"format": "format26", "source_indices": [6,7,8], "powerpointTitle": "〜", "powerpointItems": ["...", "**強調**...", "..."]}
  ]
}
- source_indices には、その出力スライドが参照した元の ### 番号を入れる（format01 は空でよい）。
"""


def build_design_user_prompt(parsed: Dict, findings: Optional[List[Dict]] = None) -> str:
    lines: List[str] = []
    lines.append(f"【エピソードタイトル】 {parsed['episode_title']}")
    lines.append(f"【メインフック】 {parsed['hook']}")
    lines.append("")
    lines.append("【素材スライド（### 番号 / セクション / 本文）】")
    for s in parsed["slides"]:
        n = s["number"]
        sec = parsed["section_labels"].get(n, "")
        sec_tag = f"[{sec}]" if sec else ""
        body_one_line = s["body"].replace("\n", " / ")
        lines.append(f"### {n} {sec_tag} {body_one_line}")
    lines.append("")
    research_block = format_research_block(findings or [])
    if research_block:
        lines.append(research_block)
        lines.append("")
    lines.append(
        "上記素材から 5〜9 枚のスライド構成を JSON で出力してください。"
        " 起承転結ラベルは内部のペース配分のヒントに留め、視聴者向けの『起／承／転／結』スライドは作らないこと。"
        " 【参考情報】の具体的な数字や事実は、信頼できそうなものに限り自然に織り込むこと（誇張・捏造禁止）。"
    )
    return "\n".join(lines)


def design_slide_flow(parsed: Dict, findings: Optional[List[Dict]] = None, model: str = "gpt-5") -> Dict:
    client = get_client()
    user = build_design_user_prompt(parsed, findings=findings)
    log(f"design_slide_flow: model={model}")
    resp = client.chat.completions.create(
        model=model,
        messages=[
            {"role": "system", "content": DESIGN_SYSTEM_PROMPT},
            {"role": "user", "content": user},
        ],
        response_format={"type": "json_object"},
    )
    content = resp.choices[0].message.content
    return json.loads(content)


# =========================
# Validator / normalizer
# =========================
ALLOWED_FORMATS = {"format01", "format04", "format10", "format11", "format26"}
SECONDS_BY_FORMAT = {"format01": 7, "format04": 7, "format10": 7, "format11": 8, "format26": 8}
FORBIDDEN_PHRASES = ("起／承／転／結", "起承転結")


def normalize_slide(slide: Dict, index: int) -> Dict:
    fmt = slide.get("format")
    if fmt not in ALLOWED_FORMATS:
        raise ValueError(f"不正な format: {fmt} (slide {index})")

    out: Dict = {
        "slideNumber": index + 1,
        "format": fmt,
    }

    if fmt == "format01":
        title = (slide.get("title") or "").strip()
        subtitle = (slide.get("subtitle") or "").strip()
        if not title:
            raise ValueError("format01 に title がありません")
        out["title"] = title
        if subtitle:
            out["subtitle"] = subtitle

    elif fmt == "format04":
        title = (slide.get("title") or "").strip()
        items = [str(x).strip() for x in (slide.get("items") or []) if str(x).strip()]
        if len(items) < 1:
            raise ValueError("format04 に items がありません")
        items = items[:3]
        while len(items) < 3:
            items.append(items[-1])
        out["title"] = title or "ポイント"
        out["items"] = items

    elif fmt == "format10":
        question = (slide.get("question") or "").strip()
        if not question:
            raise ValueError("format10 に question がありません")
        out["question"] = question
        label = (slide.get("label") or "").strip()
        if label:
            out["label"] = label
        char = (slide.get("characterImage") or "").strip()
        if char:
            out["characterImage"] = char

    elif fmt == "format11":
        situation = (slide.get("situation") or "").strip()
        if not situation:
            raise ValueError("format11 に situation がありません")
        out["situation"] = situation
        label = (slide.get("label") or "").strip()
        if label:
            out["label"] = label
        char = (slide.get("characterImage") or "").strip()
        if char:
            out["characterImage"] = char

    elif fmt == "format26":
        title = (slide.get("powerpointTitle") or slide.get("title") or "").strip()
        items = [
            str(x).strip()
            for x in (slide.get("powerpointItems") or slide.get("items") or [])
            if str(x).strip()
        ]
        if not title:
            raise ValueError("format26 に powerpointTitle がありません")
        if not items:
            raise ValueError("format26 に powerpointItems がありません")
        out["powerpointTitle"] = title
        out["powerpointItems"] = items[:3]

    out["seconds"] = SECONDS_BY_FORMAT[fmt]
    return out


def validate_designed(designed: Dict) -> List[Dict]:
    raw_slides = designed.get("slides") or designed.get("Slides") or []
    if not isinstance(raw_slides, list) or not raw_slides:
        raise ValueError("LLM 出力に slides 配列がありません")

    if raw_slides[0].get("format") != "format01":
        raise ValueError("1枚目は format01 でなければなりません")

    normalized: List[Dict] = []
    for i, s in enumerate(raw_slides):
        ns = normalize_slide(s, i)
        for txt in _all_text_fields(ns):
            for bad in FORBIDDEN_PHRASES:
                if bad in txt:
                    raise ValueError(f"禁止フレーズ '{bad}' がスライド{i+1}に含まれています")
        normalized.append(ns)

    if not (5 <= len(normalized) <= 9):
        log(f"警告: スライド枚数が推奨範囲外です ({len(normalized)} 枚)")

    return normalized


def _all_text_fields(slide: Dict) -> List[str]:
    out: List[str] = []
    for k in ("title", "subtitle", "powerpointTitle", "question", "situation"):
        v = slide.get(k)
        if isinstance(v, str):
            out.append(v)
    for k in ("items", "powerpointItems"):
        v = slide.get(k)
        if isinstance(v, list):
            out.extend([str(x) for x in v])
    return out


# =========================
# Narration generation via OpenAI
# =========================
NARRATION_SYSTEM_PROMPT = """あなたは短尺YouTube動画のナレーター兼台本ライターです。
与えられたスライド構成と元の素材をもとに、各スライドに対応する「読み上げナレーション」を生成してください。

【ルール】
- 視聴者に語りかける自然な話し言葉（です・ます調）
- 各スライドの seconds に合わせた長さ（7秒=90〜110文字、8秒=100〜125文字が目安）
- スライドのタイトルや項目をそのまま読み上げず、内容を自分の言葉で補足・解説する
- 煽り・断定的投資助言・誇張は禁止
- 自然な「間」が取れるよう、読点（、）を適切に入れる
- format01（オープニング）: 視聴者の興味を引くフックで始め、この動画で学べることを一言で示す
- format04（箇条書き）: 3項目を自然につなぎ、流れよく紹介する
- format10（問いかけ）: チャイムが鳴る演出があるので「さて、質問です」「ちょっと考えてみてください」など
  視聴者を一瞬立ち止まらせる導入フレーズから始める。質問文を自然に語りかける形で読む。
- format11（危険な状況）: 緊張感のあるBGMが流れる演出に合わせ、落ち着いた警告口調で。
  「これは本当に危険なパターンです」「ここが一番重要なリスクです」など、
  視聴者に深刻さを伝えるが、煽りすぎず事実ベースで語る。
- format26（解説）: 黒板の内容を掘り下げ、具体例や理由を加えて説明する

【出力】
以下のJSON形式のみ出力。説明文不要。
{
  "narrations": [
    {"slideNumber": 1, "narration": "〜〜〜"},
    {"slideNumber": 2, "narration": "〜〜〜"}
  ]
}
"""


def generate_narrations(slides: List[Dict], parsed: Dict, model: str = "gpt-5") -> None:
    """各スライドに narration フィールドを付与する（in-place）。"""
    client = get_client()

    slides_desc_lines: List[str] = []
    for s in slides:
        fmt = s["format"]
        sn = s["slideNumber"]
        sec = s.get("seconds", 7)
        if fmt == "format01":
            slides_desc_lines.append(
                f"slideNumber={sn}, format={fmt}, seconds={sec}, "
                f"title={s.get('title','')!r}, subtitle={s.get('subtitle','')!r}"
            )
        elif fmt == "format04":
            slides_desc_lines.append(
                f"slideNumber={sn}, format={fmt}, seconds={sec}, "
                f"title={s.get('title','')!r}, items={s.get('items',[])}"
            )
        elif fmt == "format10":
            slides_desc_lines.append(
                f"slideNumber={sn}, format={fmt}, seconds={sec}, "
                f"question={s.get('question','')!r}, label={s.get('label','問いかけ')!r}"
            )
        elif fmt == "format11":
            slides_desc_lines.append(
                f"slideNumber={sn}, format={fmt}, seconds={sec}, "
                f"situation={s.get('situation','')!r}, label={s.get('label','危険な状況')!r}"
            )
        elif fmt == "format26":
            slides_desc_lines.append(
                f"slideNumber={sn}, format={fmt}, seconds={sec}, "
                f"powerpointTitle={s.get('powerpointTitle','')!r}, powerpointItems={s.get('powerpointItems',[])}"
            )

    bodies = "\n".join(
        f"### {src['number']} {src['body'].replace(chr(10), ' / ')}"
        for src in parsed.get("slides", [])
    )
    user_input = (
        f"【エピソード】{parsed['episode_title']}\n"
        f"【メインフック】{parsed['hook']}\n\n"
        f"【スライド構成】\n" + "\n".join(slides_desc_lines) + "\n\n"
        f"【元の素材】\n{bodies}\n\n"
        "上記スライド構成に対応するナレーション（読み上げ原稿）を JSON で出力してください。"
    )

    log(f"generate_narrations: model={model}, slides={len(slides)}枚")
    resp = client.chat.completions.create(
        model=model,
        messages=[
            {"role": "system", "content": NARRATION_SYSTEM_PROMPT},
            {"role": "user", "content": user_input},
        ],
        response_format={"type": "json_object"},
    )
    content = resp.choices[0].message.content
    data = json.loads(content)
    narrations: Dict[int, str] = {
        item["slideNumber"]: item["narration"]
        for item in data.get("narrations", [])
        if isinstance(item, dict) and "slideNumber" in item and "narration" in item
    }

    for slide in slides:
        sn = slide["slideNumber"]
        narration = narrations.get(sn, "")
        if narration:
            slide["narration"] = narration
            log(f"  スライド {sn}: ナレーション {len(narration)}文字")
        else:
            log(f"  スライド {sn}: ナレーション生成失敗")


# =========================
# Image assignment via OpenAI (format26 only)
# =========================
IMAGE_SYSTEM_PROMPT = """あなたは短尺YouTube解説動画のビジュアル編集者です。
各スライドの内容に最も合う画像を、与えられた画像カタログから1枚だけ選びます。

【絶対ルール】
- カタログにあるファイル名のみ使用可。カタログ外のファイル名は禁止
- 各対象スライド（format10/11/26）につき、カタログから1ファイル名を選ぶ
- どうしても適切な画像が無い場合のみ youtube_icon.png を選ぶ（最終手段）
- 同じ画像が連続しないよう、可能であればバリエーションを意識する

【フォーマット別の傾向（参考）】
- format10（問いかけ）: thinking-businessman.png や worried-man-profile.png など「考える・悩む」系が合いやすい
- format11（危険な状況）: stressed-man-worker.png / stressed-woman-worker.png など「追い詰められた・困惑」系が合いやすい
- ただし内容が優先なので、上記に縛られず最も合う画像を選ぶこと

【出力】
以下の JSON のみを出力。説明文は不要。
{
  "assignments": [
    {"slideNumber": 4, "image": "stressed-man-worker.png"},
    {"slideNumber": 6, "image": "floor-plan.png"}
  ]
}
"""


IMAGE_FORMATS = {"format10", "format11", "format26"}

def assign_images_to_slides(
    slides: List[Dict],
    parsed: Dict,
    model: str = "gpt-5",
) -> None:
    """各 format10/11/26 スライドに characterImage フィールドを付与する（in-place）。"""
    target_slides = [s for s in slides if s.get("format") in IMAGE_FORMATS]
    if not target_slides:
        log("画像選定: 対象スライドが無いためスキップ")
        return

    log(f"assign_images_to_slides: model={model}, 対象スライド={len(target_slides)}枚")

    catalog_lines = [f"- {name}: {desc}" for name, desc in IMAGE_CATALOG]
    slide_lines: List[str] = []
    for s in target_slides:
        sn = s["slideNumber"]
        fmt = s.get("format", "")
        narration = s.get("narration", "")
        if fmt == "format10":
            slide_lines.append(
                f"slideNumber={sn}, format={fmt}, question={s.get('question','')!r}, narration={narration!r}"
            )
        elif fmt == "format11":
            slide_lines.append(
                f"slideNumber={sn}, format={fmt}, situation={s.get('situation','')!r}, narration={narration!r}"
            )
        else:
            title = s.get("powerpointTitle", "")
            items = s.get("powerpointItems", [])
            slide_lines.append(
                f"slideNumber={sn}, format={fmt}, title={title!r}, items={items}, narration={narration!r}"
            )

    user_input = (
        f"【エピソード】{parsed.get('episode_title', '')}\n"
        f"【メインフック】{parsed.get('hook', '')}\n\n"
        "【画像カタログ（このファイル名以外を出力したら無効）】\n"
        + "\n".join(catalog_lines)
        + "\n\n【format26 スライド一覧】\n"
        + "\n".join(slide_lines)
        + "\n\n各 slideNumber に最適な画像ファイル名を JSON で出力してください。"
    )

    try:
        client = get_client()
        resp = client.chat.completions.create(
            model=model,
            messages=[
                {"role": "system", "content": IMAGE_SYSTEM_PROMPT},
                {"role": "user", "content": user_input},
            ],
            response_format={"type": "json_object"},
        )
        content = resp.choices[0].message.content
        data = json.loads(content)
    except Exception as e:
        log(f"画像選定失敗（継続）: {e}")
        return

    assignments: Dict[int, str] = {}
    for item in data.get("assignments", []):
        if not isinstance(item, dict):
            continue
        sn = item.get("slideNumber")
        img = (item.get("image") or "").strip()
        if isinstance(sn, int) and img:
            assignments[sn] = img

    for slide in target_slides:
        sn = slide["slideNumber"]
        chosen = assignments.get(sn, DEFAULT_IMAGE_FILE)
        if chosen not in ALLOWED_IMAGE_FILES:
            log(f"  スライド {sn}: 不正な画像名 {chosen!r} → {DEFAULT_IMAGE_FILE} にフォールバック")
            chosen = DEFAULT_IMAGE_FILE
        slide["characterImage"] = IMAGE_PATH_PREFIX + chosen
        log(f"  スライド {sn}: 画像 = {chosen}")


# =========================
# Full mode: 1:1 expansion (素材数だけスライド化)
# =========================
def _truncate(s: str, n: int) -> str:
    s = s.strip()
    return s if len(s) <= n else s[:n]


def _format_title_two_lines(s: str, max_per_line: int = 13) -> str:
    s = s.strip().replace("\n", "")
    if len(s) <= max_per_line:
        return s
    half = len(s) // 2
    for i in range(half, min(len(s), half + 5)):
        if s[i] in ("、", " ", "　"):
            return s[:i] + "\n" + s[i + 1:]
    for i in range(half - 1, max(0, half - 5), -1):
        if s[i] in ("、", " ", "　"):
            return s[:i] + "\n" + s[i + 1:]
    return s[:half] + "\n" + s[half:]


def expand_to_full_slides(parsed: Dict) -> List[Dict]:
    slides_out: List[Dict] = []
    total_src = len(parsed["slides"])

    title_src = parsed.get("hook") or parsed.get("episode_title") or "本編"
    subtitle_src = parsed.get("episode_title") or "知らないと損する"
    slide01 = {
        "format": "format01",
        "title": _format_title_two_lines(_truncate(title_src, 26)),
        "subtitle": _truncate(subtitle_src, 14),
    }
    slides_out.append(normalize_slide(slide01, 0))
    log(f"  スライド 1 / {total_src + 1}: [format01] タイトル「{slide01['title'].replace(chr(10), ' / ')}」")

    for idx, src in enumerate(parsed["slides"], start=1):
        body = src.get("body", "").strip()
        lines = [l.strip() for l in body.split("\n") if l.strip()]
        if not lines:
            log(f"  スライド {idx + 1} / {total_src + 1}: 本文が空のためスキップ")
            continue
        title = _truncate(lines[0], 22)
        if len(lines) == 1:
            items = [_truncate(lines[0], 18)]
        else:
            items = [_truncate(l, 18) for l in lines[1:4]]
        slide26 = {
            "format": "format26",
            "powerpointTitle": title,
            "powerpointItems": items,
        }
        slides_out.append(normalize_slide(slide26, len(slides_out)))
        log(f"  スライド {len(slides_out)} / {total_src + 1}: [format26] 「{title}」 items={len(items)}")

    return slides_out


# =========================
# Main
# =========================
def run(pretext_path: str, out_path: str, model: str, do_research: bool = True, full: bool = True) -> None:
    log(f"pretext を読み込み: {pretext_path}")
    raw = read_pretext(pretext_path)
    parsed = parse_pretext(raw)
    log(
        f"パース完了: episode={parsed['episode_title']!r}, hook={parsed['hook']!r}, "
        f"slides={len(parsed['slides'])}枚, sections={len(set(parsed['section_labels'].values()))}"
    )
    if not parsed["slides"]:
        raise ValueError("素材スライドが抽出できませんでした。pretext のフォーマットを確認してください。")

    if full:
        log("--full モード: 素材を 1:1 でスライド化します（design / research スキップ）")
        slides_json = expand_to_full_slides(parsed)
    else:
        findings: List[Dict] = []
        if do_research:
            findings = gather_research_via_openai(parsed, model=model)
        designed = design_slide_flow(parsed, findings=findings, model=model)
        slides_json = validate_designed(designed)

    generate_narrations(slides_json, parsed, model=model)
    assign_images_to_slides(slides_json, parsed, model=model)

    payload = {"slides": slides_json}

    os.makedirs(os.path.dirname(out_path) or ".", exist_ok=True)
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(payload, f, ensure_ascii=False, indent=2)

    total_sec = sum(s.get("seconds", 0) for s in slides_json)
    fmt_counts: Dict[str, int] = {}
    for s in slides_json:
        fmt_counts[s["format"]] = fmt_counts.get(s["format"], 0) + 1
    fmt_summary = ", ".join(f"{f}×{n}" for f, n in fmt_counts.items())
    log(f"書き出し完了: {out_path}")
    log(f"  合計 {len(slides_json)} 枚 / 約 {total_sec} 秒 ({total_sec // 60}分{total_sec % 60}秒)")
    log(f"  フォーマット内訳: {fmt_summary}")


def main():
    load_dotenv()

    repo_root = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
    default_pretext = os.path.join(repo_root, "pretexts", "1-1.txt")
    default_out = os.path.join(repo_root, "src", "script", "1-1", "script.json")

    p = argparse.ArgumentParser()
    p.add_argument("--pretext", default=default_pretext, help=f"pretext ファイル (default: {default_pretext})")
    p.add_argument("--out", default=default_out, help=f"出力 script.json パス (default: {default_out})")
    p.add_argument("--model", default="gpt-5", help="OpenAI モデル名 (default: gpt-5)")
    p.add_argument("--no-research", action="store_true", help="Web 検索を無効化（オフラインで動かす）")
    p.add_argument(
        "--full",
        default=True,
        action=argparse.BooleanOptionalAction,
        help="素材を 1:1 でスライド化する（デフォルト ON）。集約モードに戻すには --no-full",
    )
    args = p.parse_args()

    run(args.pretext, args.out, args.model, do_research=not args.no_research, full=args.full)


if __name__ == "__main__":
    main()
