# 実装タスク一覧: イベント開始日時・終了日時分割およびバリデーション

- [/] `task.md` の更新と管理の開始
- [x] HTML マークアップ of 変更 (`index.html`：`eventDateTime` を `eventStartDateTime` と `eventEndDateTime` に分割)
- [x] JS 初期値連動・バリデーションロジックの実装 (`index.html`)
  - [x] 開始日時の change 時、終了日時に「開始日時の1時間後」をセット
  - [x] 終了日時の min 属性に開始日時の値を設定
  - [x] イベント送信時に「終了日時 ≦ 開始日時」の順序チェック、およびエラーメッセージ表示
- [x] JS 保存データ構造の更新 (`index.html`：`startDateTime` と `endDateTime` の保存)
- [x] JS タイムラインレンダリングの更新 (`index.html`：期間範囲表示、同一日時の省略、過去データへのフォールバック)
- [x] E2Eテストスクリプトの修正 (`tests/e2e_test_events.js`：開始/終了日時の入力に対応)
- [x] 自動 E2E テストによる動作確認と検証スクリーンショットの再作成
- [/] 変更内容の GitHub へのコミット・プッシュ
