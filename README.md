# RP_kingdom

Three.js を使った絵本風 3D 村の試作です。`public/assets/models/Fantasy_House_6.glb`、`public/assets/models/Fantasy_House.glb`、`public/assets/models/windmill.glb` を配置し、通常ビューと MAP ビューを切り替えられる構成にしています。Cloudflare Pages で公開する静的サイトですが、25 MiB を超える GLB / mp4 は Cloudflare R2 から配信する想定です。

## 現在の構成

### 画面遷移と導線

- 初回表示は雲に包まれたイントロ画面で、`ENTER` ボタンまたは Enter キーで村へ降下する導線
- イントロの `ENTER` 後は、MAP 高度（y=75）から地上の HOME 位置までベジェで降下する `intro-enter` トランジション
- 上ナビは左に `ARTIST NAME` ブランド + 時計、右に `HOME`、`Artist` `Company` `Music` `SNS` `Store` `Youtube` のナビボタン、`MAP` トグル、`Language` メニューを表示
- ナビボタンは `site-config.js` の定義（`HOUSE_DESTINATIONS` + `FRONT_HOUSE_DESTINATION` + `VIDEO_BILLBOARDS`）から動的に生成し、表示文言は `i18n.js` の `destinations` で管理
- `HOME` は通常の村ビュー（南側寄りの斜め上視点）へ戻す操作
- `Artist` `Company` `Music` `SNS` `Store` は建物玄関前へズームしたあと、確認ポップアップを経由して外部リンクへ遷移（`Music` は `Spotify` / `Apple Music` / `キャンセル` の3ボタン選択）
- `Youtube` は動画看板の正面にズームし、再生中の映像を見たうえで確認ポップアップから YouTube チャンネルへ遷移。看板フォーカス中のみポーラ角を90度まで許可し、真正面表示の最終補正によるカクつきを抑制
- 確認ポップアップでキャンセルまたは背景クリックをした場合は、フォーカスを解除して通常の村ビューへ戻る
- `MAP` は出発点から垂直に上昇 → 高度を保ったまま中心へスライドする `map-enter` トランジション。`MAP` から各家／看板へは行き先の真上に降下する `map-exit` トランジション
- MAP 中はポーラ角を固定し、画面右上にコンパス（N/E/S/W）と各サービスのクリック可能なMAPラベルを表示。村ビューに戻ると通常の OrbitControls に復帰
- 通常村ビュー / フォーカス時の `maxDistance = 80` で MAP 高度相当まで手動ズームアウト可

### 見え方と演出

