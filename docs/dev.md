このリポジトリは Three.js を使ったアーティスト公式サイトの試作です。

## 現在のファイル構成

### HTML / エントリ
- `public/index.html`: 画面全体の UI（ナビ、時計、コンパス、イントロオーバーレイ、建物ツールチップ、売地パネル）とスタイル、importmap で Three.js を読み込み
- `public/assets/js/main.js`: 起動処理、シーン/カメラ/レンダラ構築、ビュー状態管理、カメラ補間、アニメーションループ

### 設定
- `public/assets/js/site-config.js`: 通常ハウス 3 件（`HOUSE_DESTINATIONS`）、前面のアーティストハウス（`FRONT_HOUSE_DESTINATION`）、売地/広告枠区画（`LAND_PLOTS`）、動画看板（`VIDEO_BILLBOARDS`）

### モジュール
- `public/assets/js/camera/focus-camera.js`: ドア基点のフォーカスカメラ計算、ドア位置のワールド座標取得、ワールド→スクリーン投影
- `public/assets/js/camera/transition-paths.js`: `intro-enter` / `map-enter` / `map-exit` のベジェ軌道生成、遷移モード判定
- `public/assets/js/interaction/scene-interactions.js`: ポインタ/ホバー/クリック、ドラッグ閾値、建物・売地・看板レイキャスト、ツールチップ/売地パネル表示制御、ナビボタン → 建物 or 看板の振り分け
- `public/assets/js/scene/world-objects.js`: GLB 読み込み（モデル URL ごとにキャッシュ）、不透明マテリアル補正、建物配置、ナビボタン生成、MAP 用マーカー作成
- `public/assets/js/scene/land-plots.js`: 売地/広告枠の 3D 生成（床・境界・杭・看板テクスチャ）とホバー/MAP 遷移更新
- `public/assets/js/scene/video-billboards.js`: 動画看板の 3D 生成（フレーム + 動画スクリーン + 支柱を `Group` でまとめる）、`HTMLVideoElement` + `THREE.VideoTexture` + `MeshBasicMaterial` でライト非依存の自発光表示、autoplay 失敗時のジェスチャ・フォールバック
- `public/assets/js/scene/sky-objects.js`: カメラ追従の星空と月、ハロースプライト（夜間のみフェードイン）
- `public/assets/js/systems/time-of-day.js`: 日本時間の取得、時間帯ごとのライティングを補間、時計 UI 更新、`?hour` 指定時は固定
- `public/assets/js/ui/link-popup.js`: 確認ポップアップの DOM 生成、アンカー（ドアまたは看板）のワールド座標をスクリーン投影して毎フレーム追従

### アセット
- `public/assets/models/Fantasy_House_6.glb`: 通常の建物（COMPANY / MUSIC / SHOP）
- `public/assets/models/Fantasy_House.glb`: 前面のアーティストハウス（ARTIST）
- `public/assets/videos/youtube-promo.mp4`: YOUTUBE 看板で再生する mp4 サンプル動画
- `resources/models/tree_LOD0.glb`: 未使用アセット

## 現状の仕様

