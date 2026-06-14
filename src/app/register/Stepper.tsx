// 登録導線の進捗表示。「いま誰の何を入力しているか」を常に見せる原則の補助。
// → docs/registration-flow.md「主語を明確にする原則」
export default function Stepper({
  current,
  kind,
}: {
  current: number; // 1始まり
  kind?: "self" | "gift";
}) {
  const steps =
    kind === "gift"
      ? ["プラン", "用途", "アカウント", "贈る相手", "部数", "支払い", "完了"]
      : kind === "self"
        ? ["プラン", "用途", "アカウント", "部数", "支払い", "はじめる"]
        : ["プラン", "用途", "アカウント", "部数", "支払い"];

  return (
    <ol className="stepper">
      {steps.map((label, i) => {
        const n = i + 1;
        const state = n < current ? "done" : n === current ? "active" : "";
        return (
          <li key={label} className={`step ${state}`}>
            <span className="step-num">{n}</span>
            <span className="step-label">{label}</span>
          </li>
        );
      })}
    </ol>
  );
}
