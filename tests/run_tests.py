"""
さくらWEBメール HTML表示 の自動テスト

本物の拡張機能をChromiumに読み込み、さくらWEBメールのURLへのアクセスを
模擬ページ（tests/fixtures.py）に差し替えて動作を確認します。
さくらのアカウントが無くても実行できます。

使い方:
    pip install playwright
    python -m playwright install chromium
    python tests/run_tests.py
"""
import asyncio
import pathlib
import sys
import tempfile

from playwright.async_api import async_playwright

sys.path.insert(0, str(pathlib.Path(__file__).parent))
import fixtures  # noqa: E402

ROOT = pathlib.Path(__file__).resolve().parent.parent
EXT = ROOT / "extension"
BASE = "https://secure.sakura.ad.jp/rscontrol/rs/webmail2/"
EXPECTED = "123456"  # サンプルメール本文に含まれる文字


async def run_case(ctx, name, html):
    page = await ctx.new_page()

    async def handle(route):
        await route.fulfill(status=200, content_type="text/html; charset=utf-8", body=html)

    await page.route(BASE + "**", handle)
    await page.goto(BASE + "?test=" + name)
    await page.wait_for_timeout(4000)

    frames = page.locator("[data-sakura-html-viewer] iframe")
    ok = await frames.count() == 1
    text = ""
    if ok:
        frame = await (await frames.first.element_handle()).content_frame()
        text = await frame.inner_text("body")
        ok = EXPECTED in text
    script_ran = "SCRIPT RAN" in text
    await page.close()
    return ok and not script_ran, text[:40].replace("\n", " ")


async def main():
    results = []
    with tempfile.TemporaryDirectory() as profile:
        async with async_playwright() as p:
            ctx = await p.chromium.launch_persistent_context(
                profile,
                headless=False,
                args=[
                    "--headless=new",
                    f"--disable-extensions-except={EXT}",
                    f"--load-extension={EXT}",
                ],
            )
            for name, html in fixtures.cases().items():
                ok, sample = await run_case(ctx, name, html)
                results.append(ok)
                print(("OK  " if ok else "NG  ") + name + "  | " + sample)
            await ctx.close()
    if not all(results):
        sys.exit(1)
    print("すべてのテストに合格しました")


asyncio.run(main())
