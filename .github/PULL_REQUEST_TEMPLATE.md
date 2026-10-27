## 変更内容

<!-- 何を、なぜ変更したか -->

関連するIssue：#

## 確認したこと

- [ ] `python tests/run_tests.py` がすべて合格した
- [ ] 実際のさくらWEBメールで動作を確認した（アカウントがある場合）
- [ ] 動作に関わる変更なので、`extension/manifest.json` の `version` を上げた
- [ ] 新しい画面パターンへの対応なら、`tests/fixtures.py` にテストケースを追加した

## 安全性の確認

- [ ] iframe の `sandbox` に `allow-scripts` を加えていない
- [ ] メールの内容を外部に送信する処理を加えていない
- [ ] 対象URL（`matches`）や権限を必要以上に広げていない