- 初回表示は雲に包まれたイントロ画面で、`ENTER` ボタンまたは Enter キーで降下開始。MAP 高度（y=75）から HOME 位置までベジェで降下する `intro-enter` 遷移
- 上ナビ左側に `ARTIST NAME` ブロック + 時計（`日本時間 HH:MM:SS`）、右側に `HOME` + 動的生成されるナビボタン（`ARTIST` `COMPANY` `MUSIC` `SHOP` `YOUTUBE`）+ `MAP`
- `HOME` は初期カメラ位置（通常村ビュー）に戻る
- 各ナビボタン／3D オブジェクトのクリックはどちらも、対象前までズーム → 少し待って確認ポップアップ → 移動またはキャンセル
- 建物ボタンはドア前にズーム、`YOUTUBE` ボタンは動画看板の正面（南向き）にズームする
- 確認ポップアップでキャンセル or 背景クリックすると通常の村ビューへ戻る
- 通常村ビュー / フォーカス時の `maxDistance = 80`（MAP 高度相当まで手動で引いて見られる）
- `MAP` は地面 70×70 全面が画面に収まる俯瞰ビュー（カメラ高度 `MAP_CAMERA_HEIGHT = 75`、target からわずかに +Z オフセットして方角を固定）
- MAP ビュー中はコンパス UI（N/E/S/W）が画面右上にフェードイン。`-Z = 北 / +X = 東 / +Z = 南 / -X = 西`
- 日本時間の時計を表示し、時間帯（深夜/朝焼け/昼/午後/夕暮れ/夜）で空、フォグ、地面、3 種のライト、トーンマッピング露出を補間
- `?hour=<0-23>` クエリで時刻を固定できる（テスト用）
- 夜間は星空（カメラ追従の Points）と月（Sprite ハロー付き）がフェードイン
- 夜間は各ハウスに窓明かり/玄関ランタンの `PointLight` が自動で灯る（`timeOfDayState.sunIntensity` を元にした nightFactor で減衰、MAP 時は弱める）
- 動画看板（`VIDEO_BILLBOARDS`）は MUSIC ハウスの南側に配置、画面が南向きで `MeshBasicMaterial` + `VideoTexture` により時間帯に左右されず自発光表示。クリック / `YOUTUBE` ナビボタンで看板正面にカメラがズームして確認ポップアップから外部リンク（YouTube）へ
- 売地/広告枠区画は `FOR SALE` 看板、境界線、杭で構成した 3D オブジェクトとして表示
- PC では売地/広告枠区画ホバーで右下パネルに詳細を表示し、区画が僅かに浮き上がる
- スマホ（タッチ入力）では区画タップで詳細パネルを固定表示。同じ区画の再タップ or 他の場所タップで閉じる
- 村ビューでは建物ホバー時に建物名ツールチップを表示、建物が 1.04 倍にスケール
- ドラッグ閾値（6px）を超えた pointerup ではクリック判定しない
- スマホ幅（≤720px）ではナビ右側がハンバーガーボタン＋ドロップダウンに切替。ボタン押下 / ナビ外タップ / Esc で自動クローズ。時計は元の浮かびスタイル（ナビ下中央）に戻る
- 高 DPI 画面は `MAX_RENDER_PIXEL_RATIO = 1.35` でクランプ、シャドウマップは 1024
- `DirectionalLight` の影カメラは `±25` 単位の直交フラスタムで全建物を含む（影クリップ防止、`shadow.bias = -0.0005`）
- フォグの近/遠距離はビューに応じて補間（村: `28/70`、MAP: `60/180`）

## カメラ遷移

`transition-paths.js` で 3 種類のベジェ軌道を生成、`updateCameraTransition` で `getPoint(eased)` を毎フレーム反映する。

| 遷移モード | 発火条件 | 軌道 |
| --- | --- | --- |
| `intro-enter` | `intro` → `village` | ENTER 後、上空からドリフトしながら HOME へ降下 |
| `map-enter` | `village`/`focus` → `map` | 出発点からほぼ垂直に上昇 → 高度を保ったまま MAP 中心へスライド |
| `map-exit` | `map` → `village`/`focus` | 行き先（target）の真上まで横移動 → 真下に降下して着地 |
| `direct` | 上記以外 | 線形 lerp |

ベジェの制御点は `lerp(fromPosition, toPosition, t)` ベースで全部相対計算。建物の `position` / `rotationY` / `doorOffset` / `doorFacing`、看板の `position` / `rotationY` を `site-config.js` で変えればフォーカスカメラと遷移軌道が自動追従するので、設置ごとの座標微調整は不要。

フォーカスは家（`currentFocusHouse`）と看板（`currentFocusBillboard`）の 2 系統。看板フォーカスは `applyBillboardFocusCamera` が看板の法線方向に `BILLBOARD_FOCUS_DISTANCE = 5.5` 引いた位置から看板中心を見る。

