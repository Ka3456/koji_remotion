"""
スライド分析関連の関数
- スライド数のカウント
- スライド形式の判定
- 画像要件の判定
"""
import re
from typing import Dict, Optional, Any


def analyze_slides_count_with_llm(pre_text: str, llm_text_func) -> int:
    """
    LLMを使ってpre_text.txtからスライド数を分析
    
    引数:
    - pre_text: 事前テキスト
    - llm_text_func: LLM呼び出し関数（agent.pyのllm_text）
    
    戻り値:
    - スライド数
    """
    # pre_text全体を送る（長すぎる場合は最初の3000文字）
    text_sample = pre_text[:3000] if len(pre_text) > 3000 else pre_text
    
    prompt = f"""以下のプレゼンテーション構成案から、スライドの総数を分析してください。

構成案：
{text_sample}

スライドは以下の2種類があります：
1. 通常のスライド：「スライドN：タイトル」または「#### **N. タイトル**」という形式（例：スライド1：タイトル、スライド2：【結論】不動産投資で失敗しない3つの鉄則！）
2. セクション見出しスライド：「## 【第1部：...】」という形式（例：## 【第1部：区分マンション投資のメリット・デメリット】）

**重要：セクション見出し（## 【...】）も1つのスライドとしてカウントしてください。**

総スライド数（通常のスライド + セクション見出しスライド）を数値のみで回答してください。数値以外は一切書かないでください。

回答：
"""
    
    result = llm_text_func(
        "あなたはプレゼンテーション構成案の分析専門家です。スライド数を正確に数えて、数値のみを回答してください。",
        prompt
    )
    
    # 数値を抽出（最初に見つかった数値を使用）
    numbers = re.findall(r'\d+', result.strip())
    if numbers:
        count = int(numbers[0])
        print(f"LLM分析結果: {count}枚のスライド")
        return count
    
    # フォールバック：正規表現でカウント
    print("LLM分析が失敗したため、正規表現でカウントします...")
    slide_matches = re.findall(r'^スライド\d+：', pre_text, re.MULTILINE)
    count = len(slide_matches)
    print(f"正規表現カウント結果: {count}枚のスライド")
    return count


def determine_slide_format(slide_data: Dict, topic: str = "") -> str:
    """
    原稿内容から最適なスライド形式を自動判定
    
    引数:
    - slide_data: スライドデータ（title, text_items, memo_items, action_itemsを含む）
    - topic: テーマ（オプション）
    
    戻り値: 形式番号（例：「形式1」「形式2」など）
    
    形式1: 箇条書き（デフォルト）
    形式2: 中央に大きく文字（タイトル/強調用）
    形式3: 図解/フローチャート風
    形式4: 表形式
    形式5: 左右/上下比較形式
    形式6: 横3列表示形式
    """
    # スライドの全テキストを結合して分析
    all_text = " ".join([
        slide_data.get('title', ''),
        " ".join(slide_data.get('text_items', [])),
        " ".join(slide_data.get('memo_items', [])),
        " ".join(slide_data.get('action_items', []))  # 動作情報も含める
    ]).lower()
    
    text_items = slide_data.get('text_items', [])
    
    # 形式6: 横3列表示形式の判定（項目が3つで、それぞれの重みが同じ場合）
    if len(text_items) == 3:
        # 各項目の長さをチェック（重みが同じかどうかの簡易判定）
        item_lengths = [len(item) for item in text_items]
        max_length = max(item_lengths) if item_lengths else 0
        min_length = min(item_lengths) if item_lengths else 0
        
        # 長さの差が30%以内なら均等とみなす（重みが同じ）
        if max_length > 0 and (max_length - min_length) / max_length <= 0.3:
            # さらに、各項目が独立した概念かどうかをチェック
            # 番号や記号で始まっていない、独立した項目か
            independent_items = all(not re.match(r'^[\d\-◦•・]', item.strip()) for item in text_items)
            if independent_items:
                return "形式6"
    
    # 形式5: 比較形式の判定
    comparison_keywords = [
        "比較", "対比", "対照", "vs", "versus", "どちら", "選択肢",
        "【区分マンション】", "【一棟アパート】", "【新築】", "【中古】", "【a】", "【b】",
        "メリット", "デメリット", "一方", "もう一方", "左側", "右側", "上段", "下段"
    ]
    if any(kw in all_text for kw in comparison_keywords):
        return "形式5"
    
    # 形式3: フローチャートの判定
    flowchart_keywords = [
        "→", "↓", "↑", "流れ", "プロセス", "手順", "ステップ",
        "まず", "次に", "その後", "最後に", "判定", "判断",
        "yes", "no", "yes:", "no:", "yes：", "no：",
        "決定木", "フロー", "順番", "順序", "段階",
        "物件選定", "融資審査", "購入", "運用", "出口戦略"
    ]
    if any(kw in all_text for kw in flowchart_keywords):
        return "形式3"
    
    # 形式4: 表形式の判定
    table_keywords = [
        "|", "表", "一覧", "リスト", "比較表", "対照表",
        "利回り", "表面利回り", "実質利回り", "家賃", "ローン", "収支",
        "キャッシュフロー", "リスク", "分類", "物件種別"
    ]
    # 表形式は、比較的構造化された情報がある場合
    if any(kw in all_text for kw in table_keywords) and len(slide_data.get('text_items', [])) >= 3:
        return "形式4"
    
    # 形式2: 中央に大きく文字の判定（強調・重要メッセージ）
    emphasis_keywords = [
        "危険サイン", "失敗パターン", "成功の鍵", "重要", "注意",
        "結論", "まとめ", "ポイント", "キーメッセージ", "核心",
        "鉄則", "落とし穴", "今すぐ買うべき", "絶対に避けるべき"
    ]
    # タイトルが短く、強調したいメッセージの場合
    title = slide_data.get('title', '')
    if (len(title) <= 20 and any(kw in all_text for kw in emphasis_keywords)) or \
       (len(title) <= 15 and len(slide_data.get('text_items', [])) <= 2):
        return "形式2"
    
    # デフォルト: 形式1（箇条書き）
    return "形式1"


