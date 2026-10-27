// さくらのレンタルサーバ WEBメール HTML表示（非公式）
// https://github.com/YamadaNoel/sakura-webmail-html-viewer
//
// さくらのWEBメールは、HTMLメールをソースのまま文字で表示します。
// この拡張機能は、そのソースを見つけて、スクリプトを実行しない安全なiframe内で描画し直します。
// プレビューが途中で切れている場合は、WEBメールの「続き」ボタンを自動で押して全文を読み込みます。
(() => {
  // ------------------------------------------------------------------
  // WEBメールの画面構造に依存する設定
  // さくら側の画面が変わったときは、まずここを見直してください。
  // ------------------------------------------------------------------
  const CONFIG = {
    // 本文が入る領域（この中なら、末尾の </html> が欠けていても対象にする）
    bodySelector: '.s-body-content',
    // プレビューが途中で切れているときに末尾に付く文言
    truncatedText: /続きがあります/,
    // 全文を読み込むボタンの表示文字（空白を除いた完全一致）
    moreButtonLabel: '続き',
    // ボタンが無効状態（全文読み込み済み）であることを示すセレクタ
    disabledSelector: '.x-item-disabled, [disabled]',
    // 「続き」を自動で押す回数の上限（1通あたり）と間隔(ms)
    maxAutoClicks: 10,
    clickIntervalMs: 1500,
  };

  const LOG = '[さくらWEBメール HTML表示]';
  const START = /<!doctype\s+html|<html[\s>]/i;
  const END = /<\/(html|body)\s*>/i;
  const MARK = 'data-sakura-html-viewer';
  const SKIP = new Set(['SCRIPT', 'STYLE', 'NOSCRIPT', 'TEXTAREA', 'HEAD', 'TITLE', 'IFRAME', 'BUTTON']);

  // WEBメールは空白を &nbsp; に置き換えて表示するので、普通の空白に戻す
  const norm = (s) => (s || '').replace(/[   　]/g, ' ').replace(/​/g, '');

  // ---- HTMLソースの検出 ----

  function isCandidate(el) {
    if (SKIP.has(el.tagName) || el.closest('[' + MARK + ']') || el.querySelector('[' + MARK + ']')) return false;
    const t = norm(el.textContent);
    if (t.length < 50 || !START.test(t)) return false;
    return END.test(t) || !!el.closest(CONFIG.bodySelector);
  }

  // HTMLソースを丸ごと含む、いちばん内側の要素を探す
  function findTargets() {
    const found = [];
    document.querySelectorAll('body *').forEach((el) => {
      if (!isCandidate(el)) return;
      for (const child of el.children) {
        if (isCandidate(child)) return;
      }
      found.push(el);
    });
    return found;
  }

  // 要素の文字列から <!DOCTYPE ...> 〜 </html> の部分だけを切り出す
  function extract(el) {
    const t = norm(el.innerText || el.textContent);
    const s = t.search(START);
    let e = -1;
    let m;
    const re = /<\/html\s*>/gi;
    while ((m = re.exec(t))) e = m.index + m[0].length;
    if (e < 0) {
      const rb = /<\/body\s*>/gi;
      while ((m = rb.exec(t))) e = m.index + m[0].length;
    }
    return t.slice(s, e > s ? e : undefined);
  }

  // ---- 「続き」ボタンの自動クリック ----

  let lastClick = 0;
  let clickCount = 0;

  // ボタンは入れ子構造（td > table > ... > button）なので、いちばん内側を押す
  function findMoreButton() {
    const hits = [...document.querySelectorAll('*')].filter((el) =>
      norm(el.textContent).replace(/\s/g, '') === CONFIG.moreButtonLabel && el.offsetParent !== null);
    if (!hits.length) return null;
    const inner = hits[hits.length - 1];
    if (inner.closest(CONFIG.disabledSelector)) return null;
    return inner;
  }

  function loadRest() {
    const now = Date.now();
    if (now - lastClick > 10000) clickCount = 0; // 別のメールを開いたらリセット
    if (now - lastClick < CONFIG.clickIntervalMs || clickCount >= CONFIG.maxAutoClicks) return;
    const btn = findMoreButton();
    if (!btn) return;
    lastClick = now;
    clickCount++;
    for (const type of ['mouseover', 'mousedown', 'mouseup', 'click']) {
      btn.dispatchEvent(new MouseEvent(type, { bubbles: true, cancelable: true, view: window, button: 0 }));
    }
  }

  // ---- 描画 ----

  function render(el) {
    const text = norm(el.textContent);
    if (CONFIG.truncatedText.test(text) && !END.test(text)) {
      loadRest(); // 全文がそろってから描画する
      return;
    }

    let html = extract(el);
    if (!START.test(html)) return;
    el.setAttribute(MARK, '1');

    // リンクは新しいタブで開く
    const base = '<base target="_blank">';
    html = /<head[^>]*>/i.test(html)
      ? html.replace(/<head[^>]*>/i, (m) => m + base)
      : base + html;

    // 元のソース表示は消さずに隠して取っておく
    const source = document.createElement('div');
    while (el.firstChild) source.appendChild(el.firstChild);
    source.style.display = 'none';

    const bar = document.createElement('div');
    bar.style.cssText = 'margin:4px 0;font:12px sans-serif;white-space:normal;';
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.textContent = 'ソース表示に切り替え';
    btn.style.cssText = 'font-size:12px;padding:2px 8px;cursor:pointer;';
    bar.appendChild(btn);

    const frame = document.createElement('iframe');
    // allow-scripts を付けないので、メール内のスクリプトは一切動かない
    frame.setAttribute('sandbox', 'allow-same-origin allow-popups allow-popups-to-escape-sandbox');
    frame.style.cssText = 'display:block;width:100%;min-width:min(680px,95vw);min-height:200px;border:1px solid #ddd;background:#fff;';
    frame.srcdoc = html;

    const fit = () => {
      try {
        const d = frame.contentDocument;
        if (!d) return;
        const h = Math.max(d.documentElement.scrollHeight, d.body ? d.body.scrollHeight : 0);
        frame.style.height = (h + 16) + 'px';
      } catch (e) { /* 何もしない */ }
    };
    frame.addEventListener('load', () => {
      fit();
      try {
        const d = frame.contentDocument;
        d.querySelectorAll('img').forEach((img) => img.addEventListener('load', fit));
        new ResizeObserver(fit).observe(d.documentElement);
      } catch (e) { /* 何もしない */ }
    });

    btn.addEventListener('click', () => {
      const showingHtml = frame.style.display !== 'none';
      frame.style.display = showingHtml ? 'none' : 'block';
      source.style.display = showingHtml ? 'block' : 'none';
      btn.textContent = showingHtml ? 'HTML表示に切り替え' : 'ソース表示に切り替え';
      if (!showingHtml) fit();
    });

    el.append(bar, frame, source);
  }

  // ---- 監視 ----

  let timer = null;
  const scan = () => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      try { findTargets().forEach(render); } catch (e) { console.warn(LOG, e); }
    }, 300);
  };

  console.info(LOG, '読み込み済み');
  scan();
  new MutationObserver(scan).observe(document.documentElement, {
    childList: true,
    subtree: true,
    characterData: true,
  });
})();
