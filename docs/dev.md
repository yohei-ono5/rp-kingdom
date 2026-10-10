このリポジトリは Three.js を使ったアーティスト公式サイトの試作です。

公開物は 2 系統あります。`public/index.html`（従来の村ビュー版）と、現在の開発の主軸である `public/editions.html`（スクロール連動の浮島ポータル「The Kingdom Edition」）です。この文書の「現在のファイル構成」「現状の仕様」「カメラ遷移」は主に `index.html` の説明で、Editions は「Editions（editions.html）」の節にまとめています。両者は `site-config.js` を共有します。

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
- `public/assets/js/scene/river.js`: `RIVER_PATHS` から川岸（MeshStandardMaterial）と水面（ShaderMaterial、3層ノイズの速度差スクロールで北→南の流れを表現）のリボンメッシュを生成。`BRIDGES` の位置に木橋（デッキ・スロープ・手すり・支柱）を配置。水面は `onBeforeRender` で `material.opacity → uniforms.opacity` を同期しイントロ形成演出と連動
- `public/assets/js/scene/video-billboards.js`: 動画看板の 3D 生成（フレーム + 動画スクリーン + 支柱を `Group` でまとめる）、`HTMLVideoElement` + `THREE.VideoTexture` + `MeshBasicMaterial` でライト非依存の自発光表示、autoplay 失敗時のジェスチャ・フォールバック、村ビュー/MAP/タブ状態に応じた再生制御。設定に `posterUrl` があれば、動画が読み込まれて最初のフレームが出るまでその静止画をスクリーンに表示し、`loadeddata` / `playing` で動画テクスチャへ差し替える
- `public/assets/js/scene/particle-field.js`: イントロ時に家・看板・地面へ集まる形成粒子の生成、パステル色化、形成完了後の非表示制御
- `public/assets/js/scene/sky-objects.js`: カメラ追従の星空と月、ハロースプライト（夜間のみフェードイン）
- `public/assets/js/scene/trees.js`: 木の散布（`generateTreePlacements`）と InstancedMesh 描画、散布除外ゾーンの生成（`createTreeExclusions`: 家・売地・道路・看板）と判定（`isInExclusion`）。読込 Promise を URL ごとに共有。Editions の草むら散布も同じ除外ゾーンを使う
- `public/assets/js/scene/environment.js` / `scene/sky-dome.js`: 山脈・丘・茂み・花、スカイドーム・太陽グロー・雲。**どこからも import されていない未接続のモジュール**（接続するかは未決定）
- `public/assets/js/systems/time-of-day.js`: `Asia/Tokyo` の取得、時間帯ごとのライティング/太陽位置を補間、時計 UI 更新、`?hour` 指定時は固定
- `public/assets/js/ui/link-popup.js`: 確認ポップアップの DOM 生成、アンカー（ドアまたは看板）のワールド座標をスクリーン投影して毎フレーム追従

### アセット
- `public/assets/models/Fantasy_House_6.glb`: 通常の建物（Company / Music / Store）
- `public/assets/models/Fantasy_House.glb`: 前面のアーティストハウス（Artist）
- `public/assets/models/windmill_2048_ktx2.glb`: SNS 用のKTX2圧縮済み風車。`windmill.glb` と `windmill_2048.glb` はローカル変換用で `.gitignore` 対象
- `public/assets/image/intro-logo.jpg`: イントロ画面のロゴ画像
- `public/assets/movie/`: 動画看板用 mp4 のローカル置き場（`.gitignore` で除外、本番は Cloudflare R2 から配信）
- `public/assets/models/tree_LOD0.glb`: 木モデル（`TREE_SCATTER` / `WEST_TREE_SCATTER` と Editions の両方で使用）。`resources/models/` は現在空
- `public/assets/models/tree_1_LOD1.fbx` / `tree_1_LOD2.fbx`: 追跡されているがどこからも参照されていない（LOD 用に置いたまま）
- `public/assets/image/youtube-promo-poster.jpg`: 動画看板のサムネ。動画 4 秒地点を切り出した JPEG（約 23KB）

