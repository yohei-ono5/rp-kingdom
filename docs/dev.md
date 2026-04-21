このリポジトリは Three.js を使ったアーティスト公式サイトの試作です。
現在は以下の構成です。
- public/index.html
- public/assets/js/main.js
- public/assets/models/Fantasy_House_6.glb
- resources/models/tree_LOD0.glb

やりたいこと：
- 通常時は絵本風の3D村
- 上ナビの MAP を押すと俯瞰ビューに切り替える
- MAP時は点群風・地図風の雰囲気を少し出す
- 建物クリック時は、すぐ遷移せず、建物へズームしてから確認ポップアップを出す
- OrbitControls のドラッグ操作を邪魔しない
- 建物が透けないようにする

今回のタスク：
1. index.html に上ナビを追加
2. main.js に MAP / village のカメラ切替を実装
3. クリックとドラッグの誤判定を防ぐ
4. GLB 読み込み時に透明マテリアルを補正
5. コードはコメント付きで整理
6. 変更後に動作確認ポイントを README 風に最後にまとめる

完了条件：
- public/ を静的配信して動く
- MAP ボタンで俯瞰になる
- 建物クリックでズーム後にポップアップ
- ドラッグではポップアップが出ない
- 建物が透けない
