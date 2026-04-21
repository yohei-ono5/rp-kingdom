このリポジトリは Three.js を使ったアーティスト公式サイトの試作です。

現在の実装メモ:
- `public/index.html`: 画面全体の UI、イントロオーバーレイ、ナビ、ツールチップ
- `public/assets/js/main.js`: Three.js シーン、カメラ制御、イントロ降下、MAP 切替、ホバー処理
- `public/assets/js/site-config.js`: ナビ項目、建物ラベル、外部リンク、建物配置
- `public/assets/models/Fantasy_House_6.glb`: 本番表示している建物モデル
- `resources/models/tree_LOD0.glb`: 未使用アセット

現状の仕様:
- 初回表示は雲に包まれたイントロ画面
- `ENTER` で地上の村ビューへ降下
- 上ナビは `HOME` `COMPANY` `YOUTUBE` `SHOP` `MAP`
- `HOME` は初期カメラ位置に戻る
- `COMPANY` `YOUTUBE` `SHOP` は確認ポップアップ付きの外部リンク
- `MAP` は地面と建物を見せるシンプルな俯瞰ビュー
- 村ビューではホバー時に建物ラベルを表示

運用メモ:
- リンクや建物ラベルの変更は `public/assets/js/site-config.js` を編集する
- イントロの見た目調整は `public/index.html` の `#intro-overlay` 周辺を編集する
- カメラワーク調整は `public/assets/js/main.js` の `cameraTransition` 周辺を編集する
