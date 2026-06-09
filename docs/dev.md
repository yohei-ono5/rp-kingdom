このリポジトリは Three.js を使ったアーティスト公式サイトの試作です。

## 現在のファイル構成

### HTML / エントリ
- `public/index.html`: 画面全体の UI（ナビ、時計、Languageメニュー、コンパス、MAPラベル、イントロオーバーレイ、建物ツールチップ、売地パネル）とスタイル、importmap で Three.js を読み込み
- `public/assets/js/main.js`: 起動処理、シーン/カメラ/レンダラ構築、ビュー状態管理、カメラ補間、アニメーションループ、省電力用の FPS 間引きとタブ非表示時停止

### 設定
- `public/assets/js/site-config.js`: 通常ハウス 4 件（`HOUSE_DESTINATIONS`）、前面のアーティストハウス（`FRONT_HOUSE_DESTINATION`）、道路（`ROAD_PATHS`）、売地/広告枠区画（`LAND_PLOTS`）、ツリー散布（`TREE_SCATTER` / `WEST_TREE_SCATTER`）、動画看板（`VIDEO_BILLBOARDS`）のID、URL、配置、サイズなど非表示設定
- `public/assets/js/i18n.js`: Languageメニュー、ナビ、HUD、確認ポップアップ、時計ラベル、建物/看板名、売地文言の多言語辞書

### モジュール
- `public/assets/js/camera/focus-camera.js`: ドア基点のフォーカスカメラ計算、ドア位置のワールド座標取得、ワールド→スクリーン投影
- `public/assets/js/camera/transition-paths.js`: `intro-enter` / `map-enter` / `map-exit` のベジェ軌道生成、遷移モード判定
- `public/assets/js/interaction/scene-interactions.js`: ポインタ/ホバー/クリック、ドラッグ閾値、建物・売地・看板レイキャスト、ツールチップ/売地パネル表示制御、ナビボタン → 建物 or 看板の振り分け
- `public/assets/js/scene/world-objects.js`: GLB 読み込み（モデル URL ごとにキャッシュし、並列で開始）、不透明マテリアル補正、建物配置、ナビボタン生成、MAP 用マーカー作成
- `public/assets/js/scene/land-plots.js`: 売地/広告枠の 3D 生成（床・境界・杭・看板テクスチャ）とホバー/MAP 遷移更新
- `public/assets/js/scene/roads.js`: `ROAD_PATHS` から曲線道路メッシュを生成し、CanvasTexture でアスファルト調の面を作成
- `public/assets/js/scene/video-billboards.js`: 動画看板の 3D 生成（フレーム + 動画スクリーン + 支柱を `Group` でまとめる）、`HTMLVideoElement` + `THREE.VideoTexture` + `MeshBasicMaterial` でライト非依存の自発光表示、autoplay 失敗時のジェスチャ・フォールバック、村ビュー/MAP/タブ状態に応じた再生制御
- `public/assets/js/scene/particle-field.js`: イントロ時に家・看板・地面へ集まる形成粒子の生成、パステル色化、形成完了後の非表示制御
- `public/assets/js/scene/sky-objects.js`: カメラ追従の星空と月、ハロースプライト（夜間のみフェードイン）
- `public/assets/js/systems/time-of-day.js`: `Asia/Tokyo` の取得、時間帯ごとのライティング/太陽位置を補間、時計 UI 更新、`?hour` 指定時は固定
- `public/assets/js/ui/link-popup.js`: 確認ポップアップの DOM 生成、アンカー（ドアまたは看板）のワールド座標をスクリーン投影して毎フレーム追従

### アセット
- `public/assets/models/Fantasy_House_6.glb`: 通常の建物（Company / Music / Store）
- `public/assets/models/Fantasy_House.glb`: 前面のアーティストハウス（Artist）
- `public/assets/models/windmill.glb`: SNS 用の風車
- `public/assets/image/intro-logo.jpg`: イントロ画面のロゴ画像
- `public/assets/videos/`: 動画看板用 mp4 のローカル置き場（`.gitignore` で除外、本番は Cloudflare R2 から配信）
- `resources/models/tree_LOD0.glb`: 未使用アセット

