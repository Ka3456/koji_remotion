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
from openai import OpenAI


def log(msg: str) -> None:
    print(f"[agent] {msg}", flush=True)


# =========================
# OpenAI client
# =========================
def get_client() -> OpenAI:
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        raise ValueError("OPENAI_API_KEY が .env に設定されていません")
    return OpenAI(api_key=api_key, timeout=180)


# =========================
# Pretext loader
# =========================
PRETEXT_ENCODINGS = ("cp932", "utf-8", "utf-8-sig")


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


def gather_research_via_openai(parsed: Dict, model: str = "gpt-4o") -> List[Dict]:
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

【利用可能フォーマット（この3種だけを使う。他は禁止）】
- format01: オープニングタイトル。動画冒頭1枚のみ。{title, subtitle}
    - title: 動画の主題（インパクトのある2行、合計15〜26文字、改行は \\n で表現）
    - subtitle: 視聴者の興味を引く短いキャッチ（8〜14文字、例「知らないと損する」）
- format04: 3カードの箇条書き。目次・要点まとめ・3つの選択肢など。{title, items[3]}
    - title: 16文字以内（例「今日のテーマ」「3つの罠」「結論」）
    - items: 必ず3項目。各12文字以内推奨、最大16文字。短く名詞句で。
- format26: 黒板＋キャラの詳細解説スライド。中盤の説明用。{powerpointTitle, powerpointItems[1-3]}
    - powerpointTitle: 22文字以内、視聴者の手を止めるキャッチコピー
    - powerpointItems: 1〜3項目、各12〜18文字。最重要キーワード1箇所だけ **〜** で強調可
      （**強調** は format26 のみ。各スライドで最大1箇所まで。）

【構成方針】
- 全体で 5〜9 枚に集約する（短いスライド断片を意味のあるまとまりに束ねる）。
- 1枚目は必ず format01。動画全体の「結論／フック」を提示する。
- 2枚目あたりに format04 で「今日話す3つのこと」のような目次を置くと視聴維持に効果的。
- 中盤は format26 を中心に展開。format04 と組み合わせてリズムを作る。
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


def design_slide_flow(parsed: Dict, findings: Optional[List[Dict]] = None, model: str = "gpt-4o") -> Dict:
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
        temperature=0.5,
    )
    content = resp.choices[0].message.content
    return json.loads(content)


# =========================
# Validator / normalizer
# =========================
ALLOWED_FORMATS = {"format01", "format04", "format26"}
SECONDS_BY_FORMAT = {"format01": 7, "format04": 7, "format26": 8}
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
    for k in ("title", "subtitle", "powerpointTitle"):
        v = slide.get(k)
        if isinstance(v, str):
            out.append(v)
    for k in ("items", "powerpointItems"):
        v = slide.get(k)
        if isinstance(v, list):
            out.extend([str(x) for x in v])
    return out


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

    title_src = parsed.get("hook") or parsed.get("episode_title") or "本編"
    subtitle_src = parsed.get("episode_title") or "知らないと損する"
    slide01 = {
        "format": "format01",
        "title": _format_title_two_lines(_truncate(title_src, 26)),
        "subtitle": _truncate(subtitle_src, 14),
    }
    slides_out.append(normalize_slide(slide01, 0))

    for idx, src in enumerate(parsed["slides"], start=1):
        body = src.get("body", "").strip()
        lines = [l.strip() for l in body.split("\n") if l.strip()]
        if not lines:
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

    payload = {"slides": slides_json}

    os.makedirs(os.path.dirname(out_path) or ".", exist_ok=True)
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(payload, f, ensure_ascii=False, indent=2)
    log(f"書き出し完了: {out_path} ({len(slides_json)} 枚)")


def main():
    load_dotenv()

    repo_root = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
    default_pretext = os.path.join(repo_root, "pretexts", "1-1.txt")
    default_out = os.path.join(repo_root, "src", "script", "1-1", "script.json")

    p = argparse.ArgumentParser()
    p.add_argument("--pretext", default=default_pretext, help=f"pretext ファイル (default: {default_pretext})")
    p.add_argument("--out", default=default_out, help=f"出力 script.json パス (default: {default_out})")
    p.add_argument("--model", default="gpt-4o", help="OpenAI モデル名 (default: gpt-4o)")
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
