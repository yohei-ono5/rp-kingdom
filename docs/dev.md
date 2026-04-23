このリポジトリは Three.js を使ったアーティスト公式サイトの試作です。

現在の実装メモ:
- `public/index.html`: 画面全体の UI、イントロオーバーレイ、ナビ、時計、ツールチップ、売地パネル
- `public/assets/js/main.js`: Three.js シーン、カメラ制御、イントロ降下、MAP 切替、時間帯ライティング、売地区画、ホバー処理
- `public/assets/js/site-config.js`: ナビ項目、建物ラベル、外部リンク、建物配置、売地/広告枠区画
- `public/assets/models/Fantasy_House_6.glb`: 本番表示している建物モデル
- `public/assets/models/Fantasy_House.glb`: 前景装飾用の建物モデル
- `resources/models/tree_LOD0.glb`: 未使用アセット

現状の仕様:
- 初回表示は雲に包まれたイントロ画面
- `ENTER` で地上の村ビューへ降下
- 上ナビは `HOME` `COMPANY` `YOUTUBE` `SHOP` `MAP`
- `HOME` は初期カメラ位置に戻る
- `COMPANY` `YOUTUBE` `SHOP` は確認ポップアップ付きの外部リンク
- 確認ポップアップでキャンセルまたは背景クリックをした場合は、通常の村ビューへ戻る
- `MAP` は地面と建物を見せるシンプルな俯瞰ビュー
- 日本時間の時計を表示し、時間帯に応じて空、フォグ、地面、ライトを調整する
- 売地/広告枠区画は `FOR SALE` 看板と境界線を持つ3Dオブジェクトとして表示する
- 売地/広告枠区画にホバーすると右下パネルに詳細を表示する
- 村ビューではホバー時に建物ラベルを表示

運用メモ:
- リンク、建物ラベル、建物配置、売地/広告枠区画の変更は `public/assets/js/site-config.js` を編集する
- イントロの見た目調整は `public/index.html` の `#intro-overlay` 周辺を編集する
- 時計表示の見た目調整は `public/index.html` の `#tod-widget` 周辺を編集する
- 売地パネルの見た目調整は `public/index.html` の `#plot-panel` 周辺を編集する
- カメラワーク調整は `public/assets/js/main.js` の `cameraTransition` 周辺を編集する
- HOME の通常ビュー位置は `public/assets/js/main.js` の `cameraState.village` を編集する
- 時間帯ごとの光の調整は `public/assets/js/main.js` の `timeOfDayStops` を編集する
- 描画負荷が高い場合は `MAX_RENDER_PIXEL_RATIO` または `SHADOW_MAP_SIZE` を下げる