def determine_image_requirements(
    slide_data: Dict, 
    format_description: str = "", 
    format_number: str = "",
    llm_text_func = None
) -> Dict[str, Any]:
    """
    原稿内容と形式の説明から画像・図の必要性を判定
    
    引数:
    - slide_data: スライドデータ
    - format_description: 形式の説明（FORMAT_RULESから取得）
    - format_number: 形式番号（例：「形式1」）
    - llm_text_func: LLM呼び出し関数（agent.pyのllm_text）
    
    戻り値:
    {
        'needsImage': bool,
        'imagePath': str or None,
        'imagePath1': str or None,  # 3列レイアウト用
        'imagePath2': str or None,  # 3列レイアウト用
        'imagePath3': str or None,  # 3列レイアウト用
        'imageType': str or None,  # 'diagram', 'flowchart', 'comparison', 'table', 'custom', 'three_column'
        'isThreeColumn': bool  # 3列レイアウトかどうか
    }
    """
    # 形式6: 横3列表示形式の場合は必ず画像が必要
    if format_number == "形式6":
        return {
            'needsImage': True,
            'imagePath': None,
            'imagePath1': None,  # 後で生成
            'imagePath2': None,  # 後で生成
            'imagePath3': None,  # 後で生成
            'imageType': 'three_column',
            'isThreeColumn': True
        }
    
    # 明示的に画像パスが指定されている場合（将来の拡張用）
    # 例: 【画像: flowchart_dizziness.png】のような記述があれば抽出
    image_path_match = re.search(r'【画像[：:]\s*([^\】]+)】', " ".join([
        slide_data.get('title', ''),
        " ".join(slide_data.get('text_items', []))
    ]))
    if image_path_match:
        return {
            'needsImage': True,
            'imagePath': image_path_match.group(1).strip(),
            'imagePath1': None,
            'imagePath2': None,
            'imagePath3': None,
            'imageType': 'custom',
            'isThreeColumn': False
        }
    
    # 形式3（フローチャート）の場合は、各ノード（A, B, C, Dなど）に対応する画像が必要
    if format_number == "形式3":
        return {
            'needsImage': True,
            'imagePath': None,
            'imagePath1': None,  # 後でノードごとに生成
            'imagePath2': None,
            'imagePath3': None,
            'imageType': 'flowchart',
            'isThreeColumn': False,
            'isFlowchart': True  # フローチャート用のフラグ
        }
    
    # 形式1（箇条書き）、形式2（中央に大きく文字）の場合は、デフォルトで画像不要
    if format_number in ["形式1", "形式2"]:
        # 明示的に画像が必要と指定されている場合のみ画像を使用
        # 例: 【画像: xxx.png】のような記述があれば使用
        image_path_match = re.search(r'【画像[：:]\s*([^\】]+)】', " ".join([
            slide_data.get('title', ''),
            " ".join(slide_data.get('text_items', []))
        ]))
        if image_path_match:
            return {
                'needsImage': True,
                'imagePath': image_path_match.group(1).strip(),
                'imagePath1': None,
                'imagePath2': None,
                'imagePath3': None,
                'imageType': 'custom',
                'isThreeColumn': False
            }
        # 明示的な指定がなければ画像不要
        return {
            'needsImage': False,
            'imagePath': None,
            'imagePath1': None,
            'imagePath2': None,
            'imagePath3': None,
            'imageType': None,
            'isThreeColumn': False
        }
    
    # 形式3（フローチャート）、形式4（表形式）、形式5（比較形式）の場合は、LLMに厳格に判定させる
    if format_description and llm_text_func:
        slide_title = slide_data.get('title', '')
        text_items_preview = " ".join(slide_data.get('text_items', [])[:3])  # 最初の3項目のみ
        
        prompt = f"""以下のスライド情報と形式の説明を基に、このスライドに画像が**本当に必要かどうか**を厳格に判断してください。

スライドタイトル: {slide_title}
スライド内容（一部）: {text_items_preview}

採用する形式:
{format_description}

【厳格な判断基準】
- 画像が**必須**である場合のみ「必要」と回答してください
- 形式3（フローチャート）の場合：Mermaid記法で表現できる場合は画像は不要。複雑な図解が必要な場合のみ画像が必要
- 形式4（表形式）の場合：マークダウンテーブルで表現できる場合は画像は不要。複雑な表やグラフが必要な場合のみ画像が必要
- 形式5（比較形式）の場合：マークダウンテーブルで表現できる場合は画像は不要。視覚的な比較図が必要な場合のみ画像が必要
- 「あると良い」程度では「不要」と判断してください
- テキストや表記法で十分表現できる場合は「不要」と判断してください

回答は以下のいずれかでお願いします：
- "必要" または "yes": 画像が**必須**である場合のみ
- "不要" または "no": 画像が不要な場合（デフォルトはこちら）

画像が必要な場合、画像の種類も指定してください：
- "flowchart": フローチャート・図解（形式3の場合）
- "comparison": 比較図・対比図（形式5の場合）
- "table": 表形式（形式4の場合）
- "diagram": その他の図解
- "custom": カスタム画像

回答形式：
必要/不要
画像種類（必要の場合のみ）

回答のみを出力してください。説明は不要です。
"""
        
        try:
            result = llm_text_func(
                "あなたはスライドデザインの専門家です。スライドを魅力的にするために画像が必要かどうかを判断してください。",
                prompt
            ).strip()
            
            # 結果を解析
            lines = result.split('\n')
            needs_image = False
            image_type = None
            
            if lines:
                first_line = lines[0].lower()
                if "必要" in first_line or "yes" in first_line:
                    needs_image = True
                    # 2行目に画像種類がある場合
                    if len(lines) > 1:
                        image_type = lines[1].strip().lower()
                        if image_type not in ['flowchart', 'comparison', 'table', 'diagram', 'custom']:
                            image_type = 'custom'
                    else:
                        # 形式から推測
                        if format_number == "形式3":
                            image_type = 'flowchart'
                        elif format_number == "形式4":
                            image_type = 'table'
                        elif format_number == "形式5":
                            image_type = 'comparison'
                        else:
                            image_type = 'custom'
            
            if needs_image:
                return {
                    'needsImage': True,
                    'imagePath': None,
                    'imagePath1': None,
                    'imagePath2': None,
                    'imagePath3': None,
                    'imageType': image_type or 'custom',
                    'isThreeColumn': False
                }
        except Exception as e:
            print(f"警告: 画像必要性判定エラー: {e}")
            # エラー時はデフォルト（画像不要）
    
    # デフォルト: 画像不要
    return {
        'needsImage': False,
        'imagePath': None,
        'imagePath1': None,
        'imagePath2': None,
        'imagePath3': None,
        'imageType': None,
        'isThreeColumn': False,
        'isFlowchart': False
    }


