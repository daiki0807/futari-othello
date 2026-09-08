# ふたりのオセロ

1台のスマホ・タブレット・パソコンを交代で使って遊ぶ、2人対戦のオセロです。

**アプリのURL:** https://daiki0807.github.io/futari-othello/

## できること

- 黒が先手の8×8盤面
- 置けるマスの目印
- 縦・横・斜めの8方向を自動反転
- 手番と石の枚数を表示
- 置けないときの自動パス、勝敗と引き分けの判定
- 確認してから最初から遊び直す

ゲームはページ内だけで動きます。対戦データをサーバーに送信しません。ページの再読み込みやタブを閉じると、対戦はリセットされます。

## 開発

Node.js 22.13以上を使用します。

```sh
npm ci
npm run dev
```

## 検証

```sh
npm test
npx tsc --noEmit
```

ルールテストには、8方向の同時反転、不正手・盤面の端、自動パス、空きマスを残した終了、引き分け、独立した判定処理との100対戦分の比較が含まれます。

## GitHub Pagesへの更新

GitHub Pagesの配信元は `main` ブランチの `/docs` です。`docs/` は生成物専用です。

```sh
npm run build:pages
git add .
git commit -m "Update Othello"
git push origin main
```

GitHub側がプッシュされた `docs/` を公開します。`docs/.nojekyll` により、`_next` 以下のファイルも配信されます。ソースだけ変更した場合も、必ず `npm run build:pages` を実行してからコミットしてください。

1ページ構成の静的書き出しを使い、CSS・JavaScriptの参照先は `/futari-othello/` に合わせています。リポジトリ名を変える場合は `next.config.ts` と `app/layout.tsx` の配信パスも変更してください。

既存のSites向け設定も保持しています。`npm run build` はSites向け、`npm run build:pages` はGitHub Pages向けです。
