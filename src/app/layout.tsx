import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ものがたり | 家族の伝記をつくる",
  description:
    "毎週LINEで届く質問に答えるだけで、親・祖父母の人生が一冊の本になる",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja">
      <body>
        <header className="site-header">
          <a href="/" className="logo">
            ものがたり
          </a>
          <nav>
            <a href="/dashboard">ダッシュボード</a>
          </nav>
        </header>
        <main className="container">{children}</main>
      </body>
    </html>
  );
}
