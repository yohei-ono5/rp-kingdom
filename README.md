# RP_kingdom

Three.js を使った絵本風 3D 村の試作です。`public/assets/models/Fantasy_House_6.glb` と `public/assets/models/Fantasy_House.glb` を配置し、通常ビューと MAP ビューを切り替えられる構成にしています。Cloudflare Pages でそのまま公開できる静的サイトです。

## 現在の構成

### 画面遷移と導線

- 初回表示は雲に包まれたイントロ画面で、`ENTER` ボタンまたは Enter キーで村へ降下する導線
- イントロの `ENTER` 後は、MAP 高度（y=75）から地上の HOME 位置までベジェで降下する `intro-enter` トランジション
- 上ナビは左に `ARTIST NAME` ブランド + 時計、右に `HOME` 、`ARTIST` `COMPANY` `MUSIC` `SHOP` `YOUTUBE` のナビボタンと `MAP` トグル
- ナビボタンは `site-config.js` の定義（`HOUSE_DESTINATIONS` + `FRONT_HOUSE_DESTINATION` + `VIDEO_BILLBOARDS`）から動的に生成
- `HOME` は通常の村ビュー（斜め上からの引き）へ戻す操作
- `ARTIST` `COMPANY` `MUSIC` `SHOP` は建物玄関前へズームしたあと、確認ポップアップを経由して外部リンクへ遷移（`MUSIC` は Spotify アーティストページ）
- `YOUTUBE` は動画看板の正面にズームし、再生中の映像を見たうえで確認ポップアップから YouTube チャンネルへ遷移
- 確認ポップアップでキャンセルまたは背景クリックをした場合は、フォーカスを解除して通常の村ビューへ戻る
- `MAP` は出発点から垂直に上昇 → 高度を保ったまま中心へスライドする `map-enter` トランジション。`MAP` から各家／看板へは行き先の真上に降下する `map-exit` トランジション
- MAP 中はポーラ角を固定し、画面右上にコンパス（N/E/S/W）を表示。村ビューに戻ると通常の OrbitControls に復帰
- 通常村ビュー / フォーカス時の `maxDistance = 80` で MAP 高度相当まで手動ズームアウト可

### 見え方と演出

