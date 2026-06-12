# 本家 Storyworth 仕様調査

調査ソース:

- [Remento — Storyworth: How it Works, Price, Reviews & Top Alternatives](https://www.remento.co/journal/storyworth)
- [Storyworth FAQ](https://welcome.storyworth.com/frequently-asked-questions)（[UK版FAQ](https://welcome.storyworth.com/gb/faq)）
- [Storyworth Pricing](https://welcome.storyworth.com/storyworth-pricing)
- [What is Storyworth?](https://welcome.storyworth.com/what-is-storyworth)
- [Memoirji — Storyworth Pricing 2026 Buyer Guide](https://memoirji.com/blog/storyworth-pricing-2026-buyer-guide/)

※ 一部ページは全文取得できず、検索エンジン経由で取得した情報。数字は2026年6月時点。

> **全文取得について**: Playwrightでの取得も試したが、403の原因はbot対策ではなく
> **開発環境のネットワーク許可リスト**（`Host not in allowlist: www.remento.co`）だった。
> Claude Code on the web の環境設定（network egress settings）で
> `www.remento.co` / `welcome.storyworth.com` を許可すれば、
> `node scripts/scrape-remento.mjs` で全文を取得してこのドキュメントを補完できる。

## 基本フロー

1. 購入者がギフトとして購入し、語り手（storyteller）を招待
2. **毎週1回、質問がメールで届く**
3. 語り手は **メールに返信するだけ**で回答完了（写真添付もメール返信でOK）。Webアカウントからも回答可能
4. 1年間（52問）続けたあと、回答が1冊のハードカバー本になる

## 質問の仕様

- 毎週のメールに「質問を変更する」リンクがあり、**質問ライブラリから別の質問を選ぶ／自分で質問を書く**ことができる
- 家族（購入者側）も質問を追加できる
- 質問は時系列順には送られない（→ だからこそ後述の「並べ替え」機能がある）

## 回答手段

- メール返信(テキスト+写真)
- Webアカウントでの執筆
- **音声**: 2方式ある
  - 電話で話す → **一言一句そのままの文字起こし**（word-for-word transcription）
  - **ガイド付きインタビュー**（guided interviewer）→ 会話を**書き言葉のナラティブに変換**
  - 固定電話でも使える（シニア対応として重要）

## 編集ダッシュボード ←★日本版でも必須

回答が溜まってきたら、購入者・語り手がWeb上で本を編集できる:

- **目次（Table of Contents）でエピソードをドラッグ&ドロップで並べ替え**
- **各ストーリーに写真を追加**（枚数無制限、ただし本全体で480ページまで）
- 本文のリッチテキスト編集（ただし「2010年のリッチテキスト程度」と酷評されている。Notion/Google Docsレベルではない）
- 最終レイアウトのプレビュー（デザインは全ユーザー共通で固定）
- **購読年終了後3ヶ月間**が編集期間（写真追加・誤字修正・レイアウト承認）

## 本の仕様

- 6×9インチ（約15.2×22.9cm ≒ 四六判に近い）、ハードカバー
- 最大480ページ。超える場合は複数巻に分冊（追加費用）
- 追加コピー: 白黒 $39 / フルカラー300ページまで $79 / フルカラー480ページまで $99

## 価格プラン（2026年）

| プラン | 価格 | 内容 |
| --- | --- | --- |
| Basic | $59 | 週次質問1年分 + ハードカバー1冊（表紙カラー・本文白黒） |
| Color | $109 | + 音声録音、本文フルカラー |
| Unlimited | $199 | + ガイド付き電話インタビュー、フルカラー2冊、購読中は友人家族に無制限にギフト可 |

## ユーザーから指摘されている弱点（= 日本版のチャンス）

- 質問メールが届かない・迷子になることがある
- **編集・レイアウトツールが硬い**（カスタマイズ不可、エディタが貧弱）
- 書体・デザインが全員同じ
- カスタマーサポートへの不満

## 競合 Remento の特徴（参考）

ソース: [Remento公式](https://www.remento.co/)、[RementoのFAQ](https://www.remento.co/faq)

- 週1回、**SMSとメール**で質問が届く → リンクを開いて**話すだけ**（アプリ不要・タイピング不要）
- 録音した話し言葉を、AIが**書き言葉に変換**（Speech-to-Story）。本人の声のQRコードも本に載る
- 質問ライブラリは**500問以上・15カテゴリ**（幼少期 / 親 / 学校 / 10代 / キャリア / 恋愛 / 子育て / COVID / お祝い / 信仰 / 歴史的出来事 / 孫 / 退役軍人 / 家系・ルーツ / 旅行）
- 家族が質問を提案し、**次の質問に投票**できる
- **写真から物語を引き出す**プロンプト（写真の裏にある話を聞く）

## 日本版への示唆

1. **編集ダッシュボードは必須機能**。目次の並べ替え（D&D）+ 写真挿入 + プレビューが本家の中核
2. 本家の弱点（編集の硬さ・デザイン固定）は差別化ポイントにできる
3. Rementoの「話すだけ→書き言葉に変換」は、日本版の音声回答 + LLM執筆（→ [novel.md](./novel.md)）と同方向。LINEの音声メッセージなら電話より自然に実現できる
4. 「家族が質問を提案・投票」は家族を巻き込む仕掛け（→ [line-experience.md](./line-experience.md)）として取り込みたい
5. 質問変更リンク（「この質問には答えにくい」への逃げ道）は回答継続率に効くので初期から入れる
