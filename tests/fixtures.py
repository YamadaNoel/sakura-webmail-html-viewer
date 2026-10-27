"""
さくらWEBメールの画面を模した、テスト用の模擬ページ

2026年10月時点の実際の画面構造をもとにしています。
- 本文は .s-body-content の中に、空白が &nbsp;、改行が <br> に置き換えられた状態で入る
- プレビューは約2,700文字で打ち切られ、末尾に「（続きがあります…）」が付く
- 「続き」ボタンは td.x-toolbar-cell > table.x-btn > ... > button の入れ子構造で、
  クリックを受け付けるのは table 部分。全文を読み込むと x-item-disabled が付く

さくら側の画面が変わったら、ここも実際の構造に合わせて更新してください。
"""
import html
import json

SAMPLE_MAIL = """<!DOCTYPE html>
<html lang="ja"><head><meta charset="UTF-8"><title>テストメール</title>
<style>
/* ----------------------------------
   GLOBAL RESETS
   ---------------------------------- */
body{font-family:sans-serif;color:#606060}
.header{border-top:4px solid #FF0033;text-align:center;padding:8px}
.content-box{background:#F9F9F9;padding:24px 0}
.content{width:80%;margin:auto;background:#fff;padding:16px}
.code{font-size:28px;color:#242323;font-weight:bold}
</style>
</head><body><div class="header"><b>サンプル商店</b></div>
<div class="content-box"><div class="content">
<p>ログイン認証コードは以下です。</p><p class="code">123456</p>
<p><a href="https://example.com">詳しくはこちら</a></p>
<script>document.body.innerHTML='SCRIPT RAN'</script>
</div></div></body></html>"""


def fmt(src):
    """WEBメールと同じ形（&nbsp; と <br>）に整形する"""
    return html.escape(src).replace(" ", "&nbsp;").replace("\n", "<br>\n")


def toolbar_button(id_, label):
    return (
        f'<td class="x-toolbar-cell"><table id="{id_}" class="x-btn x-btn-text-icon">'
        '<tbody class="x-btn-small x-btn-icon-small-left"><tr>'
        '<td class="x-btn-ml"></td><td class="x-btn-mc"><em>'
        f'<button class=" x-btn-text">{label}</button>'
        '</em></td><td class="x-btn-mr"></td></tr></tbody></table></td>'
    )


def page(body_html, more_js="", disabled=False):
    more = toolbar_button("more", "続き")
    if disabled:
        more = more.replace('class="x-btn x-btn-text-icon"', 'class="x-btn x-btn-text-icon x-item-disabled"')
    return f"""<!DOCTYPE html><html><head><meta charset="utf-8"></head><body>
<table class="x-toolbar-ct"><tr>{more}{toolbar_button("tab", "タブで全文")}</tr></table>
<div>差出人: notice@example.jp　件名: テストメール</div>
<div class="s-body-content"><div class="">{body_html}</div></div>
<script>
const more = document.getElementById("more");
more.addEventListener("click", () => {{
  if (more.classList.contains("x-item-disabled")) return;
  setTimeout(() => {{ {more_js} more.classList.add("x-item-disabled"); }}, 300);
}});
</script></body></html>"""


def cases():
    full = fmt(SAMPLE_MAIL)
    cut = 300
    part = fmt(SAMPLE_MAIL[:cut]) + "<br>（続きがあります…）"
    body = 'document.querySelector(".s-body-content > div")'
    return {
        # 全文が最初から表示されている
        "全文表示": page(full, disabled=True),
        # 途中まで → 「続き」で本文が丸ごと差し替わる
        "続き(差し替え)": page(part, f"{body}.innerHTML = {json.dumps(full)};"),
        # 途中まで → 「続き」で残りが後ろに足される
        "続き(追記)": page(
            part,
            f"const b = {body}; b.innerHTML = b.innerHTML.replace('<br>（続きがあります…）', '') + {json.dumps(fmt(SAMPLE_MAIL[cut:]))};",
        ),
        # 本文が後から差し込まれる（メールを開いた直後の状態）
        "後から差し込み": page(
            "",
            "",
            disabled=True,
        ).replace("</script>", f"setTimeout(() => {{ {body}.innerHTML = {json.dumps(full)}; }}, 800);</script>"),
    }
