import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const ADDRESS_RE = /^0x[a-fA-F0-9]{40}$/;
const COVALENT_API_KEY =
  process.env.COVALENT_API_KEY ??
  process.env.NEXT_PUBLIC_COVALENT_API_KEY ??
  "ckey_docs";

interface CovalentNftBalanceItem {
  balance?: string | number;
}

interface CovalentPayload {
  data?: {
    items?: CovalentNftBalanceItem[];
  };
}

function parseCount(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) return Math.max(0, Math.floor(value));
  if (typeof value === "string") {
    const parsed = parseInt(value, 10);
    return Number.isFinite(parsed) ? Math.max(0, parsed) : 0;
  }
  return 0;
}

async function fetchNftCount(address: string): Promise<number> {
  const url = `https://api.covalenthq.com/v1/1/address/${address}/balances_nft/?nft=true&no-nft-fetch=true&key=${encodeURIComponent(COVALENT_API_KEY)}`;
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) return 0;

  const payload = (await res.json()) as CovalentPayload;
  const items = Array.isArray(payload?.data?.items) ? payload.data.items : [];
  return items.reduce((acc, item) => acc + parseCount(item?.balance), 0);
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const raw = Array.isArray(body?.addresses) ? body.addresses : [];
    const addresses: string[] = raw
      .map((v: unknown) => (typeof v === "string" ? v.trim().toLowerCase() : ""))
      .filter((v: string) => ADDRESS_RE.test(v))
      .slice(0, 60);

    if (addresses.length === 0) {
      return NextResponse.json({ counts: {} });
    }

    const counts: Record<string, number> = {};
    const batch = 8;
    for (let i = 0; i < addresses.length; i += batch) {
      const chunk = addresses.slice(i, i + batch);
      const results = await Promise.all(chunk.map((address) => fetchNftCount(address)));
      chunk.forEach((address, idx) => {
        counts[address] = results[idx] ?? 0;
      });
    }

    return NextResponse.json({ counts });
  } catch {
    return NextResponse.json({ counts: {} }, { status: 400 });
  }
}