## 現状の仕様

- 初回表示は雲に包まれたイントロ画面で、`ENTER` ボタンまたは Enter キーで降下開始。MAP 高度（y=75）から HOME 位置までベジェで降下する `intro-enter` 遷移
- `ENTER` 後は上空から降るパステル粒子が家・看板・地面へ集まって世界を形成する。地面だけは薄く先行表示し、降下時の距離感を補助する。形成完了後の粒子は非表示になり更新処理も止まる
- 世界形成の不透明度制御対象は初期化時にマテリアル配列へキャッシュする。形成中だけ配列を更新し、完了時に元のマテリアル設定へ戻して以後の処理を停止する
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
- `Fantasy_House_6.glb` を使う通常ハウス（Company / Music / Store）は約1.5倍に拡大。SNS は `windmill_2048_ktx2.glb` を使い、Musicハウスとの干渉を避けるため西側（X=-20.4）へ配置
- ドアフォーカスは建物ごとの `doorOffset` / `doorFacing` で調整。Artist は西側入口（`doorFacing: [-1, 0, 0]`）、SNS 風車は北側入口（`doorFacing: [0, 0, -1]`）
- 動画看板（`VIDEO_BILLBOARDS`）は Music ハウスの南側に配置、画面が南向きで `MeshBasicMaterial` + `VideoTexture` により時間帯に左右されず自発光表示。クリック / `Youtube` ナビボタン / MAPラベルで看板正面にカメラがズームして確認ポップアップから外部リンク（YouTube）へ
- 動画看板は通常の村ビュー中のみ再生し、MAP 表示中やタブ非表示時は pause して `VideoTexture` のデコード/更新負荷を抑える
- 売地/広告枠区画は `FOR SALE` 看板、境界線、杭で構成した 3D オブジェクトとして表示。Artist 北側にあった `A-02` は削除済み
- 村の主要導線として `ROAD_PATHS` に沿ったアスファルト調の曲線道路を配置。道路上に木が生成されないよう、道路区間をカプセル状のツリー除外エリアとして扱う（`RIVER_PATHS` も同様に除外区間として渡す）
- 村の東側に `RIVER_PATHS` の川が北から南へ流れる。東道路は `BRIDGES` の木橋で川を渡る。川・橋は `riverGroup` にまとめ、イントロ形成演出のリビール対象に含む
- HOME 視点の見栄えを補うため、北側の `TREE_SCATTER` に加えて西側に `WEST_TREE_SCATTER` を追加配置
- `TREE_SCATTER` と `WEST_TREE_SCATTER` が同じモデルURLを使う場合、`scene/trees.js` が読込Promiseを共有し、GLBの通信・解析を1回だけ実行する
- 建物モデルは URL ごとにキャッシュしつつ並列で読み込むので、風車のような重いモデルが他の建物の表示開始をブロックしにくい
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

## Editions（editions.html）

1 つの世界に区画（= 章）を広告枠として並べ、複数の出稿者が同居するポータル。章を足すだけで、インデックス・本文パネル・カメラ・CTA が増える設計です。

### ファイル構成

