-- Neon SQL Editor 用セットアップ（スキーマ + 質問89問）。
-- 冪等: 新規セットアップにも、既存DBへの執筆スタジオ機能の追加にも、そのまま流せる。

CREATE SCHEMA IF NOT EXISTS "public";

-- ===== テーブル =====

CREATE TABLE IF NOT EXISTS "Storyteller" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "lineUserId" TEXT,
    "linkCode" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Storyteller_pkey" PRIMARY KEY ("id")
);

-- 執筆スタジオへのマジックリンク（1回限り・短命トークン）
CREATE TABLE IF NOT EXISTS "MagicLink" (
    "token" TEXT NOT NULL,
    "storytellerId" TEXT NOT NULL,
    "promptId" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "MagicLink_pkey" PRIMARY KEY ("token")
);

-- 章（カテゴリごとに1つ・タイトルを内容に合わせて更新）
CREATE TABLE IF NOT EXISTS "Chapter" (
    "id" TEXT NOT NULL,
    "storytellerId" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Chapter_pkey" PRIMARY KEY ("id")
);

-- 旧スキーマで body が NOT NULL だった場合は外す（セクションに本文が移行）
ALTER TABLE "Chapter" ALTER COLUMN "body" DROP NOT NULL;

-- セクション（1質問=1セクション。本人が編集可能）
CREATE TABLE IF NOT EXISTS "Section" (
    "id" TEXT NOT NULL,
    "storytellerId" TEXT NOT NULL,
    "promptId" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "edited" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Section_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "Question" (
    "id" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL,
    CONSTRAINT "Question_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "Prompt" (
    "id" TEXT NOT NULL,
    "storytellerId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'open',
    "novelText" TEXT,
    "reaction" TEXT,
    "followups" TEXT,
    "sentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Prompt_pkey" PRIMARY KEY ("id")
);

-- 既存DBにスタジオ用の列を追加（新規CREATE時は no-op）
ALTER TABLE "Prompt" ADD COLUMN IF NOT EXISTS "novelText" TEXT;
ALTER TABLE "Prompt" ADD COLUMN IF NOT EXISTS "reaction" TEXT;
ALTER TABLE "Prompt" ADD COLUMN IF NOT EXISTS "followups" TEXT;

CREATE TABLE IF NOT EXISTS "Answer" (
    "id" TEXT NOT NULL,
    "promptId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "text" TEXT,
    "mediaPath" TEXT,
    "via" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Answer_pkey" PRIMARY KEY ("id")
);

-- 取材チャットのAI側ログ（リアクション・深掘りを1ターンずつ保存）
CREATE TABLE IF NOT EXISTS "InterviewMessage" (
    "id" TEXT NOT NULL,
    "promptId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "InterviewMessage_pkey" PRIMARY KEY ("id")
);

-- ===== インデックス =====

CREATE UNIQUE INDEX IF NOT EXISTS "Storyteller_lineUserId_key" ON "Storyteller"("lineUserId");
CREATE UNIQUE INDEX IF NOT EXISTS "Storyteller_linkCode_key" ON "Storyteller"("linkCode");
CREATE INDEX IF NOT EXISTS "MagicLink_storytellerId_idx" ON "MagicLink"("storytellerId");
CREATE UNIQUE INDEX IF NOT EXISTS "Chapter_storytellerId_category_key" ON "Chapter"("storytellerId", "category");
CREATE UNIQUE INDEX IF NOT EXISTS "Section_promptId_key" ON "Section"("promptId");
CREATE INDEX IF NOT EXISTS "Section_storytellerId_category_idx" ON "Section"("storytellerId", "category");
CREATE INDEX IF NOT EXISTS "InterviewMessage_promptId_idx" ON "InterviewMessage"("promptId");
CREATE UNIQUE INDEX IF NOT EXISTS "Question_text_key" ON "Question"("text");
CREATE UNIQUE INDEX IF NOT EXISTS "Prompt_storytellerId_questionId_key" ON "Prompt"("storytellerId", "questionId");

-- ===== 外部キー（重複作成を避けて冪等に） =====

DO $$ BEGIN
  ALTER TABLE "MagicLink" ADD CONSTRAINT "MagicLink_storytellerId_fkey" FOREIGN KEY ("storytellerId") REFERENCES "Storyteller"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "Chapter" ADD CONSTRAINT "Chapter_storytellerId_fkey" FOREIGN KEY ("storytellerId") REFERENCES "Storyteller"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "Section" ADD CONSTRAINT "Section_storytellerId_fkey" FOREIGN KEY ("storytellerId") REFERENCES "Storyteller"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "Section" ADD CONSTRAINT "Section_promptId_fkey" FOREIGN KEY ("promptId") REFERENCES "Prompt"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "Prompt" ADD CONSTRAINT "Prompt_storytellerId_fkey" FOREIGN KEY ("storytellerId") REFERENCES "Storyteller"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "Prompt" ADD CONSTRAINT "Prompt_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "Question"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "Answer" ADD CONSTRAINT "Answer_promptId_fkey" FOREIGN KEY ("promptId") REFERENCES "Prompt"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "InterviewMessage" ADD CONSTRAINT "InterviewMessage_promptId_fkey" FOREIGN KEY ("promptId") REFERENCES "Prompt"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;


-- Seed: 質問マスタ89問（data/questions.json 由来）
INSERT INTO "Question" ("id", "category", "source", "text", "sortOrder") VALUES
('c155a68df2bc3f55388495100', '幼少期', 'storyworth', 'いちばん古い記憶は何ですか？', 1),
('c42bcd522e365e752b5c4505c', '幼少期', 'storyworth', '育った家について教えてください。', 2),
('ccc33da281bf16002a28e7b2b', '幼少期', 'storyworth', '子どもの頃の好きな食べ物は何でしたか？', 3),
('cf081879f0998b43005bcc82f', '幼少期', 'storyworth', '好きだった遊びやおもちゃは何でしたか？', 4),
('cd507c621ba104d555258b874', '幼少期', 'storyworth', 'あなたの寝室はどんな様子でしたか？', 5),
('caf1f7a19b29b8d0badd64338', '幼少期', 'storyworth', '子どもの頃いちばん仲が良かった友達は誰でしたか？', 6),
('c962948d0e52c600af013c95c', '幼少期', 'vault', 'あなたの一番最初の記憶は何ですか？', 7),
('cb99e4ad9149054ce2b0ca659', '幼少期', 'vault', '育った家について、どんなことを覚えていますか？', 8),
('c9179a57987f5fb92e85f4be6', '幼少期', 'vault', '子どもの頃、家での typical な一日はどんな様子でしたか？', 9),
('c2e4951f8f7d5efb258ef2383', '幼少期', 'vault', '子どもの頃、何をするのが大好きでしたか？', 10),
('c08e6e205aa8029632b96cfa8', '幼少期', 'vault', '初めての友達は誰で、一緒に何をしていましたか？', 11),
('cbf3da23ea9c0b5358bd3fca9', '幼少期', 'vault', '子どもの頃、何をすると叱られましたか？', 12),
('c7f7a24110965ca44b9e7618c', '幼少期', 'vault', '幼い頃、何が一番怖かったですか？', 13),
('cd38fe7eaba3e500ef4dd5bd0', '幼少期', 'vault', 'どんな匂い・音・味が、あなたを子ども時代に引き戻しますか？', 14),
('c1f820893f1dc2177a73bd76a', '幼少期', 'vault', '子どもの頃に起きた、一番おかしかった出来事は何ですか？', 15),
('cbf6106204b52711754aae272', '幼少期', 'vault', 'あなたの子ども時代について、人々に分かってほしいことは何ですか？', 16),
('cbf40117074750e5844364bf8', '家族と育ててくれた人々', 'storyworth', 'あなたのお母さんはどんな人でしたか？', 17),
('cdc0cd00cff8bcb02f132f019', '家族と育ててくれた人々', 'storyworth', 'あなたのお父さんはどんな人でしたか？', 18),
('c0b41b74466dff6b436237921', '家族と育ててくれた人々', 'storyworth', '祖父母から何を学びましたか？', 19),
('c4d2c2c79e0b0e637963396f4', '家族と育ててくれた人々', 'storyworth', '一番よく覚えている家族の伝統は何ですか？', 20),
('c4b7d7d52059ef47ef438f71a', '家族と育ててくれた人々', 'storyworth', 'あなたの家では、祝日はどんな様子でしたか？', 21),
('c8bb96be830732a16d8d5fb64', '家族と育ててくれた人々', 'vault', 'あなたを育ててくれた人について、一番よく覚えていることは何ですか？', 22),
('c943ef4071d416bfca8841157', '家族と育ててくれた人々', 'vault', '家族から受け継いで、今も持ち続けている習慣や言葉はありますか？', 23),
('c878a966c78d5b5c2bba00981', '家族と育ててくれた人々', 'vault', 'あなたの家族が持っていて、大好きだった伝統は何ですか？', 24),
('cb56a087b52bc0213503f15c7', '家族と育ててくれた人々', 'vault', '家族の誰かが、言葉にせずに教えてくれた教訓は何ですか？', 25),
('c2c69bb4e01065522fa108131', '家族と育ててくれた人々', 'vault', '家族の中で、あなたを最も形作ったのは誰だと思いますか？それはどのように？', 26),
('ce05d4354e72fbd816a328bf4', '家族と育ててくれた人々', 'vault', '若い頃には分からなかったけれど、今は家族に感謝していることは何ですか？', 27),
('c13090c998566b26919e4cb68', '家族と育ててくれた人々', 'vault', 'まだ聞けるうちに、家族の誰かに聞いておけばよかったと思うことは何ですか？', 28),
('cb3c43a2139d464311a243074', '成長と自分探し', 'storyworth', '10代の頃、好きだった音楽は何でしたか？', 29),
('cb16a57a71fb029853b4cca1e', '成長と自分探し', 'storyworth', '大人になったら何になりたいと思っていましたか？', 30),
('cd6353a4591988742eae1d73f', '成長と自分探し', 'storyworth', '印象に残っている先生について教えてください。', 31),
('c01d8e30e2bd6415e99ad10aa', '成長と自分探し', 'storyworth', '高校を卒業した後、何をしましたか？', 32),
('c418ad95c4c676152e632ff40', '成長と自分探し', 'storyworth', '初めて持った車は何でしたか？', 33),
('c7af43a7c050a39815e966de1', '成長と自分探し', 'vault', '若い頃に抱いていた、誰も知らなかった夢は何ですか？', 34),
('c0772adb7c7f5b33503e0ce7d', '成長と自分探し', 'vault', '「ようやく大人になった」と感じた瞬間はどんな時でしたか？', 35),
('cbc1b17132bc18b06aee4f4ac', '成長と自分探し', 'vault', '学生時代の一番強い記憶は何ですか？', 36),
('cfe559e9307d9bce30f6a3066', '成長と自分探し', 'vault', '10代の自分にすぐ引き戻してくれる曲や映画は何ですか？', 37),
('ca53f7e38f1a17a67df95fcc7', '成長と自分探し', 'vault', '若い頃に世界について信じていたことで、後に違っていたと分かったことは何ですか？', 38),
('c127dbcd1041757d5b6762802', '成長と自分探し', 'vault', '若い頃の経験で、人生の方向を変えたものは何ですか？', 39),
('c1703afe97a0c81a8fb027515', '愛と人間関係', 'storyworth', '配偶者とはどのように出会いましたか？', 40),
('c3c675f38bdba153d35421474', '愛と人間関係', 'storyworth', '結婚式の日はどんな様子でしたか？', 41),
('cff0fefef510fb35eea476c43', '愛と人間関係', 'storyworth', '初めて二人で暮らした家はどんな所でしたか？', 42),
('c3f9f151464a8248a5fdab7da', '愛と人間関係', 'storyworth', '若いカップルにどんなアドバイスをしますか？', 43),
('c757581cc7797ee6b2c57cabf', '愛と人間関係', 'vault', '初めて恋に落ちた時のことを、どんなふうに覚えていますか？', 44),
('c8339f33b19184be7d62e1fdc', '愛と人間関係', 'vault', '人間関係について受けた、一番のアドバイスは何ですか？', 45),
('cb178be47a8d41366985483ac', '愛と人間関係', 'vault', '愛する人との小さな瞬間で、よく思い返すものは何ですか？', 46),
('c7ab2f34ddbbebb8b20be434a', '愛と人間関係', 'vault', 'あなたの人生で、最も予想外だった友情は誰とのものですか？', 47),
('cf877bdad6cdc9799fa9cc2a4', '仕事・目的・野心', 'storyworth', '初めての仕事は何でしたか？', 48),
('c87d4cb9cf822b56eae542bca', '仕事・目的・野心', 'storyworth', '何を生業にしていましたか？そして、なぜそれを選びましたか？', 49),
('c3beecc0ef8b50d056b4b519b', '仕事・目的・野心', 'storyworth', 'これまでで一番大変だった仕事は何でしたか？', 50),
('ce9d4356263ae175e084f301f', '仕事・目的・野心', 'storyworth', '今でも誇りに思える仕事の思い出は何ですか？', 51),
('c2cd7767891718b4f011fbfd3', '仕事・目的・野心', 'vault', '初めての仕事は何で、そこから何を学びましたか？', 52),
('c3f6f1884dddd914b84027b37', '仕事・目的・野心', 'vault', 'これまでで最も誇りに感じた仕事は何ですか？', 53),
('cb69f01a406272fd7c8ac9425', '仕事・目的・野心', 'vault', '大人になったら何になりたかったですか？そして、それはどう変わりましたか？', 54),
('c4f9f33f6dd7742f57357e34d', '仕事・目的・野心', 'vault', '仕事や人生の進路で、最も難しかった決断は何ですか？', 55),
('cfc48fe224c9d831e85ea4f4f', '親であること・子育て', 'storyworth', 'お子さんがそれぞれ生まれた日は、どんな様子でしたか？', 56),
('c65209ae775be8f20f795c3ef', '親であること・子育て', 'storyworth', '親であることで、一番大変だと感じたことは何ですか？', 57),
('ccac69c5dcbbb3f74a30fe344', '親であること・子育て', 'storyworth', '子どもとの、決して忘れられない瞬間は何ですか？', 58),
('cf85f186ea5fc98af98afc085', '親であること・子育て', 'storyworth', '子どもたちに、自分の子ども時代について何を覚えていてほしいですか？', 59),
('ceef0aae7720f70b042a8d3af', '親であること・子育て', 'vault', '親になって、一番驚いたことは何ですか？', 60),
('ce5878efe4c81127d18ec78f8', '親であること・子育て', 'vault', '子どもとの瞬間で、あなたにとって最も大切だったものは何ですか？', 61),
('c69e0da2fcc9e55fe07aa476d', '親であること・子育て', 'vault', 'あなたの姿を見て、子どもたちが学んでくれたらと願うことは何ですか？', 62),
('cefaf98b9d6b19a861e72388c', '親であること・子育て', 'vault', '子どもがしたことで、涙が出るほど笑ったことは何ですか？', 63),
('c9c333ee9377d6745e4eb3c76', '困難な時期と回復力', 'storyworth', '人生で一番つらかった時期はいつですか？', 64),
('cba22264d87f1a16361b68bbf', '困難な時期と回復力', 'storyworth', 'どのようにして困難な時期を乗り越えましたか？', 65),
('c24092c439c99954bd573e4eb', '困難な時期と回復力', 'storyworth', '誰も知らなかったと思う、あなたが抱えていた葛藤は何ですか？', 66),
('cdec8407e18aed76e3d42417e', '困難な時期と回復力', 'vault', '人生で最もつらかった時期はいつで、どうやって乗り越えましたか？', 67),
('c4403f9fa013037a17415324f', '困難な時期と回復力', 'vault', '今のあなたを形作った喪失や苦しみは何ですか？', 68),
('c883bce81e55cf477656cc0f9', '困難な時期と回復力', 'vault', '誰も気づいていなくても、自分が最も強かったと感じたのはいつですか？', 69),
('c037ebbbe2515816725cf7a3b', '困難な時期と回復力', 'vault', '物事が不可能に思えた時、あなたを支えてくれたものは何ですか？', 70),
('c546d33368de2e334186ff711', '喜び・楽しさ・明るい側面', 'storyworth', '一番好きな旅行の思い出は何ですか？', 71),
('ccb6a6ad0b390c141e1f8e16d', '喜び・楽しさ・明るい側面', 'storyworth', '決して忘れられない食事は何ですか？', 72),
('c6a38173773dabb89b4fc8952', '喜び・楽しさ・明るい側面', 'storyworth', 'これまでで一番冒険的だったことは何ですか？', 73),
('c193a737bf1ddef67e7264334', '喜び・楽しさ・明るい側面', 'storyworth', '長年にわたって愛してきた趣味は何ですか？', 74),
('c0cd5f3dfff1a7d15b07857d1', '喜び・楽しさ・明るい側面', 'vault', 'これまでで一番おいしかった食事は何で、誰と一緒でしたか？', 75),
('c971cb61713bf1ea758acedf3', '喜び・楽しさ・明るい側面', 'vault', 'これまでで最も冒険的だったことは何ですか？', 76),
('c01304171f7f300998461238a', '喜び・楽しさ・明るい側面', 'vault', 'どんな時でも必ず笑ってしまうものは何ですか？', 77),
('cd52c379af52823aaa2615891', '喜び・楽しさ・明るい側面', 'vault', '訪れた場所で、決して忘れられない所はどこですか？', 78),
('cd8f6374c98ac30f070b9d303', '喜び・楽しさ・明るい側面', 'vault', 'ほとんどの人が知らない、あなたの才能や趣味は何ですか？', 79),
('c7b3453b59d980ee6fb886c79', '知恵・振り返り・遺産', 'storyworth', '若い頃の自分にどんなアドバイスをしますか？', 80),
('c27b33381c4b1bf2eb524c2ec', '知恵・振り返り・遺産', 'storyworth', '何に最も感謝していますか？', 81),
('c77a16a30819d1c086ffa4321', '知恵・振り返り・遺産', 'storyworth', '孫たちに、あなたについて何を覚えていてほしいですか？', 82),
('c81af9e4720dbb89449e39e98', '知恵・振り返り・遺産', 'storyworth', '人生が教えてくれた最も大切な教訓は何ですか？', 83),
('c7b84f915392743d0e3414c62', '知恵・振り返り・遺産', 'vault', '20歳の頃に知っておきたかったと思う、今知っていることは何ですか？', 84),
('c326d9357d4d7b007d7e35d03', '知恵・振り返り・遺産', 'vault', '人生を振り返って、最も感謝していることは何ですか？', 85),
('cc1977dbeaf2570d0ae8fb4ff', '知恵・振り返り・遺産', 'vault', '人々があなたについて誤解していると思うことは何ですか？', 86),
('cb598a1c6b9df079dab26e173', '知恵・振り返り・遺産', 'vault', 'あなたの人生のどの瞬間が、決して忘れられないでほしいと願いますか？', 87),
('c9cb2d3b6ca1a0d95c9f96f8d', '知恵・振り返り・遺産', 'vault', '家族の未来の世代に、あなたについて知っておいてほしいことは何ですか？', 88),
('ca640cf5e4b16f2142bb2d7c5', '知恵・振り返り・遺産', 'vault', '愛する人たちに一つだけメッセージを残せるとしたら、何を伝えますか？', 89)
ON CONFLICT ("text") DO NOTHING;