## 現状の仕様

- 初回表示は雲に包まれたイントロ画面で、`ENTER` ボタンまたは Enter キーで降下開始。MAP 高度（y=75）から HOME 位置までベジェで降下する `intro-enter` 遷移
- `ENTER` 後は上空から降るパステル粒子が家・看板・地面へ集まって世界を形成する。地面だけは薄く先行表示し、降下時の距離感を補助する。形成完了後の粒子は非表示になり更新処理も止まる
- 上ナビ左側に `ARTIST NAME` ブロック + 時計、右側に `HOME` + 動的生成されるナビボタン（`Artist` `Company` `Music` `SNS` `Store` `Youtube`）+ `MAP` + `Language`
- `HOME` は南側寄りの通常村ビュー（`cameraState.village`）に戻る
- 各ナビボタン／3D オブジェクトのクリックはどちらも、対象前までズーム → 少し待って確認ポップアップ → 移動またはキャンセル
- 建物ボタンはドア前にズーム、`Youtube` ボタンは動画看板の正面（南向き）にズームする
- 確認ポップアップでキャンセル or 背景クリックすると通常の村ビューへ戻る
- 通常村ビュー / フォーカス時の `maxDistance = 80`（MAP 高度相当まで手動で引いて見られる）
- `MAP` は 220×220 に広げた地面を背景まで緑系で見せる俯瞰ビュー（カメラ高度 `MAP_CAMERA_HEIGHT = 75`、target からわずかに +Z オフセットして方角を固定）
- MAP ビュー中はコンパス UI（N/E/S/W）とクリック可能なMAPラベルがフェードイン。`-Z = 北 / +X = 東 / +Z = 南 / -X = 西`
- 時計は日本語では `Asia/Tokyo` のみ、日本語以外では `Asia/Tokyo` と選択言語ごとの代表タイムゾーンを2行表示
- 時間帯演出は常に `Asia/Tokyo` 基準。時間帯（深夜/朝焼け/昼/午後/夕暮れ/夜）で空、フォグ、地面、3 種のライト、太陽位置、トーンマッピング露出を補間
- `?hour=<0-23>` クエリで時刻を固定できる（テスト用）
- 夜間は星空（カメラ追従の Points）と月（Sprite ハロー付き）がフェードイン
- 夜間は各ハウスに窓明かり/玄関ランタンの `PointLight` が自動で灯る（`timeOfDayState.sunIntensity` を元にした nightFactor で減衰、MAP 時は弱める）
- `Fantasy_House_6.glb` を使う通常ハウス（Company / Music / Store）は約1.5倍に拡大。SNS は `windmill.glb` を使い、Musicハウスとの干渉を避けるため西側（X=-20.4）へ配置
- ドアフォーカスは建物ごとの `doorOffset` / `doorFacing` で調整。Artist は西側入口（`doorFacing: [-1, 0, 0]`）、SNS 風車は北側入口（`doorFacing: [0, 0, -1]`）
- 動画看板（`VIDEO_BILLBOARDS`）は Music ハウスの南側に配置、画面が南向きで `MeshBasicMaterial` + `VideoTexture` により時間帯に左右されず自発光表示。クリック / `Youtube` ナビボタン / MAPラベルで看板正面にカメラがズームして確認ポップアップから外部リンク（YouTube）へ
- 動画看板は通常の村ビュー中のみ再生し、MAP 表示中やタブ非表示時は pause して `VideoTexture` のデコード/更新負荷を抑える
- 売地/広告枠区画は `FOR SALE` 看板、境界線、杭で構成した 3D オブジェクトとして表示。Artist 北側にあった `A-02` は削除済み
- 村の主要導線として `ROAD_PATHS` に沿ったアスファルト調の曲線道路を配置。道路上に木が生成されないよう、道路区間をカプセル状のツリー除外エリアとして扱う
- HOME 視点の見栄えを補うため、北側の `TREE_SCATTER` に加えて西側に `WEST_TREE_SCATTER` を追加配置
- 建物モデルは URL ごとにキャッシュしつつ並列で読み込むので、`windmill.glb` のような重いモデルが他の建物の表示開始をブロックしにくい
- PC では売地/広告枠区画ホバーで右下パネルに詳細を表示し、区画が僅かに浮き上がる
- スマホ（タッチ入力）では区画タップで詳細パネルを固定表示。同じ区画の再タップ or 他の場所タップで閉じる
- 村ビューでは建物ホバー時に建物名ツールチップを表示、建物が 1.04 倍にスケール
- ドラッグ閾値（6px）を超えた pointerup ではクリック判定しない
- スマホ幅（≤720px）ではナビ右側がハンバーガーボタン＋ドロップダウンに切替。Languageメニューもこの中に入り、ボタン押下 / ナビ外タップ / Esc で自動クローズ
- 高 DPI 画面は `MAX_RENDER_PIXEL_RATIO = 1.35` でクランプ、シャドウマップは 1024
- タブ非表示時は描画ループを停止し、通常アイドル時は 30fps 相当に間引く。イントロ、カメラ遷移、MAP、ポップアップ、操作直後は 60fps 相当に戻す
- `DirectionalLight` の影カメラは `±25` 単位の直交フラスタムで全建物を含む（影クリップ防止、`shadow.bias = -0.0005`）
- フォグの近/遠距離はビューに応じて補間（村: `48/130`、MAP: `60/180`）

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