- `public/editions.html`: マークアップ（ENTER ゲート、マストヘッド、章インデックス、`MAP` ボタン、離脱用の紙の扉）
- `public/assets/css/editions.css`: スタイル。色は `--paper` `--ink` `--gold` の 3 色、書体は Cormorant Garamond + Noto Serif JP
- `public/assets/js/editions/chapters.js`: `CHAPTERS` 配列。`id` / `anchorId`（世界側のオブジェクト ID が章 ID と違うときだけ）/ `numeral` / `label` / `kicker` / `title` / `body` / `cta` / `ctaSecondary` / `side`（`left` `right` `center`、本文パネルの寄せ側）/ `camera: { position, target }`
- `public/assets/js/editions/main.js`: 起動、スクロール → カメラレール、ENTER ゲートと降下、レイキャストによる建物選択、章への直行、オービット、MAP、離脱演出
- `public/assets/js/editions/world.js`: 浮島・雲・ライティング・道路の延長・草むら散布・建物/木/看板の配置。`createWorld` が `scene` `camera` `renderer` `anchors`（ID → オブジェクト）`ready` `clouds` と、`setVideoActive` `setFogRange` `updateGrass` `render` を返す
- `public/assets/js/systems/art-direction.js`: 全マテリアルを共通の質感へ染める層。`onBeforeCompile` で脱彩度・パレットへの寄せ・直接光の階調化を注入し、マテリアル自体は差し替えない。プリセットは `toon`（既定）/ `pbr` / `current`、`?style=` で切替。モデル読込のたびに `applyToScene()` を呼ぶ（処理済みマテリアルは `userData.artDirection` で判別して二重適用しない）。**`index.html` も読み込んでおり、既定で toon になる**。出稿者が持ち込むモデルを世界の質感へ強制的に揃えるための層でもある
- `public/assets/js/procedural/` と `public/procedural.html`: 手続き生成の検証ページ（後述）

### 仕様の要点

- `world.ready` は建物と木の読み込み完了で解決する。それまで `#intro-enter` は `disabled`
- カメラは `currentPosition` / `currentTarget` を `desiredPosition` / `desiredTarget` へ減衰（`CAMERA_DAMPING = 0.075`）で追従。`desired*` はスクロール比から `keyframes` を `smoothstep` で補間し、章間で `ARC_HEIGHT` ぶん持ち上げる
- 建物クリック・インデックス・`Own a plot` は `navigateToChapter(index)`。スクロール位置を即座に合わせたうえで `jump`（`JUMP_DURATION = 1250ms` の直行）を開始する。**レールを辿らない**（間の章のキーフレームを経由して行き来して見えるのを避けるため）
- `navigateToChapter` は先頭で `mapMode` と `body.is-map` を解除する。`is-map` は `overflow: hidden` を伴うので、`scrollTo` より前に外す必要がある
- ピッキングは `world.anchors` へのレイキャスト（`pointermove` は 90ms 間引き）。カメラ角度に依存しないので MAP でもそのまま動く。ドラッグ量が 6px を超える `pointerup` はクリックとして扱わない
- MAP は `MAP_KEYFRAME`（position `(-4, 64, 11)` / target `(-4, 0, 6)`）へ `jump` で入る。終了時は `jump` 完了後の `updateRailFromScroll()` を `mapMode` 中はスキップして、俯瞰位置に留まらせる。区画が増えて村が横に広がったら、この高さを見直す
- ENTER の降下は `INTRO_DURATION = 4000ms`。開始点 `INTRO_START_POSITION` は遠いので、霧を `FOG_INTRO` から `FOG_SETTLED` へ補間する（そうしないと島が紙色のフォグに溶けて見えない）。雲は降下後に `CLOUD_RESIDUAL_OPACITY` まで薄くする
- `history.scrollRestoration = 'manual'` にしている。しないとリロード後の ENTER で前回の章へ飛ぶ
- オービットは `applyOrbit` で毎フレーム `currentPosition` の周りに適用（`ORBIT_MAX_YAW` 20° / `ORBIT_MAX_PITCH` 11° / `ORBIT_RECENTER` で正面へ戻す）。章を移ると 0 に戻る
- 離脱演出（`departTo`）: `window.open('', '_blank')` を**クリックと同じコールスタックで同期的に**呼び、`document.write` で「Departing 〇〇」の画面を書き込み、`setTimeout 450ms` で `location.replace`。非同期にするとポップアップブロックされるため、演出は元のタブではなく新規タブ側に持たせている。`window.opener = null` で遷移先から元タブを触れないようにする。ブロックされた場合のみ `departInPlace`（紙の扉 `DEPART_DOOR_DURATION` → `DEPART_TOTAL` 後に同一タブ遷移）。修飾キー付き / 中クリックは演出を挟まない
- Film 章の動画は `syncActiveChapter` で章の前後 1 つ以内に入ったときだけ `world.setVideoActive(true)`。それまで mp4 は取得しない
- 画角は `BASE_FOV = 34`（望遠）。アスペクトが 16:9 より縦長のときは、横方向の画角を 65% だけ保つよう縦画角を広げる（望遠のままだと左右が大きく切れる）