`OrbitControls` の `minDistance` / `maxDistance` / `polarAngle` 制限が遷移中の bezier を歪めないよう、`startCameraTransition` で permissive 値（`0.1` / `250` / `0..π/2`）に切替、遷移完了の completion ブロックでビュー別の正しいリミットへ復帰させる。

## 運用メモ

- リンク、建物ラベル、建物配置、ドア位置、売地/広告枠区画、動画看板（位置・サイズ・回転・動画 URL・遷移先 URL）の変更は `public/assets/js/site-config.js` を編集
- 新しい建物モデルを追加する場合は `modelUrl` と `doorOffset` / `doorFacing` をセットで定義（フォーカスカメラとポップアップ位置に直結）
- 新しい動画看板を追加する場合は `VIDEO_BILLBOARDS` に項目追加（`position` / `rotationY` / `width` / `height` / `videoUrl` / `url` / `label`）。`label` を入れるとナビボタンも自動生成される
- 動画ファイルは `public/assets/videos/` 配下に配置。mp4 (H.264 + AAC) を推奨。サンプル動画の差し替えは `site-config.js` の `YOUTUBE_PROMO_VIDEO_URL` を変更
- イントロの見た目調整は `public/index.html` の `#intro-overlay` 周辺
- 時計の表示・配置は `public/index.html` の `#tod-widget` と `.nav-left` 周辺
- コンパスの見た目・位置は `public/index.html` の `#compass-widget` 周辺、表示制御は `public/assets/js/main.js` の `syncUiState`
- 売地パネルの見た目調整は `public/index.html` の `#plot-panel` 周辺
- カメラワーク調整は `public/assets/js/camera/transition-paths.js`（軌道）と `public/assets/js/main.js` の `CAMERA_TRANSITION_DURATION` / `INTRO_TRANSITION_DURATION`
- `HOME` の通常ビュー位置は `public/assets/js/main.js` の `cameraState.village`
- イントロ起点は `cameraState.intro`（現在は MAP と同じ高度・target）
- MAP の高度・距離リミット・フォグは `MAP_CAMERA_HEIGHT` / `MAP_MIN_DISTANCE` / `MAP_MAX_DISTANCE` / `MAP_FOG_NEAR` / `MAP_FOG_FAR`
- フォーカスカメラの距離・高さは `FOCUS_CAMERA_OPTIONS`（`cameraDistance` でドアからの距離、`cameraHeight` で高さ、`targetHeight` で注視点高さ）
- 看板フォーカス時のカメラ距離は `BILLBOARD_FOCUS_DISTANCE`
- 看板の枠・スクリーン・支柱の見た目は `public/assets/js/scene/video-billboards.js` の `FRAME_DEPTH` / `FRAME_THICKNESS` / `POST_RADIUS` / マテリアル定義
- 時間帯ごとの光の調整は `public/assets/js/systems/time-of-day.js` の `timeOfDayStops`
- 夜のハウス明かり（色・距離・基準強度）は `public/assets/js/scene/world-objects.js` の `PointLight` 生成部、点灯カーブは `public/assets/js/main.js` の `nightFactor` 式
- 夜空の表示量や星・月の挙動は `public/assets/js/scene/sky-objects.js`
- 確認ポップアップの見た目は `public/assets/js/ui/link-popup.js`（インラインスタイルで DOM 生成）
- スマホ用ハンバーガー／ドロワーのスタイルは `public/index.html` の `.nav-menu-toggle` と `@media (max-width: 720px)` 内の `.nav-right`
- スマホでの区画タップ選択ロジックは `public/assets/js/interaction/scene-interactions.js` の `selectedPlot` 関連
- 影が切れる場合は `sunLight.shadow.camera.left/right/top/bottom` の範囲を広げる（`initLights()` 内）
- 描画負荷が高い場合は `MAX_RENDER_PIXEL_RATIO` または `SHADOW_MAP_SIZE` を下げる
