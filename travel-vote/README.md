# Travel Vote

LINEで共有して、5人程度のグループで宿を5段階評価するモバイル向けミニWebアプリです。既存サイトとは独立して `/travel-vote/` 配下だけで動作します。

## 構成

- `index.html` — 画面
- `styles.css` — iPhone/LINE内ブラウザを優先したスタイル
- `app.js` — 評価、保存、集計、共有
- `data.js` — 初期候補データ
- `config.js` — 空の公開設定（秘密情報は置かない）
- `config.example.js` — Supabase設定例
- `supabase.sql` — テーブル、RLS、初期データ

## Supabase 初期設定

1. SupabaseでProjectを作成する。
2. SQL Editorで `supabase.sql` を実行する。
3. Project Settings / API から Project URL と anon/publishable key を確認する。
4. `config.js` の空文字を以下のように置き換える。

```js
window.TRAVEL_VOTE_CONFIG = {
  supabaseUrl: "https://YOUR_PROJECT.supabase.co",
  supabaseAnonKey: "YOUR_ANON_OR_PUBLISHABLE_KEY"
};
```

anon/publishable key はブラウザ公開を前提としたキーであり、service-role key のような秘密鍵ではありません。このアプリの認可はRLSに依存します。**service-role key は絶対にコミットしないでください。**

### RLSのトレードオフ

この用途は友人5人へのURL共有を想定し、ログインなしで `votes` の匿名SELECT/INSERT/UPDATE/DELETEを許可しています。そのため、URLを知っている第三者は名前を偽って投票を書き換えることができます。厳密な本人性が必要になった場合はSupabase Authを導入し、`auth.uid()` ベースのRLSへ変更してください。候補宿の更新は匿名ユーザーには許可していません。

## GitHub Pages

このリポジトリが `main` ルートからGitHub Pagesを公開している前提では、PRをレビューしてmainへマージ後、次のURLで表示されます。

`https://apopopopo66.github.io/travel-vote/`

この実装はルートサイトのファイルを変更しません。Supabaseを使う本番状態にするには、RLS設定後に公開用URLとanon/publishable keyだけを `travel-vote/config.js` に設定します。別案として、将来GitHub Actionsで `config.js` を生成しても構いません。

## デモ状態

`config.js` が空のままでも画面はクラッシュせず、候補の閲覧とローカルでの星選択ができます。共同保存・集計は無効で、画面に設定が必要であることを表示します。

## 手動スモークテスト

1. `/travel-vote/` を開き、ルートサイトとは独立して表示されることを確認。
2. 320px幅、iPhone Safari、可能ならLINE内ブラウザでカードが横にはみ出さないことを確認。
3. Supabase未設定で候補5件が表示され、星を選べ、保存時にデモ状態の案内が出ることを確認。
4. Supabase設定後、名前を入力して複数の宿を1〜5点で評価し「評価を保存」。成功メッセージと集計更新を確認。
5. 再読み込みして名前がlocalStorageから復元され、自分の評価がSupabaseから復元されることを確認。
6. 同じ名前で点数を変更して保存し、重複行ではなく既存評価が更新されることを確認。
7. 評価を外して保存し、その評価だけ削除されることを確認。
8. 別の名前で投票し、平均点・評価人数・メンバー別表が更新されることを確認。
9. 「LINEで共有する」でWeb Share APIが開くこと、非対応環境ではURLコピーへフォールバックすることを確認。
10. DevTools ConsoleにJavaScriptエラーがないことを確認。

## 初期候補

BROS RESORT KYONAN / VILLA Asile / BASK HOTA / D6 Makiwarina 薪割りーな / Ocean Sauna Villa 富津竹岡 by GIFTHOUSE。

価格・設備情報は初期比較用の目安です。予約前に各施設の最新情報を確認してください。公式URLや画像URLが確定したら `data.js` の `url` / `imageUrl` に追加できます。