- `ARTIST` だけ別モデル（`Fantasy_House.glb`）、他の建物は共通モデル（`Fantasy_House_6.glb`）を使用
- 日本時間の時計を表示し、深夜・朝焼け・昼・午後・夕暮れ・夜の 6 段階で空、フォグ、地面、アンビエント/サン/フィルライト、トーンマッピング露出を補間
- 夜間帯（概ね 19 時過ぎ〜翌 5 時前）はカメラに追従する星空と月、月のハロースプライトが徐々に現れる
- クエリパラメータ `?hour=<0-23>` を付けるとその時刻に固定表示（ライティング確認用）
- 建物クリック時はドア位置と向きを基準にズームし、確認ポップアップをドア上にスクリーン投影して表示
- MUSIC ハウスの南側に動画看板（電光掲示板）を設置。フレーム + 動画スクリーン + 支柱を `Group` でまとめ、`HTMLVideoElement` + `THREE.VideoTexture` + `MeshBasicMaterial` で時間帯に左右されない自発光表示
- 動画看板クリック / `YOUTUBE` ナビボタンで看板正面（`BILLBOARD_FOCUS_DISTANCE`）にズームし、確認ポップアップから外部リンクへ遷移
- 動画ファイル本体は Cloudflare R2 にホストし、CORS 経由で WebGL テクスチャに使用（リポジトリには含めない）
- 村の空きスペースに `FOR SALE` 看板付きの売地/広告枠区画を配置（境界線、杭、看板、立て札の3Dオブジェクト）
- 売地/広告枠区画にホバーすると、区画名、価格、サイズ、説明を右下パネルに表示し、区画が少し浮き上がる
- 村ビューでは建物ホバー時にツールチップで建物名を表示、建物が僅かに拡大
- ドラッグとクリックを閾値（6px）で分離し、OrbitControls 操作中の誤反応を抑制
- GLB 読み込み時に透明マテリアルを補正して、建物が透けにくい状態へ調整
- 高DPI画面での負荷を抑えるため、レンダリング解像度（最大 1.35）とシャドウマップサイズ（1024）を制限

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
- `public/index.html`: ナビ、HUD、イントロ、時計、コンパス、ツールチップ、売地パネルのマークアップとスタイル
- `public/assets/js/main.js`: 起動処理、シーン/カメラ/ライト構築、ビュー状態管理、アニメーションループ
- `public/assets/js/site-config.js`: ナビ項目、建物ラベル、遷移先 URL、建物配置、ドア設定、売地/広告枠区画、動画看板の定義
- `public/assets/js/camera/focus-camera.js`: ドア基点のフォーカスカメラ算出、ワールド→スクリーン投影
- `public/assets/js/camera/transition-paths.js`: `intro-enter` / `map-enter` / `map-exit` のベジェ軌道生成
- `public/assets/js/interaction/scene-interactions.js`: ポインタ/ホバー/クリック処理、ツールチップと売地パネルの出し分け、ナビボタン → 建物 or 看板の振り分け
- `public/assets/js/scene/world-objects.js`: GLB 読み込み、マテリアル補正、建物配置、MAP 用マーカー生成
- `public/assets/js/scene/land-plots.js`: 売地/広告枠区画の3D生成とホバー/MAP 遷移の更新処理
- `public/assets/js/scene/video-billboards.js`: 動画看板の3D生成（フレーム + スクリーン + 支柱）、`VideoTexture` 管理、autoplay フォールバック
- `public/assets/js/scene/sky-objects.js`: 夜の星空と月（カメラ追従）の生成と表示制御
- `public/assets/js/systems/time-of-day.js`: 日本時間の取得、時間帯ライティング補間、時計 UI 更新
- `public/assets/js/ui/link-popup.js`: 建物ドア／看板上に追従する確認ポップアップの生成と表示制御
- `public/assets/models/`: 本番で使う GLB アセット（`Fantasy_House_6.glb`, `Fantasy_House.glb`）
- `public/assets/videos/`: 動画看板用 mp4 のローカル置き場（`*.mp4` は `.gitignore` で除外、本番は Cloudflare R2 から配信）
- `resources/`: 公開対象に含めない素材置き場
- `docs/`: 開発メモ

## リンク/配置管理

ナビ項目、建物の表示名、遷移先、配置、ドア位置、売地/広告枠区画、動画看板は `public/assets/js/site-config.js` で管理しています。

- ナビの表示名（`label`）を変える
- 外部リンク（`url`）を差し替える
- 建物の配置（`position`）、スケール（`scale`）、向き（`rotationY`）を変える
- 建物モデル（`modelUrl`）を差し替える
- ドア位置とドアの向き（`doorOffset`, `doorFacing`）を微調整してフォーカスカメラとポップアップ位置を合わせる
- 売地/広告枠区画のタイトル、価格、サイズ、説明、配置を変える
- 動画看板の `position` / `rotationY` / `width` / `height`、再生する動画 URL（`videoUrl`、R2 など外部 CDN 推奨）、遷移先 URL（`url`）、ナビ表示名（`label`）を変える

といった変更は、このファイルを中心に更新できます。`HOUSE_DESTINATIONS` は通常ハウス、`FRONT_HOUSE_DESTINATION` は前面のアーティストハウス、`VIDEO_BILLBOARDS` は動画看板の定義です。

## UIメモ

- イントロ画面の見た目は `public/index.html` の `#intro-overlay` 周辺で管理
- 日本時間の表示は `public/index.html` の `#tod-widget` 周辺で管理
- 売地/広告枠区画のホバーパネルは `public/index.html` の `#plot-panel` 周辺で管理
- イントロから村ビューへの降下演出は `camera/transition-paths.js` の `createIntroEnterTransitionPath` で管理
- MAP への切り替え演出は `camera/transition-paths.js` の `createMapEnterTransitionPath` で管理
- `HOME` は外部リンクではなく、`cameraState.village` で定義した通常ビュー位置へ戻る操作
- 時間帯ライティングは `systems/time-of-day.js` の `timeOfDayStops` で管理
- 夜空の星と月は `scene/sky-objects.js` で管理（`getNightProgress` で表示量を算出）
- 売地/広告枠区画の3D生成は `scene/land-plots.js` の `initLandPlots` 周辺で管理
- 確認ポップアップは `ui/link-popup.js` が DOM を生成し、毎フレーム `updatePosition` でドア位置に追従
- 建物クリック時のフォーカス位置は `camera/focus-camera.js` の `applyFocusCamera`（ドアから前に出て少し上から見下ろす）
- 動画看板の見た目（フレーム / スクリーン / 支柱の素材・サイズ）は `scene/video-billboards.js` の定数とマテリアル定義
- 動画看板のフォーカス距離は `main.js` の `BILLBOARD_FOCUS_DISTANCE`、配置・回転は `site-config.js` の `VIDEO_BILLBOARDS`
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

