このリポジトリは Three.js を使ったアーティスト公式サイトの試作です。

## 現在のファイル構成

### HTML / エントリ
- `public/index.html`: 画面全体の UI（ナビ、イントロオーバーレイ、時計、建物ツールチップ、売地パネル）とスタイル、importmap で Three.js を読み込み
- `public/assets/js/main.js`: 起動処理、シーン/カメラ/レンダラ構築、ビュー状態管理、カメラ補間、アニメーションループ

### 設定
- `public/assets/js/site-config.js`: 通常ハウス 3 件（`HOUSE_DESTINATIONS`）、前面のアーティストハウス（`FRONT_HOUSE_DESTINATION`）、売地/広告枠区画（`LAND_PLOTS`）

### モジュール
- `public/assets/js/camera/focus-camera.js`: ドア基点のフォーカスカメラ計算、ドア位置のワールド座標取得、ワールド→スクリーン投影
- `public/assets/js/camera/transition-paths.js`: `map-enter` と `intro-enter` のベジェ軌道生成、遷移モード判定
- `public/assets/js/interaction/scene-interactions.js`: ポインタ/ホバー/クリック、ドラッグ閾値、建物・売地レイキャスト、ツールチップ/売地パネル表示制御
- `public/assets/js/scene/world-objects.js`: GLB 読み込み（モデル URL ごとにキャッシュ）、不透明マテリアル補正、建物配置、ナビボタン生成、MAP 用マーカー作成
- `public/assets/js/scene/land-plots.js`: 売地/広告枠の 3D 生成（床・境界・杭・看板テクスチャ）とホバー/MAP 遷移更新
- `public/assets/js/scene/sky-objects.js`: カメラ追従の星空と月、ハロースプライト（夜間のみフェードイン）
- `public/assets/js/systems/time-of-day.js`: 日本時間の取得、時間帯ごとのライティングを補間、時計 UI 更新、`?hour` 指定時は固定
- `public/assets/js/ui/link-popup.js`: 確認ポップアップの DOM 生成、ドアのワールド座標をスクリーン投影して毎フレーム追従

### アセット
- `public/assets/models/Fantasy_House_6.glb`: 通常の建物（COMPANY / YOUTUBE / SHOP）
- `public/assets/models/Fantasy_House.glb`: 前面のアーティストハウス（ARTIST）
- `resources/models/tree_LOD0.glb`: 未使用アセット

## 現状の仕様

- 初回表示は雲に包まれたイントロ画面で、`ENTER` ボタンまたは Enter キーで降下開始
- 上ナビは `HOME` + 動的生成される建物ボタン（`ARTIST` `COMPANY` `YOUTUBE` `SHOP`）+ `MAP`
- `HOME` は初期カメラ位置（通常村ビュー）に戻る
- 建物ボタンとクリックはどちらも、ドア前までズーム → 少し待って確認ポップアップ → 移動またはキャンセル
- 確認ポップアップでキャンセル or 背景クリックすると通常の村ビューへ戻る
- `MAP` は地面と建物を見せるシンプルな俯瞰ビュー（MAP 中は上下回転ロック）
- 日本時間の時計を表示し、時間帯（深夜/朝焼け/昼/午後/夕暮れ/夜）で空、フォグ、地面、3 種のライト、トーンマッピング露出を補間
- `?hour=<0-23>` クエリで時刻を固定できる（テスト用）
- 夜間は星空（カメラ追従の Points）と月（Sprite ハロー付き）がフェードイン
- 夜間は各ハウスに窓明かり/玄関ランタンの `PointLight` が自動で灯る（`timeOfDayState.sunIntensity` を元にした nightFactor で減衰、MAP 時は弱める）
- 売地/広告枠区画は `FOR SALE` 看板、境界線、杭で構成した 3D オブジェクトとして表示
- PC では売地/広告枠区画ホバーで右下パネルに詳細を表示し、区画が僅かに浮き上がる
- スマホ（タッチ入力）では区画タップで詳細パネルを固定表示。同じ区画の再タップ or 他の場所タップで閉じる
- 村ビューでは建物ホバー時に建物名ツールチップを表示、建物が 1.04 倍にスケール
- ドラッグ閾値（6px）を超えた pointerup ではクリック判定しない
- スマホ幅（≤720px）ではナビ右側がハンバーガーボタン＋ドロップダウンに切替。ボタン押下 / ナビ外タップ / Esc で自動クローズ
- 高 DPI 画面は `MAX_RENDER_PIXEL_RATIO = 1.35` でクランプ、シャドウマップは 1024

## 運用メモ

- リンク、建物ラベル、建物配置、ドア位置、売地/広告枠区画の変更は `public/assets/js/site-config.js` を編集
- 新しい建物モデルを追加する場合は `modelUrl` と `doorOffset` / `doorFacing` をセットで定義（フォーカスカメラとポップアップ位置に直結）
- イントロの見た目調整は `public/index.html` の `#intro-overlay` 周辺
- 時計表示の見た目調整は `public/index.html` の `#tod-widget` 周辺
- 売地パネルの見た目調整は `public/index.html` の `#plot-panel` 周辺
- カメラワーク調整は `public/assets/js/camera/transition-paths.js`（軌道）と `public/assets/js/main.js` の `CAMERA_TRANSITION_DURATION` / `INTRO_TRANSITION_DURATION` / `MAP_PULLBACK_*`
- `HOME` の通常ビュー位置は `public/assets/js/main.js` の `cameraState.village`
- フォーカスカメラの距離・高さは `public/assets/js/main.js` の `FOCUS_CAMERA_OPTIONS`
- 時間帯ごとの光の調整は `public/assets/js/systems/time-of-day.js` の `timeOfDayStops`
- 夜のハウス明かり（色・距離・基準強度）は `public/assets/js/scene/world-objects.js` の `PointLight` 生成部、点灯カーブは `public/assets/js/main.js` の `nightFactor` 式
- 夜空の表示量や星・月の挙動は `public/assets/js/scene/sky-objects.js`
- 確認ポップアップの見た目は `public/assets/js/ui/link-popup.js`（インラインスタイルで DOM 生成）
- スマホ用ハンバーガー／ドロワーのスタイルは `public/index.html` の `.nav-menu-toggle` と `@media (max-width: 720px)` 内の `.nav-right`
- スマホでの区画タップ選択ロジックは `public/assets/js/interaction/scene-interactions.js` の `selectedPlot` 関連
- 描画負荷が高い場合は `MAX_RENDER_PIXEL_RATIO` または `SHADOW_MAP_SIZE` を下げる
