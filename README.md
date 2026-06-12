# ものがたり — 日本版 Storyworth

毎週LINEで届く質問に答えるだけで、親・祖父母の人生が一冊のハードカバー本（伝記）になるサービス。

- 企画・調査ドキュメント: [docs/](./docs/README.md)
- プロダクトの肝は2点:
  1. **いかに充実した回答をもらえるか**（LINEでのリアクション・深掘り・進捗共有 → [docs/line-experience.md](./docs/line-experience.md)）
  2. **いかにクオリティの高い小説を書けるか**（執筆パイプライン → [docs/novel.md](./docs/novel.md)）

## 開発（MVP）

Next.js (App Router) + Prisma (PostgreSQL) + LINE Messaging API。

```bash
npm install
cp .env.example .env        # DATABASE_URL（Postgres）を設定。LINEトークンは無くてもWeb部分は動く
npm run db:push             # Postgresにスキーマ反映
npm run db:seed             # data/questions.json から質問89問を投入
npm run dev                 # http://localhost:3000
```

DBは [Neon](https://neon.tech) の無料枠が手軽（ローカル用とVercel用で同じものを使ってよい）。

## Vercelへのデプロイ

1. **DBを用意**: [Neon](https://neon.tech) で無料のPostgresを作成し、接続URLを控える
2. **Vercelにインポート**: [vercel.com](https://vercel.com) にGitHubでログイン → `Add New > Project` → このリポジトリを選択
   （ブランチ `claude/japan-storyworth-platform-djluym` をデプロイ対象にするか、mainにマージしてから）
3. **環境変数を設定**（Project Settings → Environment Variables）:
   - `DATABASE_URL` … NeonのURL
   - `CRON_SECRET` … 長いランダム文字列（週次cronの認証。Vercelがcron実行時に自動で付与する）
   - `APP_BASE_URL` … `https://<プロジェクト名>.vercel.app`
   - `LINE_CHANNEL_ACCESS_TOKEN` / `LINE_CHANNEL_SECRET` … LINE連携を使う場合
4. **Blobストアを作成**（写真・音声の保存先）: Vercelダッシュボード → Storage → Blob → Create。
   `BLOB_READ_WRITE_TOKEN` がプロジェクトに自動追加される
5. **初回だけスキーマ反映とseed**を手元から実行:
   ```bash
   DATABASE_URL="<NeonのURL>" npm run db:push
   DATABASE_URL="<NeonのURL>" npm run db:seed
   ```
6. デプロイ完了後、`https://<プロジェクト名>.vercel.app/dashboard` から試せる

週次の質問送信は `vercel.json` のcron（**毎週日曜 9:00 JST**）で自動実行される。

### できること（現状）

- ダッシュボードで語り手を登録 → 6桁の連携コード発行
- LINE友だち追加 + コード送信で語り手を紐付け（webhook: `/api/line/webhook`）
- 質問の出題: 手動ボタン or 週次cron（`GET /api/cron/weekly`、`Authorization: Bearer $CRON_SECRET`）
- LINEでの回答受信（テキスト・写真・音声）と、Web回答フォーム
- 回答の閲覧（家族向け）

### LINE側の設定

1. [LINE Developers](https://developers.line.biz/) で Messaging API チャネルを作成
2. チャネルアクセストークン（長期）とチャネルシークレットを `.env` に設定
3. Webhook URL に `https://<公開URL>/api/line/webhook` を設定し、Webhookを有効化
4. 応答メッセージ（自動応答）はオフにする

## データ

- `docs/questions_jp.md` … 質問リスト89問（日本語・9カテゴリ）の原本
- `data/questions.json` … 上記から生成した構造化データ（`npm run questions:build` で再生成）
