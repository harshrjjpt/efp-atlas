const EFP_API = "https://api.ethfollow.xyz/api/v1";
const DEFAULT_ROOT_ACCOUNT = process.env.EFP_ROOT_ACCOUNT ?? "0xd8da6bf26964af9d7eed9e03e53415d37aa96045";
export const DEFAULT_PAGE_SIZE = 80;

export interface EFPAccount {
  address: string;
  name: string | null;
  avatar: string | null;
  followers: number;
  following: number;
  rank: number;
  bio: string | null;
  score: number;
}

interface EFPUserEntry {
  address: string;
  name: string | null;
  avatar: string | null;
  followers_count?: string;
  following_count?: string;
}

interface LeaderboardEntry {
  address: string;
  name: string | null;
  avatar: string | null;
  followers_count?: string;
  following_count?: string;
}

export async function fetchEfpNetwork(
  rootAccount = DEFAULT_ROOT_ACCOUNT,
  limit = 80
): Promise<EFPAccount[]> {
  const normalizedLimit = Math.max(10, Math.min(limit, 200));
  const [followersRes, followingRes, rootStatsRes, rootEnsRes] = await Promise.all([
    fetch(
      `${EFP_API}/users/${rootAccount}/followers?limit=${normalizedLimit}&offset=0`,
      { next: { revalidate: 300 } }
    ),
    fetch(
      `${EFP_API}/users/${rootAccount}/following?limit=${normalizedLimit}&offset=0`,
      { next: { revalidate: 300 } }
    ),
    fetch(`${EFP_API}/users/${rootAccount}/stats`, { next: { revalidate: 300 } }),
    fetch(`${EFP_API}/users/${rootAccount}/ens`, { next: { revalidate: 600 } }),
  ]);

  if (!followersRes.ok && !followingRes.ok) {
    throw new Error("Failed to fetch EFP network");
  }

  const [followersPayload, followingPayload, rootStatsPayload, rootEnsPayload] = await Promise.all([
    followersRes.ok ? followersRes.json() : Promise.resolve({}),
    followingRes.ok ? followingRes.json() : Promise.resolve({}),
    rootStatsRes.ok ? rootStatsRes.json() : Promise.resolve({}),
    rootEnsRes.ok ? rootEnsRes.json() : Promise.resolve({}),
  ]);

  const combined = new Map<string, EFPAccount>();

  const ingest = (entry: EFPUserEntry) => {
    if (!entry?.address) return;
    const address = entry.address.toLowerCase();
    const existing = combined.get(address);
    const followers = parseCount(entry.followers_count);
    const following = parseCount(entry.following_count);
    const score = computeScore(followers, following);

    combined.set(address, {
      address,
      name: entry.name ?? existing?.name ?? null,
      avatar: entry.avatar ?? existing?.avatar ?? null,
      followers: Math.max(existing?.followers ?? 0, followers),
      following: Math.max(existing?.following ?? 0, following),
      score: Math.max(existing?.score ?? 0, score),
      rank: 0,
      bio: null,
    });
  };

  extractUserList(followersPayload, "followers").forEach(ingest);
  extractUserList(followingPayload, "following").forEach(ingest);

  const rootAddress = rootEnsPayload?.address ?? rootAccount;
  if (typeof rootAddress === "string" && rootAddress) {
    const normalizedRootAddress = rootAddress.toLowerCase();
    combined.set(normalizedRootAddress, {
      address: normalizedRootAddress,
      name: rootEnsPayload?.name ?? null,
      avatar: rootEnsPayload?.avatar ?? null,
      followers: parseCount(rootStatsPayload?.followers_count),
      following: parseCount(rootStatsPayload?.following_count),
      score: computeScore(
        parseCount(rootStatsPayload?.followers_count),
        parseCount(rootStatsPayload?.following_count)
      ),
      rank: 0,
      bio: rootEnsPayload?.records?.description ?? null,
    });
  }

  const accounts = Array.from(combined.values())
    .sort((a, b) => b.score - a.score)
    .map((account, i) => ({ ...account, rank: i + 1 }));

  return accounts.slice(0, normalizedLimit);
}