## 動画ファイルの配信（Cloudflare R2）

動画看板（`VIDEO_BILLBOARDS`）の mp4 は GitHub に置かず Cloudflare R2 でホストしています。リポジトリ肥大とデプロイ遅延を避けるためです。

### セットアップ

1. Cloudflare ダッシュボード → R2 Object Storage で新規バケット作成（例: `rp-kingdom-media`、APAC）
2. mp4 をアップロード
3. バケット設定 → 「パブリック開発 URL」を有効化、`https://pub-xxxxxxxx.r2.dev/<filename>.mp4` 形式の URL を取得
4. CORS ポリシーに以下を追加（`THREE.VideoTexture` は WebGL テクスチャとして使うため CORS 必須）

```json
[
  {
    "AllowedOrigins": ["*"],
    "AllowedMethods": ["GET", "HEAD"],
    "AllowedHeaders": ["*"],
    "MaxAgeSeconds": 3000
  }
]
```

5. `site-config.js` の動画 URL 定数（`YOUTUBE_PROMO_VIDEO_URL` など）を R2 の URL に差し替え

### 動画を差し替える / 追加する

- 既存の動画を差し替えるだけなら R2 バケットで同名ファイルを上書きアップロード（コード変更不要）
- 別の URL に変える場合は `site-config.js` の URL 定数を更新
- 動画看板を新規追加するなら `VIDEO_BILLBOARDS` 配列に項目追加

### コスト

R2 はストレージ 10GB / 月 まで無料、egress（転送量）は無制限で 0 円。トラフィックが増えてもコスト変動なし。

## 動作確認ポイント

1. 初期表示で雲に包まれたイントロ画面が表示され、ナビや HUD が見えない
2. `ENTER` または Enter キーで、雲の上から地上の村ビューへ滑らかに降下する
3. 降下完了後は、ドラッグしても視点が勝手に初期角度へ戻らない
4. 上部の `MAP` を押すと、カメラが引いてから真上寄りの俯瞰に滑らかに切り替わる
5. MAP 中は装飾的な円形線やドットが出ず、地面と建物が素直に見える
6. 村ビューで建物にホバーすると、`ARTIST` `COMPANY` `MUSIC` `SHOP` を識別できるツールチップが出る
7. 村ビューで建物をクリックすると、ドアの前までズームしてから確認ポップアップがドア上に出る
8. 確認ポップアップでキャンセルすると、近接フォーカスではなく通常の村ビューへ戻る
9. ドラッグでカメラを回しただけでは、ポップアップが出ない
10. 上部の `HOME` で斜め上からの通常村ビューに戻れる
11. 上部の建物ボタンでも該当建物へズームし、確認後に外部リンクへ遷移できる
12. `YOUTUBE` ボタンまたは動画看板クリックで看板正面にズームし、映像が再生される。確認ポップアップから YouTube チャンネルへ遷移できる
13. 日本時間の時計が表示され、時間帯に応じて全体の光の具合が変わる
14. 夜帯（19 時台後半〜翌 5 時台前半）で星空と月が徐々に表示される
15. `?hour=20` などのクエリで任意時刻に固定して見た目を確認できる
16. 売地/広告枠区画にホバーすると、詳細パネルが表示され、区画が少し浮き上がる
17. MAP ビュー右上にコンパスが表示され、各家・看板の方角が確認できる
18. 通常ビューでホイール／ピンチで MAP 高度近くまで手動ズームアウトできる
19. 建物表面が半透明に抜けず、前後関係が破綻しない