### 世界（world.js）の調整つまみ

- `ISLAND_RADIUS`（44）/ `ISLAND_DEPTH` / `ISLAND_EDGE_DROP` / `ISLAND_EDGE_START`: 島の大きさと縁。**側面の上端と上面の縁は同じ定数で合わせる**（ずれると輪状の隙間が開く）。側面の岩の凹凸は**内向きのみ**にする（外向きだと草地の半径を超えて庇状に突き出し、陽を受けて白い裂け目になる）
- シャドウカメラの範囲は `ISLAND_RADIUS + 6`。島を覆えていないと範囲外が黒く滲む。太陽が固定なので `shadowMap.autoUpdate = false`、モデル読込後に `needsUpdate = true` を立てる
- `ROAD_EDGE_RADIUS`（半径の 0.91 倍）: 元の道路は島の中ほどで途切れるため、両端を接線方向に延ばしてここで止める。縁の落ち込みの手前なので道が浮かない
- `TREE_SCATTER_EDITIONS` / `WEST_TREE_SCATTER_EDITIONS`: 木の本数・範囲・スケール。`tree_LOD0.glb` は素のスケールで約 20 ユニットあるので、Editions では 0.3〜0.56 が適正
- `GROUND_TEXTURE_TILE`（3.4）: 地面ディテールテクスチャが繰り返す長さ。UV はワールド座標なので、頂点グリッドの粗さと関係なく粒立ちが出る
- `GRASS_CLUSTER_*`: 草むらの散布。`isInExclusion` で家・道・看板を避ける。色は `props.js` の既定（`0x93a173`）だと逆光で白く飛ぶため Editions 側で `0x5f7a45` を渡している
- `HOUSE_ROTATION_OVERRIDES`: Editions だけの建物の向きの上書き（現在は `sns: -π/4`）。`site-config.js` は `index.html` と共有なので、Editions 都合の向き変更はここで行う。散布除外ゾーンは位置と半径だけで判定するため、回転しても影響しない

### 章カメラの調整手順

1. **正面を実測する**。旧サイトのドアフォーカスと同じ `camera/focus-camera.js` の `getHouseDoorwayWorld` / `getHouseDoorFacingWorld` で、ドア位置と外向きの向きを取る。カメラは「ドア位置 + 外向き × 距離」の側に置く。目測で正面側を決めると外れる（Company も Social も、最初は裏か側面を撮っていた）
2. **実寸を測る**。`new THREE.Box3().setFromObject(obj)` で包絡を取る。風車は `scale: 8.6` で約 8.6 × 7.5 × 10.8、Company ハウスは約 8.5 × 9.9 × 6.8（いずれも `site-config.js` の元の向きで計測。向きを変えると包絡は変わる）
3. **注視点は常に画面中央に描かれる**。本文パネルの反対側へ主役を寄せたいときは `target` を横にずらす（Film 章は看板の中心から `target.x` を 3 ずらし、パネルの右側の空きへ看板を置いた）。ずらす向きは配置で変わるので、描画して確かめる
4. **小さな座標差で遮蔽が変わる**。±1〜1.5 の移動で Music ハウスの壁や茂みへ突っ込む。候補を複数描画して比べる
5. 西側の森（`x -28..-16, z -5..22`）は風車より高い木で密。この範囲の中心にいる風車は、西・南・北のどの接近でも葉に塞がれる。開けた南東側から撮る