- `Artist` だけ別モデル（`Fantasy_House.glb`）、`SNS` は風車モデル（`windmill.glb`）、他の建物（Company / Music / Store）は共通モデル（`Fantasy_House_6.glb`）を使用
- `Fantasy_House_6.glb` を使う通常ハウスは初期値から約1.5倍に拡大し、SNSの風車はMusicハウスとの干渉を避けるため西側（X=-20.4）へ配置
- `Artist` の入口は西側、`SNS` 風車の入口は北側、通常ハウスは各モデルの玄関側に合わせて `doorOffset` / `doorFacing` を個別設定
- `HOME` 視点は `cameraState.village` で、現在は南側寄りから村全体を見下ろす位置に設定。通常ビューのフォグは引き視点でも白くなりすぎないよう `48/130` に調整
- 時計は日本語では `Asia/Tokyo` のみ、日本語以外では `Asia/Tokyo` と選択言語ごとの代表タイムゾーン（例: `Europe/Paris`）を2行表示。時間帯演出は常に `Asia/Tokyo` 基準
- 深夜・朝焼け・昼・午後・夕暮れ・夜の 6 段階で空、フォグ、地面、アンビエント/サン/フィルライト、トーンマッピング露出を補間し、朝夕は太陽位置に応じて影の向きも変化
- 夜間帯（概ね 19 時過ぎ〜翌 5 時前）はカメラに追従する星空と月、月のハロースプライトが徐々に現れる
- クエリパラメータ `?hour=<0-23>` を付けるとその時刻に固定表示（ライティング確認用）
- 建物クリック時はドア位置と向きを基準にズームし、確認ポップアップをドア上にスクリーン投影して表示
- Music ハウスの南側に動画看板（電光掲示板）を設置。フレーム + 動画スクリーン + 支柱を `Group` でまとめ、`HTMLVideoElement` + `THREE.VideoTexture` + `MeshBasicMaterial` で時間帯に左右されない自発光表示
- 動画看板クリック / `Youtube` ナビボタン / MAPラベルクリックで看板正面（`BILLBOARD_FOCUS_DISTANCE`）にズームし、確認ポップアップから外部リンクへ遷移
- 動画看板は通常の村ビュー中のみ再生し、MAP 表示中やタブ非表示時は pause して `VideoTexture` の更新負荷を抑える
- 動画ファイル本体は Cloudflare R2 にホストし、CORS 経由で WebGL テクスチャに使用（リポジトリには含めない）
- `ENTER` 後は上空から降る粒子が家・看板・地面へ集まって世界を形作り、地面だけを薄く先行表示して降下時の距離感を補助
- 村の空きスペースに `FOR SALE` 看板付きの売地/広告枠区画を配置（境界線、杭、看板、立て札の3Dオブジェクト）。Artist 北側にあった `A-02` 区画は削除済み
- 村の導線が分かるよう、`ROAD_PATHS` に基づくアスファルト調の曲線道路を地面上に配置。道路上には木が生成されないよう、ツリー散布の除外エリアにも道路を反映
- HOME 視点での奥行きを出すため、既存の北側林に加えて西側にも追加ツリー散布（`WEST_TREE_SCATTER`）を設定
- 建物モデルは URL ごとにキャッシュしつつ並列読み込みするため、重いモデルがあっても他の建物の表示開始を待たせにくい
- R2 上の `character.glb` を村の中央付近に配置し、GLBに含まれる歩行アニメーションを使って、端から端へ歩くNPC風の移動を実行。端に着くとランダムな時間だけ止まり、反対側へ戻る。建物・売地・看板には簡易障害物判定を付け、ぶつかりそうな場合は方向転換する
- 売地/広告枠区画にホバーすると、区画名、価格、サイズ、説明をカーソル近くのパネルに表示し、区画が少し浮き上がる。クリックすると区画中心へズーム
- 村ビューでは建物ホバー時にツールチップで建物名を表示、建物が僅かに拡大
- `Language` メニューで `日本語` `English` `한국어` `Français` `繁體中文` を切り替え、選択言語は `localStorage` に保存
- ドラッグとクリックを閾値（6px）で分離し、OrbitControls 操作中の誤反応を抑制
- GLB 読み込み時に透明マテリアルを補正して、建物が透けにくい状態へ調整
- 高DPI画面での負荷を抑えるため、レンダリング解像度（最大 1.35）とシャドウマップサイズ（1024）を制限
- タブ非表示時は描画ループを停止し、通常アイドル時は 30fps 相当に間引く。イントロ、カメラ遷移、MAP、ポップアップ、操作直後は 60fps 相当に戻す
- イントロの粒子形成が完了した後は粒子オブジェクトを非表示にし、更新処理を早期 return して常時負荷を下げる

## 起動

`public/` を静的配信して確認する想定です。VS Code の Live Server などを使う場合は `public/index.html` を起点にしてください。

ローカルで簡単に確認する場合:

```bash
cd public
python3 -m http.server 5500
```

ライティング確認は `http://localhost:5500/?hour=20` のように `hour` クエリで時刻固定できます。

## ディレクトリ構成

