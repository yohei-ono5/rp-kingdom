# RP_kingdom

Three.js を使った絵本風 3D 村の試作です。`public/assets/models/Fantasy_House_6.glb` を複製配置し、通常ビューと MAP ビューを切り替えられる構成にしています。Cloudflare Pages でそのまま公開できる静的サイトです。

## 現在の構成

- 初回表示は雲に包まれたイントロ画面で、`ENTER` から村へ降下する導線
- 上ナビに `HOME` `COMPANY` `YOUTUBE` `SHOP` `MAP` を配置
- `HOME` は初期カメラ位置へ戻す操作
- `COMPANY` `YOUTUBE` `SHOP` は建物フォーカス後に確認ポップアップを出し、外部リンクへ遷移
- `MAP` は地面と建物を見やすくしたシンプルな俯瞰ビュー
- MAP への切り替え時は、少し引いてから真上へ入る滑らかなカメラワーク
- イントロの `ENTER` 後は、雲の上から地上の村ビューへ降りるカメラワーク
- 村ビューでは建物ホバー時にツールチップで建物名を表示
- ドラッグとクリックを閾値で分離し、OrbitControls 操作中の誤反応を抑制
- GLB 読み込み時に透明マテリアルを補正して、建物が透けにくい状態へ調整

## 起動

`public/` を静的配信して確認する想定です。VS Code の Live Server などを使う場合は `public/index.html` を起点にしてください。

ローカルで簡単に確認する場合:

```bash
cd public
python3 -m http.server 5500
```

## ディレクトリ構成

- `public/`: Cloudflare Pages にそのまま配信する公開物
- `public/assets/js/`: フロントエンドの実装
- `public/assets/js/site-config.js`: ナビ項目、建物ラベル、遷移先 URL、配置情報の定義
- `public/assets/models/`: 本番で使う GLB アセット
- `resources/`: 公開対象に含めない素材置き場
- `docs/`: 開発メモ

## リンク管理

建物ごとの表示名や遷移先は `public/assets/js/site-config.js` で管理しています。

- ナビの表示名を変える
- 外部リンクを差し替える
- 建物の配置やスケールを変える

といった変更は、このファイルを中心に更新できます。

## UIメモ

- イントロ画面の見た目は `public/index.html` の `#intro-overlay` 周辺で管理
- イントロから村ビューへの降下演出は `public/assets/js/main.js` の `intro-enter` トランジションで管理
- `HOME` は外部リンクではなく、カメラを初期村ビューへ戻す操作
- `COMPANY` `YOUTUBE` `SHOP` が外部リンク対象

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
2. `ENTER` を押すと、雲の上から地上の村ビューへ滑らかに降下する
3. 降下完了後は、ドラッグしても視点が勝手に初期角度へ戻らない
4. 上部の `MAP` を押すと、カメラが引いてから真上寄りの俯瞰に滑らかに切り替わる
5. MAP 中は装飾的な円形線やドットが出ず、地面と建物が素直に見える
6. 村ビューで建物にホバーすると、`COMPANY` `YOUTUBE` `SHOP` を識別できるツールチップが出る
7. 村ビューで建物をクリックすると、先にズームしてから確認ポップアップが出る
8. ドラッグでカメラを回しただけでは、ポップアップが出ない
9. 上部の `HOME` で初期視点に戻れる
10. `COMPANY` `YOUTUBE` `SHOP` ボタンでも該当建物へズームし、確認後に外部リンクへ遷移できる
11. 建物表面が半透明に抜けず、前後関係が破綻しない