export async function fetchLeaderboardPage(page: number, limit = DEFAULT_PAGE_SIZE): Promise<EFPAccount[]> {
  const normalizedPage = Math.max(0, Math.floor(page));
  const normalizedLimit = Math.max(20, Math.min(limit, 200));
  const offset = normalizedPage * normalizedLimit;
  const res = await fetch(
    `${EFP_API}/leaderboard/followers?limit=${normalizedLimit}&offset=${offset}`,
    { cache: "no-store" }
  );

  if (!res.ok) {
    throw new Error(`Failed to fetch leaderboard page ${normalizedPage}`);
  }

  const payload = await res.json();
  const entries = extractLeaderboardEntries(payload);

  const mapped: EFPAccount[] = [];
  entries.forEach((entry, i) => {
    const address = readString(entry, ["address", "wallet", "account", "user_address"]);
    if (!address) return;
    const followers = parseCount(
      readCount(entry, ["followers_count", "follower_count", "followers", "followersCount"])
    );
    const following = parseCount(
      readCount(entry, ["following_count", "following", "followingCount", "followings"])
    );
    mapped.push({
      address: address.toLowerCase(),
      name: readString(entry, ["name", "ens", "display_name", "username"]),
      avatar: readString(entry, ["avatar", "avatar_url", "image", "pfp"]),
      followers,
      following,
      rank: offset + i + 1,
      bio: null,
      score: computeScore(followers, following),
    });
  });

  return mapped;
}

function extractUserList(payload: any, key: "followers" | "following"): EFPUserEntry[] {
  if (Array.isArray(payload?.[key])) return payload[key];
  if (Array.isArray(payload?.results)) return payload.results;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload)) return payload;
  return [];
}

function parseCount(value: unknown): number {
  if (typeof value === "number") return value;
  if (typeof value === "string") {
    const parsed = parseInt(value, 10);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

function computeScore(followers: number, following: number): number {
  return followers * 1.2 + following * 0.8 + 1;
}

function extractLeaderboardEntries(payload: any): LeaderboardEntry[] {
  const directCandidates = [
    payload?.followers,
    payload?.leaderboard,
    payload?.accounts,
    payload?.items,
    payload?.rows,
    payload?.results,
    payload?.data,
    payload,
  ];

  for (const candidate of directCandidates) {
    if (Array.isArray(candidate) && candidate.some(hasAddressLikeField)) {
      return candidate;
    }
  }

  const deep = findAddressArray(payload, 0, 4);
  return deep ?? [];
}

function findAddressArray(value: any, depth: number, maxDepth: number): LeaderboardEntry[] | null {
  if (depth > maxDepth || value == null) return null;
  if (Array.isArray(value)) {
    if (value.some(hasAddressLikeField)) {
      return value;
    }
    for (const item of value) {
      const found = findAddressArray(item, depth + 1, maxDepth);
      if (found) return found;
    }
    return null;
  }
  if (typeof value === "object") {
    for (const key of Object.keys(value)) {
      const found = findAddressArray(value[key], depth + 1, maxDepth);
      if (found) return found;
    }
  }
  return null;
}

function hasAddressLikeField(entry: any): boolean {
  if (!entry || typeof entry !== "object") return false;
  return Boolean(
    entry.address ||
    entry.wallet ||
    entry.account ||
    entry.user_address
  );
}

function readString(entry: any, keys: string[]): string | null {
  for (const key of keys) {
    const value = entry?.[key];
    if (typeof value === "string" && value.trim().length > 0) {
      return value;
    }
  }
  return null;
}

function readCount(entry: any, keys: string[]): unknown {
  for (const key of keys) {
    if (entry?.[key] != null) return entry[key];
  }
  return 0;
}