### 検証時の落とし穴

- `window.scrollTo` で章へ飛ばすと `scroll` イベントから `updateRailFromScroll` が走り、直前に直接指定したカメラを章のキーフレームで上書きする。同じ章への 2 回目以降はスクロール量が変わらずイベントが出ないため、**最初の 1 回だけ元のカメラに戻って見える**。座標を直接試すときは、先にスクロールだけ行ってイベントを落ち着かせてから、カメラを指定する
- 検証用の一時フック（`window.__world` など）はコミット前に必ず外す
- headless Chromium で WebGL を使うときは `--use-gl=angle` を付ける

### 手続き生成（procedural/）の採用状況

`procedural.html` は、手続き生成の見本を既存の購入モデルと同じライティング・同じ質感層で並べて見比べるための検証ページです。評価は次のとおりです。

| 対象 | 状況 |
| --- | --- |
| 草むら（`props.js`） | **採用**。Editions の地面に散布している。頂点シェーダで風に揺れ、JS 側は時間を渡すだけ |
| 樽・柵・井戸・岩（`props.js`） | 候補。樽と柵は使えそうという評価。本編には未配置 |
| 山（`terrain.js`） | 候補。遠景の稜線としては使えるが、近づくと円錐状に見える |
| 建物（`building.js`） | 見送り。箱の組み合わせでは購入モデルほどの質感が出ない |
| 木（`tree.js`） | 見送り。シルエットが単調 |
| 海・川（`water.js`） | 見送り。コミット済みの実装は正弦波の和で頂点を動かすだけで、ライティングも法線の陰影も無いため平坦に見え、周期的で動きも単調。作り直す場合は、波頭が尖る Gerstner 波、波形から求めた法線による陰影と反射、互いに割り切れない波長、の3点が要る（一度試作したが検証前に破棄した）。なお川は頂点をローカル Z へ動かしており、回転していないリボンでは上下動がゼロだった |

使い分けの指針: 地形・水・単純な小物は手続き生成が得意、建物や木のような主役は既製モデルの方が良い。質感は `art-direction.js` が揃えるので、既製モデルと手続き生成を混ぜても破綻しない。

### 未対応・既知の課題

- 多言語: Editions の章の原稿は日本語固定、UI の英字ラベル（`Enter` `Scroll to travel` `Own a plot` など）も HTML / JS に直書きで、`i18n.js` に未接続。`chapters.js` を言語キー構造に変えるのは、区画を増やす前の方が安い（7 枠 × 5 言語になってからでは手間が大きい）。CJK 書体は言語ごとに別で数 MB あるため、選択言語のものだけ読み込む設計にする
- 時間帯連動: 未対応（照明は固定のマジックアワー）。入れる場合は紙の色も時刻で動かすか（ページ全体が空の役割）、3D の照明だけにするかを先に決める。影を毎フレーム更新に戻さず、数秒に 1 回 `needsUpdate` にする
- 売地（`LAND_PLOTS`）: Editions の世界には未配置。「Land」章は文言と俯瞰カメラのみ
- 7 区画のレイアウトが未確定。決まったら `MAP_KEYFRAME` の高さと、各章のカメラを見直す
- スマホ実機での検証、ポストプロセス（Bloom・グレイン・ビネット）、GLB の追加圧縮（`Fantasy_House.glb` は約 8MB）は未着手
- `index.html` の既定が toon になっている。従来の見た目を既定に戻したい場合は `art-direction.js` の `resolveArtStyle` の既定値、または `index.html` 側で `?style=current` 相当を渡す
- `scene/environment.js` / `scene/sky-dome.js`、`tree_1_LOD1/2.fbx` は未接続・未参照のまま

## 運用メモ

