# RP_kingdom

Three.js を使った絵本風 3D 村の試作です。`public/assets/models/Fantasy_House_6.glb` を複製配置し、通常ビューと MAP ビューを切り替えられる構成にしています。

## 変更内容

- 上ナビを追加し、`HOME` `GALLERY` `SHOP` `MAP` を配置
- `MAP` クリックで俯瞰カメラへ遷移
- MAP 中はドットグリッドとマーカーを重ねて、地図風の雰囲気に変化
- 建物クリック時は即遷移せず、建物へズーム完了後に確認ポップアップを表示
- ドラッグとクリックを閾値で分離し、OrbitControls 操作中の誤反応を抑制
- GLB 読み込み時に透明マテリアルを補正して、建物が透けにくい状態へ調整

## 起動

`public/` を静的配信して確認する想定です。VS Code の Live Server などを使う場合は `public/index.html` を起点にしてください。

## ディレクトリ構成

- `public/`: Cloudflare Pages にそのまま配信する公開物
- `public/assets/js/`: フロントエンドの実装
- `public/assets/models/`: 本番で使う GLB アセット
- `resources/`: 公開対象に含めない素材置き場
- `docs/`: 開発メモ

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

1. 初期表示で絵本風の村が見える
2. 上部の `MAP` を押すと、カメラが真上寄りの俯瞰に切り替わる
3. MAP 中は背景色と地面の雰囲気が変わり、ドット状のオーバーレイとマーカーが見える
4. 村ビューで建物をクリックすると、先にズームしてから確認ポップアップが出る
5. ドラッグでカメラを回しただけでは、ポップアップが出ない
6. `HOME` `GALLERY` `SHOP` ボタンでも該当建物へズームする
7. 建物表面が半透明に抜けず、前後関係が破綻しない
