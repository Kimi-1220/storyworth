# アーキテクチャ

## 全体像

```
語り手（親・祖母）                家族（購入者）
   │ LINE                          │ ブラウザ
   ▼                               ▼
LINE Messaging API ──webhook──▶ ┌──────────────────────┐
   ▲                            │  Next.js アプリ        │
   │ push（週1の質問）            │  - Web UI（回答/閲覧）  │
   └────────────────────────────│  - API Routes          │
                                │  - 定期送信ジョブ        │
                                └──────────┬───────────┘
                                           │ Prisma
                                           ▼
                                     DB（開発: SQLite / 本番: PostgreSQL）
                                     メディア（開発: ローカル / 本番: S3等）
```

## 技術スタック（MVP）

| レイヤ | 採用 | 備考 |
| --- | --- | --- |
| アプリ | Next.js (App Router, TypeScript) | Web UI と API を1リポジトリで |
| DB | SQLite（開発）→ PostgreSQL（本番） | Prisma でスキーマ管理 |
| LINE | LINE Messaging API（@line/bot-sdk） | 質問のプッシュ送信 + 回答のwebhook受信 |
| メディア保存 | ローカル `public/uploads`（開発）→ S3/R2（本番） | `src/lib/storage.ts` で抽象化 |
| 定期実行 | `/api/cron/weekly` を外部cron（Vercel Cron等）から叩く | `CRON_SECRET` で保護 |

## データモデル

```
Storyteller（語り手）
  ├─ name / lineUserId / linkCode（LINE連携用コード）
  └─ prompts: Prompt[]

Question（質問マスタ）
  ├─ category / text / source（storyworth風 | vault）/ sortOrder
  └─ data/questions.json から seed で投入

Prompt（語り手への出題 = 質問のインスタンス）
  ├─ storyteller / question / sentAt / status（open | answered | skipped）
  └─ answers: Answer[]

Answer（回答。1つの出題に複数回答可: テキスト+写真+音声）
  └─ type（text | image | audio）/ text / mediaPath / via（line | web）
```

## 主要フロー

### LINE連携（語り手の紐付け）

1. ダッシュボードで語り手を登録すると6桁の連携コードが発行される
2. 語り手がLINE公式アカウントを友だち追加し、コードをトークに送信
3. webhookがコードを照合し `lineUserId` を保存 → 連携完了

### 週次の質問送信

1. cron が `GET /api/cron/weekly`（Bearer: CRON_SECRET）を叩く
2. 連携済みの各語り手について、未出題の質問から次の1問を選び Prompt を作成
3. LINE push でメッセージ送信（Webの回答ページURLも添える）

### 回答の受信（LINE）

- webhookで `message` イベントを受信
- text → そのまま Answer(text) として保存
- image / audio → LINE のコンテンツAPIからバイナリを取得し保存、Answer(image|audio) として記録
- 回答は語り手の「最新の open な Prompt」に紐付ける（返信で追記もできる）

### 回答の受信（Web）

- `/storytellers/[id]/prompts/[promptId]` の回答フォームから送信
- テキスト + 画像/音声ファイルのアップロードに対応

## MVPの次に組み込む中核コンポーネント

プロダクトの肝2点（[concept.md](./concept.md)）に対応する:

- **会話エンジン**（→ [line-experience.md](./line-experience.md)）
  webhookの回答受信時に、LLMでリアクション・深掘り質問を生成して返信する層。
  会話履歴と質問の意図をコンテキストに渡す。深掘りで得た回答も Answer として蓄積。
- **執筆パイプライン**（→ [novel.md](./novel.md)）
  Answer群 → 素材整理（事実台帳）→ 章の執筆 → 素材不足の検知を
  深掘り質問としてLINE側に差し戻すループ。
- **贈り主リマインド**
  無回答が続いたら贈り主（子・孫）に通知。Storyteller と別に
  家族メンバー（Gifter）のモデルと通知チャネル（LINE or メール）が必要。

## 本番化で必要になるもの（MVP外）

- 認証（家族アカウント: メールマジックリンク or LINEログイン）
- 決済（Stripe）
- 音声の自動文字起こし（Whisper API等）
- 本文の自動組版 → 入稿用PDF生成（製本注文フロー）
- PostgreSQL / オブジェクトストレージへの移行