- `public/`: Cloudflare Pages にそのまま配信する公開物
- `public/index.html`: ナビ、HUD、イントロ、時計、Languageメニュー、コンパス、MAPラベル、ツールチップ、売地パネルのマークアップとスタイル
- `public/assets/image/`: イントロなどで使う画像アセット（`intro-logo.jpg`）
- `public/assets/js/main.js`: 起動処理、シーン/カメラ/ライト構築、ビュー状態管理、アニメーションループ、省電力用の FPS 間引きとタブ非表示時停止
- `public/assets/js/site-config.js`: 建物/看板/売地のID、遷移先 URL、配置、ドア設定、サイズ、動画 URL など非表示設定の定義
- `public/assets/js/i18n.js`: Languageメニュー、ナビ、HUD、ポップアップ、時計ラベル、建物/看板名、売地文言の多言語辞書
- `public/assets/js/camera/focus-camera.js`: ドア基点のフォーカスカメラ算出、ワールド→スクリーン投影
- `public/assets/js/camera/transition-paths.js`: `intro-enter` / `map-enter` / `map-exit` のベジェ軌道生成
- `public/assets/js/interaction/scene-interactions.js`: ポインタ/ホバー/クリック処理、ツールチップと売地パネルの出し分け、ナビボタン → 建物 or 看板の振り分け
- `public/assets/js/scene/world-objects.js`: GLB 読み込み、モデル URL ごとのキャッシュ、並列読み込み、マテリアル補正、建物配置、MAP 用マーカー生成
- `public/assets/js/scene/characters.js`: キャラクターGLBの読み込み、高さ正規化、地面合わせ、アニメーション再生、NPC風の往復移動、簡易障害物回避
- `public/assets/js/scene/land-plots.js`: 売地/広告枠区画の3D生成とホバー/MAP 遷移の更新処理
- `public/assets/js/scene/roads.js`: `ROAD_PATHS` の座標から曲線道路メッシュを生成し、CanvasTexture でアスファルト調の面を作成
- `public/assets/js/scene/video-billboards.js`: 動画看板の3D生成（フレーム + スクリーン + 支柱）、`VideoTexture` 管理、autoplay フォールバック、村ビュー/MAP/タブ状態に応じた再生制御
- `public/assets/js/scene/particle-field.js`: イントロ時に家・看板・地面へ集まる形成粒子の生成、パステル色化、形成完了後の非表示制御
- `public/assets/js/scene/sky-objects.js`: 夜の星空と月（カメラ追従）の生成と表示制御
- `public/assets/js/systems/time-of-day.js`: `Asia/Tokyo` の取得、時間帯ライティング/太陽位置補間、時計 UI 更新
- `public/assets/js/ui/link-popup.js`: 建物ドア／看板上に追従する確認ポップアップの生成と表示制御。単一リンクと複数リンク選択（Music の `Spotify` / `Apple Music`）に対応
- `public/assets/models/`: GLB アセット（`Fantasy_House_6.glb`, `Fantasy_House.glb`, `windmill.glb`, `tree_LOD0.glb`）
- `public/assets/videos/`: 動画看板用 mp4 のローカル置き場（`*.mp4` は `.gitignore` で除外、本番は Cloudflare R2 から配信）
- `resources/`: 公開対象に含めない素材置き場
- `docs/`: 開発メモ

## 文言/配置管理

表示文言は `public/assets/js/i18n.js`、配置・リンク・モデルなどの構造設定は `public/assets/js/site-config.js` で管理します。

- ナビやMAPラベルの表示名は `i18n.js` の `destinations` を変える
- 確認ポップアップ、HUD、時計、売地/広告枠区画の表示文言は `i18n.js` を変える
- 外部リンク（`url`）を差し替える場合は `site-config.js` を変える。複数リンクにする場合は対象の定義に `links: [{ label, url }]` を設定する
- 建物の配置（`position`）、スケール（`scale`）、向き（`rotationY`）を変える
- 建物モデル（`modelUrl`）を差し替える
- ドア位置とドアの向き（`doorOffset`, `doorFacing`）を微調整してフォーカスカメラとポップアップ位置を合わせる
- キャラクターの配置、向き、高さ、移動範囲は `CHARACTERS` の `position` / `rotationY` / `height` / `movement` を変える
- 売地/広告枠区画のサイズ、配置を変える
- 道路の経路と幅は `ROAD_PATHS` の `points` / `width` を変える。木の配置は `TREE_SCATTER`（主に北側）と `WEST_TREE_SCATTER`（西側追加）を変える
- 動画看板の `position` / `rotationY` / `width` / `height`、再生する動画 URL（`videoUrl`、R2 など外部 CDN 推奨）、遷移先 URL（`url`）を変える

`site-config.js` の `id` と `i18n.js` の `destinations.<id>` / `plots.<id>` は対応しています。建物や看板を追加するときは、`site-config.js` に配置やURLを追加し、同じ `id` で `i18n.js` に表示文言を追加してください。`HOUSE_DESTINATIONS` は通常ハウス、`FRONT_HOUSE_DESTINATION` は前面のアーティストハウス、`VIDEO_BILLBOARDS` は動画看板の定義です。`Music` のように複数の遷移先を出す場合は `url` の代わりに `links` を使います。

## UIメモ