- 表示文言は `public/assets/js/i18n.js` に集約。ナビ、MAPラベル、ツールチップ、確認ポップアップ、HUD、時計ラベル、売地パネル/看板の文言はここを編集
- リンク、建物配置、ドア位置、道路、売地/広告枠区画のサイズ/配置、動画看板（位置・サイズ・回転・動画 URL・遷移先 URL）の変更は `public/assets/js/site-config.js` を編集
- `site-config.js` の `id` と `i18n.js` の `destinations.<id>` / `plots.<id>` を一致させる。例: `id: 'company'` なら `destinations.company`
- 新しい建物モデルを追加する場合は `modelUrl` と `doorOffset` / `doorFacing` をセットで定義（フォーカスカメラとポップアップ位置に直結）
- 新しい動画看板を追加する場合は `VIDEO_BILLBOARDS` に項目追加（`id` / `position` / `rotationY` / `width` / `height` / `videoUrl` / `url`）。同じ `id` で `i18n.js` の `destinations` に文言を追加するとナビボタンとMAPラベルに反映される
- 動画ファイルは Cloudflare R2 にホストし、`site-config.js` の URL 定数（`YOUTUBE_PROMO_VIDEO_URL` 等）を R2 の公開 URL に差し替え。ローカル開発用に `public/assets/videos/` に同名 mp4 を置いてもよい（`.gitignore` で除外済み）
- 大きな3Dモデルも Cloudflare R2 にホストする。`windmill.glb` は Pages の単一ファイル 25 MiB 制限を超えるため、本番では `WINDMILL_MODEL_URL` を R2 URL に差し替える
- R2 の CORS ポリシーは `AllowedMethods: ["GET", "HEAD"]` を許可。`AllowedOrigins` は本番 Pages ドメインに絞る。preview が多い開発中だけ `["*"]` を一時利用してよい
- 動画要素は `crossOrigin = 'anonymous'` 必須（R2 など外部 CDN から WebGL に流すため）
- 動画看板の再生制御は `scene/video-billboards.js` の `updateVideoBillboardPlayback` で管理。村ビューでは再生し、MAP とタブ非表示時は pause する
- イントロの見た目調整は `public/index.html` の `#intro-overlay` 周辺。ロゴ画像は `public/assets/image/intro-logo.jpg`
- イントロ形成粒子は `scene/particle-field.js` で管理。粒子数、開始高度、分散範囲、パステル変換、地面先行表示との兼ね合い、形成完了後の停止は同ファイルと `main.js` の `PARTICLE_*` 定数で調整
- 道路の経路と幅は `public/assets/js/site-config.js` の `ROAD_PATHS`、道路メッシュとアスファルト調テクスチャは `public/assets/js/scene/roads.js` で管理
- 時計の表示・配置は `public/index.html` の `#tod-widget` と `.nav-left` 周辺
- Languageメニューの見た目は `public/index.html` の `.language-menu` 周辺、言語一覧・代表タイムゾーン・文言は `public/assets/js/i18n.js`
- コンパスの見た目・位置は `public/index.html` の `#compass-widget` 周辺、表示制御は `public/assets/js/main.js` の `syncUiState`
- MAPラベルの見た目は `public/index.html` の `#map-label-layer` 周辺、生成・クリック処理は `public/assets/js/main.js` の `rebuildMapLabels` / `focusMapLabelSubject` / `updateMapLabels`
- 売地パネルの見た目調整は `public/index.html` の `#plot-panel` 周辺
- カメラワーク調整は `public/assets/js/camera/transition-paths.js`（軌道）と `public/assets/js/main.js` の `CAMERA_TRANSITION_DURATION` / `INTRO_TRANSITION_DURATION`
- `HOME` の通常ビュー位置は `public/assets/js/main.js` の `cameraState.village`。現在は南側寄りのやや引いた視点
- イントロ起点は `cameraState.intro`（現在は MAP と同じ高度・target）
- MAP の高度・距離リミット・フォグは `MAP_CAMERA_HEIGHT` / `MAP_MIN_DISTANCE` / `MAP_MAX_DISTANCE` / `MAP_FOG_NEAR` / `MAP_FOG_FAR`
- フォーカスカメラの距離・高さは `FOCUS_CAMERA_OPTIONS`（`cameraDistance` でドアからの距離、`cameraHeight` で高さ、`targetHeight` で注視点高さ）
- 看板フォーカス時のカメラ距離は `BILLBOARD_FOCUS_DISTANCE`
- 看板の枠・スクリーン・支柱の見た目は `public/assets/js/scene/video-billboards.js` の `FRAME_DEPTH` / `FRAME_THICKNESS` / `POST_RADIUS` / マテリアル定義
- 描画ループの負荷制御は `public/assets/js/main.js` の `ACTIVE_FRAME_INTERVAL` / `IDLE_FRAME_INTERVAL` / `INTERACTION_ACTIVE_WINDOW` と `bindRenderPerformanceEvents` / `shouldUseActiveFrameRate` で管理
- 時間帯ごとの光・太陽位置・影の向きの調整は `public/assets/js/systems/time-of-day.js` の `timeOfDayStops`
- 夜のハウス明かり（色・距離・基準強度）は `public/assets/js/scene/world-objects.js` の `PointLight` 生成部、点灯カーブは `public/assets/js/main.js` の `nightFactor` 式
- 夜空の表示量や星・月の挙動は `public/assets/js/scene/sky-objects.js`
- 確認ポップアップの見た目は `public/assets/js/ui/link-popup.js`（インラインスタイルで DOM 生成）
- スマホ用ハンバーガー／ドロワーのスタイルは `public/index.html` の `.nav-menu-toggle` と `@media (max-width: 720px)` 内の `.nav-right`
- スマホでの区画タップ選択ロジックは `public/assets/js/interaction/scene-interactions.js` の `selectedPlot` 関連
- 影が切れる場合は `sunLight.shadow.camera.left/right/top/bottom` の範囲を広げる（`initLights()` 内）
- 描画負荷が高い場合は `MAX_RENDER_PIXEL_RATIO` または `SHADOW_MAP_SIZE` を下げる。常時負荷は `IDLE_FRAME_INTERVAL`、イントロ後の粒子負荷は `particle-field.js` の完了判定、動画負荷は `updateVideoBillboardPlayback` の再生条件を確認する
