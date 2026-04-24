# RP_kingdom

Three.js を使った絵本風 3D 村の試作です。`public/assets/models/Fantasy_House_6.glb` と `public/assets/models/Fantasy_House.glb` を配置し、通常ビューと MAP ビューを切り替えられる構成にしています。Cloudflare Pages でそのまま公開できる静的サイトです。

## 現在の構成

### 画面遷移と導線

- 初回表示は雲に包まれたイントロ画面で、`ENTER` ボタンまたは Enter キーで村へ降下する導線
- イントロの `ENTER` 後は、雲の上から地上の村ビューへ降りる曲線的なカメラワーク（`intro-enter` トランジション）
- 上ナビは左に `HOME` 、右に `ARTIST` `COMPANY` `YOUTUBE` `SHOP` の建物ボタンと `MAP` トグル
- 建物ボタンは `site-config.js` の定義から動的に生成
- `HOME` は通常の村ビュー（斜め上からの引き）へ戻す操作
- `ARTIST` `COMPANY` `YOUTUBE` `SHOP` は建物玄関前へズームしたあと、確認ポップアップを経由して外部リンクへ遷移
- 確認ポップアップでキャンセルまたは背景クリックをした場合は、建物フォーカスを解除して通常の村ビューへ戻る
- `MAP` は少し引いてから真上へ入る滑らかな俯瞰ビュー切替（`map-enter` トランジション）
- MAP 中はポーラ角を固定し、村ビューに戻ると通常の OrbitControls に復帰

### 見え方と演出

- `ARTIST` だけ別モデル（`Fantasy_House.glb`）、他の建物は共通モデル（`Fantasy_House_6.glb`）を使用
- 日本時間の時計を表示し、深夜・朝焼け・昼・午後・夕暮れ・夜の 6 段階で空、フォグ、地面、アンビエント/サン/フィルライト、トーンマッピング露出を補間
- 夜間帯（概ね 19 時過ぎ〜翌 5 時前）はカメラに追従する星空と月、月のハロースプライトが徐々に現れる
- クエリパラメータ `?hour=<0-23>` を付けるとその時刻に固定表示（ライティング確認用）
- 建物クリック時はドア位置と向きを基準にズームし、確認ポップアップをドア上にスクリーン投影して表示
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
- `public/index.html`: ナビ、HUD、イントロ、時計、ツールチップ、売地パネルのマークアップとスタイル
- `public/assets/js/main.js`: 起動処理、シーン/カメラ/ライト構築、ビュー状態管理、アニメーションループ
- `public/assets/js/site-config.js`: ナビ項目、建物ラベル、遷移先 URL、建物配置、ドア設定、売地/広告枠区画の定義
- `public/assets/js/camera/focus-camera.js`: ドア基点のフォーカスカメラ算出、ワールド→スクリーン投影
- `public/assets/js/camera/transition-paths.js`: `map-enter` と `intro-enter` のベジェ軌道生成
- `public/assets/js/interaction/scene-interactions.js`: ポインタ/ホバー/クリック処理、ツールチップと売地パネルの出し分け
- `public/assets/js/scene/world-objects.js`: GLB 読み込み、マテリアル補正、建物配置、MAP 用マーカー生成
- `public/assets/js/scene/land-plots.js`: 売地/広告枠区画の3D生成とホバー/MAP 遷移の更新処理
- `public/assets/js/scene/sky-objects.js`: 夜の星空と月（カメラ追従）の生成と表示制御
- `public/assets/js/systems/time-of-day.js`: 日本時間の取得、時間帯ライティング補間、時計 UI 更新
- `public/assets/js/ui/link-popup.js`: 建物ドア上に追従する確認ポップアップの生成と表示制御
- `public/assets/models/`: 本番で使う GLB アセット（`Fantasy_House_6.glb`, `Fantasy_House.glb`）
- `resources/`: 公開対象に含めない素材置き場
- `docs/`: 開発メモ

## リンク/配置管理

ナビ項目、建物の表示名、遷移先、配置、ドア位置、売地/広告枠区画は `public/assets/js/site-config.js` で管理しています。

- ナビの表示名（`label`）を変える
- 外部リンク（`url`）を差し替える
- 建物の配置（`position`）、スケール（`scale`）、向き（`rotationY`）を変える
- 建物モデル（`modelUrl`）を差し替える
- ドア位置とドアの向き（`doorOffset`, `doorFacing`）を微調整してフォーカスカメラとポップアップ位置を合わせる
- 売地/広告枠区画のタイトル、価格、サイズ、説明、配置を変える

といった変更は、このファイルを中心に更新できます。`HOUSE_DESTINATIONS` は通常ハウス、`FRONT_HOUSE_DESTINATION` は前面のアーティストハウスを定義します。

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

## 動作確認ポイント

1. 初期表示で雲に包まれたイントロ画面が表示され、ナビや HUD が見えない
2. `ENTER` または Enter キーで、雲の上から地上の村ビューへ滑らかに降下する
3. 降下完了後は、ドラッグしても視点が勝手に初期角度へ戻らない
4. 上部の `MAP` を押すと、カメラが引いてから真上寄りの俯瞰に滑らかに切り替わる
5. MAP 中は装飾的な円形線やドットが出ず、地面と建物が素直に見える
6. 村ビューで建物にホバーすると、`ARTIST` `COMPANY` `YOUTUBE` `SHOP` を識別できるツールチップが出る
7. 村ビューで建物をクリックすると、ドアの前までズームしてから確認ポップアップがドア上に出る
8. 確認ポップアップでキャンセルすると、近接フォーカスではなく通常の村ビューへ戻る
9. ドラッグでカメラを回しただけでは、ポップアップが出ない
10. 上部の `HOME` で斜め上からの通常村ビューに戻れる
11. 上部の建物ボタンでも該当建物へズームし、確認後に外部リンクへ遷移できる
12. 日本時間の時計が表示され、時間帯に応じて全体の光の具合が変わる
13. 夜帯（19 時台後半〜翌 5 時台前半）で星空と月が徐々に表示される
14. `?hour=20` などのクエリで任意時刻に固定して見た目を確認できる
15. 売地/広告枠区画にホバーすると、詳細パネルが表示され、区画が少し浮き上がる
16. 建物表面が半透明に抜けず、前後関係が破綻しない