- イントロ画面の見た目は `public/index.html` の `#intro-overlay` 周辺で管理
- イントロロゴは `public/assets/image/intro-logo.jpg` を `public/index.html` の `.intro-logo` で表示
- 時計表示は `public/index.html` の `#tod-widget` 周辺、表示内容とタイムゾーン設定は `i18n.js` と `systems/time-of-day.js` で管理
- Languageメニューの見た目は `public/index.html` の `.language-menu` 周辺、言語一覧と文言は `i18n.js` で管理
- MAPラベルの見た目は `public/index.html` の `#map-label-layer` 周辺、表示/クリック制御は `main.js` の `rebuildMapLabels` / `updateMapLabels` 周辺で管理
- 売地/広告枠区画のホバーパネルは `public/index.html` の `#plot-panel` 周辺で管理。表示位置は `interaction/scene-interactions.js` 側でカーソル/タップ位置に合わせて画面内にクランプ
- イントロから村ビューへの降下演出は `camera/transition-paths.js` の `createIntroEnterTransitionPath` で管理
- MAP への切り替え演出は `camera/transition-paths.js` の `createMapEnterTransitionPath` で管理
- `HOME` は外部リンクではなく、`cameraState.village` で定義した通常ビュー位置へ戻る操作
- 時間帯ライティングは `systems/time-of-day.js` の `timeOfDayStops` で管理
- 夜空の星と月は `scene/sky-objects.js` で管理（`getNightProgress` で表示量を算出）
- 売地/広告枠区画の3D生成は `scene/land-plots.js` の `initLandPlots` 周辺で管理
- 道路の見た目と生成は `scene/roads.js` で管理。経路・幅は `site-config.js` の `ROAD_PATHS` で調整
- 確認ポップアップは `ui/link-popup.js` が DOM を生成し、毎フレーム `updatePosition` でドア位置に追従
- 建物クリック時のフォーカス位置は `camera/focus-camera.js` の `applyFocusCamera`（ドアから前に出て少し上から見下ろす）。売地/広告枠区画は `main.js` の `applyPlotFocusCamera` で区画中心へズーム
- 動画看板の見た目（フレーム / スクリーン / 支柱の素材・サイズ）は `scene/video-billboards.js` の定数とマテリアル定義
- 動画看板の再生制御は `scene/video-billboards.js` の `updateVideoBillboardPlayback` で管理。村ビューでは再生し、MAP とタブ非表示時は pause する
- 動画看板のフォーカス距離は `main.js` の `BILLBOARD_FOCUS_DISTANCE`、配置・回転は `site-config.js` の `VIDEO_BILLBOARDS`
- イントロ形成粒子は `scene/particle-field.js` で管理。粒子数、開始高度、分散範囲、パステル変換、形成完了後の停止は同ファイルの定数と `update` で調整
- 描画ループの負荷制御は `main.js` の `ACTIVE_FRAME_INTERVAL` / `IDLE_FRAME_INTERVAL` / `INTERACTION_ACTIVE_WINDOW` と `bindRenderPerformanceEvents` / `shouldUseActiveFrameRate` で管理
- コンパスの見た目・配置は `public/index.html` の `#compass-widget` 周辺、表示制御は `main.js` の `syncUiState`

## Cloudflare Pages で公開する

このプロジェクトは静的サイトなので、Cloudflare Pages の Git integration でそのまま公開できます。

### 事前準備

1. このフォルダを GitHub の新規リポジトリに push する
2. Cloudflare ダッシュボードで `Workers & Pages` を開く
3. `Create application` -> `Pages` -> `Import an existing Git repository` を選ぶ
4. GitHub リポジトリを接続する

### Pages の設定値

- Production branch: `main`
- Framework preset: `None`
- Build command: `exit 0`
- Build output directory: `public`
- Root directory: 空欄

`public/index.html` が公開ルートになるため、Build output directory は `public` を指定します。

### 公開後

- 初回デプロイ完了後、`https://<project-name>.pages.dev` が発行される
- 以後は `main` に push すると自動で本番更新される
- 独自ドメインを使う場合は Pages プロジェクトの `Custom domains` から追加する

## 大きなアセットの配信（Cloudflare R2）

Cloudflare Pages / Workers Static Assets は単一ファイル 25 MiB までのため、`character.glb` や `windmill.glb` のような大きな GLB、動画看板用 mp4 は GitHub / Pages に置かず Cloudflare R2 から配信します。リポジトリ肥大、Pages のアップロード制限、デプロイ遅延を避けるためです。

### R2 に置く対象

- `character.glb`: `CHARACTER_MODEL_URL` で R2 URL を指定
- `windmill.glb`: 40 MiB 前後あるため、本番では R2 にアップロードして `WINDMILL_MODEL_URL` を R2 URL に差し替える
- 動画看板用 mp4: `YOUTUBE_PROMO_VIDEO_URL` などの URL 定数を R2 URL にする

### R2 セットアップ

1. Cloudflare ダッシュボードで `R2 Object Storage` を開き、新規バケットを作成する（例: `rp-kingdom-media`）
2. バケットに `3D_object/character.glb`、`3D_object/windmill.glb`、`youtube-promo.mp4` などをアップロードする
3. 本番ではバケットにカスタムドメインを接続する。暫定確認だけなら `r2.dev` の Public Development URL を有効化して使う
4. 取得した公開 URL をブラウザで直接開き、`200 OK` でファイルが落ちることを確認する
5. GLB / mp4 を外部ドメインから読むため、必要に応じて CORS ポリシーを設定する。動画を `THREE.VideoTexture` として WebGL テクスチャ化する場合は CORS が必要

