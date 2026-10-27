---
name: 不具合の報告
about: HTMLメールが表示されない、表示が崩れるなど
title: "[不具合] "
labels: bug
---

## 起きていること

<!-- 例：HTMLメールを開いてもソースのまま表示される／切り替えボタンは出るが中が真っ白 など -->

## 環境

- 拡張機能のバージョン（`chrome://extensions` で確認）：
- ブラウザとバージョン：
- メールを開いた場所：プレビュー ／ タブで全文 ／ その他（　　　）

## 診断結果

HTMLソースが表示されているメールを開いた状態で、開発者ツール（F12）の Console に次のコードを貼り付けて Enter を押し、表示された結果を貼り付けてください。
（初めて貼り付けるときは `allow pasting` と入力するよう求められることがあります）

```javascript
(() => {
  const out = [];
  const norm = (s) => (s || '').replace(/ /g, ' ');
  out.push('URL: ' + location.origin + location.pathname);
  out.push('拡張機能の描画: ' + (document.querySelector('[data-sakura-html-viewer]') ? 'あり' : 'なし'));
  out.push('iframe数: ' + document.querySelectorAll('iframe').length);
  const b = document.querySelector('.s-body-content');
  out.push('本文領域(.s-body-content): ' + (b ? 'あり' : 'なし'));
  let hit = null;
  const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  let n;
  while ((n = w.nextNode())) { if (/<!doctype\s+html/i.test(norm(n.nodeValue))) { hit = n.parentElement; break; } }
  if (hit) {
    const t = norm(hit.parentElement.textContent);
    out.push('ソースのある要素: <' + hit.tagName.toLowerCase() + ' class="' + hit.className + '"> 親: <' + hit.parentElement.tagName.toLowerCase() + ' class="' + hit.parentElement.className + '">');
    out.push('文字数: ' + t.length + ' / </html>あり: ' + /<\/html>/i.test(t) + ' / 途中で切れている: ' + /続きがあります/.test(t));
  } else {
    out.push('ソースのある要素: 見つからない');
  }
  const more = [...document.querySelectorAll('*')].filter((e) => (e.textContent || '').replace(/\s/g, '') === '続き' && e.offsetParent !== null);
  out.push('「続き」ボタン: ' + more.map((e) => e.tagName.toLowerCase() + '.' + String(e.className).trim()).join(' > '));
  return out.join('\n');
})()
```

```
（ここに結果を貼り付け）
```

## スクリーンショット（任意）

<!-- メールの本文・アドレスなど個人情報が写らないよう、必要に応じて隠してください -->