- 表示文言は `public/assets/js/i18n.js` に集約。ナビ、MAPラベル、ツールチップ、確認ポップアップ、HUD、時計ラベル、売地パネル/看板の文言はここを編集
- リンク、建物配置、ドア位置、道路、売地/広告枠区画のサイズ/配置、動画看板（位置・サイズ・回転・動画 URL・遷移先 URL）の変更は `public/assets/js/site-config.js` を編集
- `site-config.js` の `id` と `i18n.js` の `destinations.<id>` / `plots.<id>` を一致させる。例: `id: 'company'` なら `destinations.company`
- 新しい建物モデルを追加する場合は `modelUrl` と `doorOffset` / `doorFacing` をセットで定義（フォーカスカメラとポップアップ位置に直結）
- 新しい動画看板を追加する場合は `VIDEO_BILLBOARDS` に項目追加（`id` / `position` / `rotationY` / `width` / `height` / `videoUrl` / `url`）。同じ `id` で `i18n.js` の `destinations` に文言を追加するとナビボタンとMAPラベルに反映される
- 動画ファイルは Cloudflare R2 にホストし、`site-config.js` の URL 定数（`YOUTUBE_PROMO_VIDEO_URL` 等）を R2 の公開 URL に差し替え。ローカル開発用に `public/assets/movie/` に同名 mp4 を置いてもよい（`.gitignore` で除外済み）
- 風車は2048pxテクスチャをKTX2/Basis圧縮した `public/assets/models/windmill_2048_ktx2.glb` をCloudflare Pagesから直接配信する
- KTX2テクスチャは `scene/world-objects.js` の `KTX2Loader` で読み込み、Three.js 0.158.0のBasisトランスコーダーを使用する
- 旧R2オブジェクト `3D_object/windmill.glb` は現在参照していない。本番でKTX2版を確認し、他サイトからの参照がなければ削除可能
- R2 の CORS ポリシーは `AllowedMethods: ["GET", "HEAD"]` を許可。`AllowedOrigins` は本番 Pages ドメインに絞る。preview が多い開発中だけ `["*"]` を一時利用してよい
- 動画要素は `crossOrigin = 'anonymous'` 必須（R2 など外部 CDN から WebGL に流すため）
- 動画看板の再生制御は `scene/video-billboards.js` の `updateVideoBillboardPlayback` で管理。初期モデル読み込みとイントロ形成演出の完了後にだけ `src` を設定してロードし、村ビュー中は再生する。MAPとタブ非表示時は pause する
- R2 の動画オブジェクトには `Content-Type: video/mp4` と `Cache-Control: public, max-age=31536000, immutable` を設定する。動画更新時はキャッシュ更新のためファイル名と `site-config.js` の URL を変更する
- 動画はアップロード前に `ffmpeg -i input.mp4 -vf "scale=-2:720" -c:v libx264 -crf 23 -preset medium -c:a aac -b:a 128k -movflags +faststart output.mp4` などで軽量化し、moov atom を先頭へ移動する
- イントロの見た目調整は `public/index.html` の `#intro-overlay` 周辺。ロゴ画像は `public/assets/image/intro-logo.jpg`
- イントロ形成粒子は `scene/particle-field.js` で管理。粒子数、開始高度、分散範囲、パステル変換、地面先行表示との兼ね合い、形成完了後の停止は同ファイルと `main.js` の `PARTICLE_*` 定数で調整
- 道路の経路と幅は `public/assets/js/site-config.js` の `ROAD_PATHS`、道路メッシュとアスファルト調テクスチャは `public/assets/js/scene/roads.js` で管理
- 川の経路・幅・川岸幅は `site-config.js` の `RIVER_PATHS`、橋の位置・向き・寸法は `BRIDGES`。水面シェーダーの流速は `scene/river.js` の GLSL 内 `speed1/2/3` 定数、昼夜の水色は `DAY_SHALLOW` / `DAY_DEEP` / `NIGHT_SHALLOW` / `NIGHT_DEEP` で調整
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
