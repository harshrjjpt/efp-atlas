import { NextResponse } from "next/server";
import { DEFAULT_PAGE_SIZE, fetchLeaderboardPage } from "@/lib/efp";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const pageParam = Number(searchParams.get("page") ?? "0");
  const limitParam = Number(searchParams.get("limit") ?? `${DEFAULT_PAGE_SIZE}`);

  const page = Number.isFinite(pageParam) ? Math.max(0, Math.floor(pageParam)) : 0;
  const limit = Number.isFinite(limitParam) ? Math.max(20, Math.min(Math.floor(limitParam), 200)) : DEFAULT_PAGE_SIZE;

  try {
    const accounts = await fetchLeaderboardPage(page, limit);
    return NextResponse.json({ accounts, page, limit });
  } catch (error) {
    return NextResponse.json(
      { error: "Unable to load EFP leaderboard page.", page, limit },
      { status: 502 }
    );
  }
}
