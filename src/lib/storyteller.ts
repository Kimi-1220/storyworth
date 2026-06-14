import { randomInt } from "node:crypto";
import { prisma } from "@/lib/db";

// LINE連携用のユニークな6桁コードを採番する。語り手の作成時に毎回付与する。
export async function uniqueLinkCode(): Promise<string> {
  for (;;) {
    const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
    const exists = await prisma.storyteller.findUnique({
      where: { linkCode: code },
    });
    if (!exists) return code;
  }
}
