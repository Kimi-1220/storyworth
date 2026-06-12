// data/questions.json を Question テーブルに投入する。
// 使い方: npm run db:seed
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { PrismaClient } from "@prisma/client";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const questions = JSON.parse(
  readFileSync(join(root, "data/questions.json"), "utf8"),
);

const prisma = new PrismaClient();

for (const q of questions) {
  await prisma.question.upsert({
    where: { text: q.text },
    update: { category: q.category, source: q.source, sortOrder: q.sortOrder },
    create: q,
  });
}

console.log(`seeded ${questions.length} questions`);
await prisma.$disconnect();
