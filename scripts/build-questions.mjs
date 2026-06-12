// docs/questions_jp.md を data/questions.json に変換する。
// 使い方: node scripts/build-questions.mjs
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const md = readFileSync(join(root, "docs/questions_jp.md"), "utf8");

const questions = [];
let category = null;
let source = null;
let sortOrder = 0;

for (const line of md.split("\n")) {
  const cat = line.match(/^## \d+\. (.+?)（(.+?)）/);
  if (cat) {
    category = cat[1];
    continue;
  }
  const sec = line.match(/^### (.+)/);
  if (sec) {
    source = sec[1].includes("Vault") ? "vault" : "storyworth";
    continue;
  }
  const q = line.match(/^- (.+)/);
  if (q && category && source) {
    questions.push({
      category,
      source,
      text: q[1].trim(),
      sortOrder: ++sortOrder,
    });
  }
}

mkdirSync(join(root, "data"), { recursive: true });
writeFileSync(
  join(root, "data/questions.json"),
  JSON.stringify(questions, null, 2) + "\n",
);
console.log(`wrote ${questions.length} questions to data/questions.json`);
