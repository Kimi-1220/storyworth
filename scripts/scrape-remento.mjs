import { chromium } from "playwright";
import { writeFileSync } from "node:fs";

const urls = {
  "storyworth-review": "https://www.remento.co/journal/storyworth",
  "questions-lists":
    "https://www.remento.co/journal/questions-to-ask-to-get-to-know-someone",
};

const browser = await chromium.launch({
  headless: true,
  executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome",
  args: ["--disable-blink-features=AutomationControlled"],
});
const ctx = await browser.newContext({
  userAgent:
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
  locale: "en-US",
  ignoreHTTPSErrors: true,
  viewport: { width: 1280, height: 900 },
});

for (const [name, url] of Object.entries(urls)) {
  const page = await ctx.newPage();
  try {
    const resp = await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60000 });
    console.log(name, "status:", resp?.status());
    await page.waitForTimeout(5000);
    const text = await page.evaluate(() => {
      // 見出し・リスト構造を保ったテキスト抽出
      function walk(node, depth) {
        let out = "";
        for (const el of node.children) {
          const tag = el.tagName.toLowerCase();
          if (/^h[1-6]$/.test(tag)) {
            out += "\n" + "#".repeat(Number(tag[1])) + " " + el.innerText.trim() + "\n";
          } else if (tag === "li") {
            out += "- " + el.innerText.trim().replace(/\n+/g, " ") + "\n";
          } else if (tag === "p") {
            const t = el.innerText.trim();
            if (t) out += t + "\n";
          } else if (["script", "style", "nav", "footer", "header", "noscript"].includes(tag)) {
            // skip
          } else {
            out += walk(el, depth + 1);
          }
        }
        return out;
      }
      return walk(document.body, 0);
    });
    writeFileSync(`/tmp/${name}.txt`, text);
    console.log(name, "chars:", text.length);
  } catch (e) {
    console.error(name, "FAILED:", e.message);
  }
  await page.close();
}
await browser.close();