```json
[
  {
    "AllowedOrigins": ["https://<your-pages-domain>"],
    "AllowedMethods": ["GET", "HEAD"],
    "AllowedHeaders": ["*"],
    "MaxAgeSeconds": 3000
  }
]
```

開発中に Pages ドメインが未確定、または複数の preview URL で確認する場合だけ、`AllowedOrigins` を一時的に `["*"]` にしてもよいです。本番では Pages の本番ドメインに絞るのが無難です。

6. `public/assets/js/site-config.js` の URL 定数を R2 の公開 URL に差し替える

```js
const WINDMILL_MODEL_URL = 'https://assets.example.com/3D_object/windmill.glb';
const CHARACTER_MODEL_URL = 'https://assets.example.com/3D_object/character.glb';
const YOUTUBE_PROMO_VIDEO_URL = 'https://assets.example.com/youtube-promo.mp4';
```

### 差し替え / 追加

- 既存の動画を差し替えるだけなら R2 バケットで同名ファイルを上書きアップロード（コード変更不要）
- 既存の大きな GLB を差し替えるだけなら R2 バケットで同名ファイルを上書きアップロード（コード変更不要）
- 別の URL に変える場合は `site-config.js` の URL 定数を更新
- 動画看板を新規追加するなら `VIDEO_BILLBOARDS` 配列に項目追加

現在のキャラクターモデル URL は `site-config.js` の `CHARACTER_MODEL_URL` で管理します。R2 側の `3D_object/character.glb` を差し替えた場合、同じファイル名ならコード変更は不要です。別名や別バケットにする場合はこの URL を更新してください。

## 動作確認ポイント

1. 初期表示で雲に包まれたイントロ画面が表示され、ナビや HUD が見えない
2. `ENTER` または Enter キーで、雲の上から地上の村ビューへ滑らかに降下する
3. 降下完了後は、ドラッグしても視点が勝手に初期角度へ戻らない
4. 上部の `MAP` を押すと、カメラが引いてから真上寄りの俯瞰に滑らかに切り替わる
5. MAP 中は装飾的な円形線やドットが出ず、画面全体が緑系の地面と建物で素直に見える
6. 村ビューで建物にホバーすると、`Artist` `Company` `Music` `SNS` `Store` を識別できるツールチップが出る
7. 村ビューで建物をクリックすると、ドアの前までズームしてから確認ポップアップがドア上に出る
8. 確認ポップアップでキャンセルすると、近接フォーカスではなく通常の村ビューへ戻る
9. ドラッグでカメラを回しただけでは、ポップアップが出ない
10. 上部の `HOME` で斜め上からの通常村ビューに戻れる
11. 上部の建物ボタンでも該当建物へズームし、確認後に外部リンクへ遷移できる
12. `Music` ボタンまたはMusicハウスクリックでズームし、確認ポップアップに `Spotify` `Apple Music` `キャンセル` の3ボタンが横並びで表示される
13. `SNS` ボタンまたはSNS風車クリックでズームし、確認ポップアップからInstagram公式アカウントへ遷移できる
14. `Youtube` ボタン、動画看板クリック、MAPラベルクリックで看板正面にズームし、映像が再生される。確認ポップアップから YouTube チャンネルへ遷移でき、ズーム完了時にカメラがカクつかない
15. `Asia/Tokyo` の時計が表示され、時間帯に応じて全体の光と影の向きが変わる。日本語以外では2行目に選択言語ごとの代表タイムゾーンも表示される
16. 夜帯（19 時台後半〜翌 5 時台前半）で星空と月が徐々に表示される
17. `?hour=20` などのクエリで任意時刻に固定して見た目を確認できる
18. 売地/広告枠区画にホバーすると、詳細パネルがカーソル近くに表示され、区画が少し浮き上がる
19. 売地/広告枠区画をクリックすると、区画中心へズームできる
20. MAP ビュー右上にコンパスが表示され、各家・看板のクリック可能なMAPラベルで場所が確認できる
21. 通常ビューでホイール／ピンチで MAP 高度近くまで手動ズームアウトできる
22. 建物表面が半透明に抜けず、前後関係が破綻しない
23. `Language` メニューで言語を切り替えると、ナビ、HUD、時計、ポップアップ、MAPラベル、売地パネルの文言が切り替わる
