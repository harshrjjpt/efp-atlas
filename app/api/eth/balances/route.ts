import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const ETH_RPC_URL =
  process.env.ETH_RPC_URL ??
  process.env.NEXT_PUBLIC_ETH_RPC_URL ??
  "https://ethereum.publicnode.com";

const ADDRESS_RE = /^0x[a-fA-F0-9]{40}$/;

interface BalanceRpcResult {
  id: number;
  result?: string;
  error?: { code: number; message: string };
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const raw = Array.isArray(body?.addresses) ? body.addresses : [];
    const addresses: string[] = raw
      .map((v: unknown) => (typeof v === "string" ? v.trim().toLowerCase() : ""))
      .filter((v: string) => ADDRESS_RE.test(v))
      .slice(0, 120);

    if (addresses.length === 0) {
      return NextResponse.json({ balances: {} });
    }

    const rpcReq = addresses.map((address, i) => ({
      jsonrpc: "2.0",
      id: i + 1,
      method: "eth_getBalance",
      params: [address, "latest"],
    }));

    const rpcRes = await fetch(ETH_RPC_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(rpcReq),
      cache: "no-store",
    });

    if (!rpcRes.ok) {
      return NextResponse.json({ balances: {} }, { status: 502 });
    }

    const payload = (await rpcRes.json()) as BalanceRpcResult[] | BalanceRpcResult;
    const results = Array.isArray(payload) ? payload : [payload];
    const byId = new Map<number, string>();

    for (const row of results) {
      if (!row || typeof row.id !== "number") continue;
      const hex = typeof row.result === "string" ? row.result : "0x0";
      try {
        byId.set(row.id, BigInt(hex).toString());
      } catch {
        byId.set(row.id, "0");
      }
    }

    const balances: Record<string, string> = {};
    addresses.forEach((address, idx) => {
      balances[address] = byId.get(idx + 1) ?? "0";
    });

    return NextResponse.json({ balances });
  } catch {
    return NextResponse.json({ balances: {} }, { status: 400 });
  }
}