def generate_image_filename(
    slide_number: int, 
    slide_title: str, 
    image_type: str, 
    topic: str = "",
    llm_text_func = None
) -> str:
    """
    スライド番号と内容から画像ファイル名を生成
    形式: スライド番号_英語の名称.png
    
    引数:
    - slide_number: スライド番号
    - slide_title: スライドタイトル
    - image_type: 画像タイプ
    - topic: テーマ（オプション）
    - llm_text_func: LLM呼び出し関数（agent.pyのllm_text）
    
    戻り値:
    - 画像ファイル名（例: "1_decision_flow.png"）
    """
    # LLMを使ってスライドタイトルから適切な英語名を生成
    prompt = f"""以下のスライドタイトルから、画像ファイル名に適した短い英語名を生成してください。

スライドタイトル: {slide_title}
画像タイプ: {image_type}
テーマ: {topic}

要件:
- 小文字の英数字とアンダースコアのみ使用
- 20文字以内
- スライドの内容を端的に表す名前
- ファイル名として適切な形式（例: yield_comparison, loan_flow, property_table, cashflow_chart, risk_diagram）

英語名のみを回答してください。説明は不要です。
"""
    
    if not llm_text_func:
        # llm_text_funcが提供されていない場合は、image_typeを使用
        return f"{slide_number}_{image_type}.png"
    
    try:
        english_name = llm_text_func(
            "あなたはファイル名生成の専門家です。適切な英語のファイル名を生成してください。",
            prompt
        ).strip()
        
        # 不要な文字を除去（改行、空白、特殊文字など）
        english_name = re.sub(r'[^a-z0-9_]', '', english_name.lower())
        
        # 空の場合はimage_typeを使用
        if not english_name:
            english_name = image_type
        
        # 長すぎる場合は切り詰め
        if len(english_name) > 20:
            english_name = english_name[:20]
        
        return f"{slide_number}_{english_name}.png"
    except Exception as e:
        # エラー時はimage_typeを使用
        print(f"警告: 画像ファイル名生成エラー: {e}")
        return f"{slide_number}_{image_type}.png"

