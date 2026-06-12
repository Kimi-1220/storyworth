import Link from "next/link";

export default function Home() {
  return (
    <div>
      <h1>家族の人生を、一冊の本に。</h1>
      <p>
        毎週1つ、LINEで質問が届きます。文章でも、写真でも、声でも——
        答えていくだけで、親や祖父母の人生の物語が少しずつ集まり、
        最後にハードカバーの一冊になります。
      </p>
      <div className="card">
        <h2>つかいかた</h2>
        <ol>
          <li>語り手（お母さん・おばあちゃん）を登録する</li>
          <li>LINE公式アカウントを友だち追加して、連携コードを送る</li>
          <li>毎週届く質問に、トークで答えるだけ</li>
          <li>集まった物語が、一冊の本になる</li>
        </ol>
        <p>
          <Link href="/dashboard">→ ダッシュボードへ</Link>
        </p>
      </div>
    </div>
  );
}
