const EFP_API = "https://api.ethfollow.xyz/api/v1";

const ADDRESS_RE = /^0x[a-fA-F0-9]{40}$/;

export interface PlanetProfile {
  address: string;
  name: string | null;
  avatar: string | null;
  followers: number;
  following: number;
  score: number;
  rank: number | null;
  bio: string | null;
}

const parseCount = (value: unknown): number => {
  if (typeof value === "number") return value;
  if (typeof value === "string") {
    const parsed = parseInt(value, 10);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
};

const parseRank = (value: unknown): number | null => {
  if (typeof value === "number" && Number.isFinite(value) && value > 0) {
    return Math.floor(value);
  }
  if (typeof value === "string") {
    const parsed = parseInt(value, 10);
    if (Number.isFinite(parsed) && parsed > 0) return parsed;
  }
  return null;
};

const computeScore = (followers: number, following: number) => followers * 1.2 + following * 0.8 + 1;

export async function fetchPlanetProfile(addressRaw: string): Promise<PlanetProfile | null> {
  const address = (addressRaw ?? "").trim().toLowerCase();
  if (!ADDRESS_RE.test(address)) return null;

  try {
    const [ensRes, statsRes] = await Promise.all([
      fetch(`${EFP_API}/users/${address}/ens`, { next: { revalidate: 300 } }),
      fetch(`${EFP_API}/users/${address}/stats`, { next: { revalidate: 300 } }),
    ]);

    const ensPayload = ensRes.ok ? await ensRes.json() : {};
    const statsPayload = statsRes.ok ? await statsRes.json() : {};

    const followers = parseCount(statsPayload?.followers_count ?? statsPayload?.followers);
    const following = parseCount(statsPayload?.following_count ?? statsPayload?.following);
    const rank = parseRank(statsPayload?.rank ?? statsPayload?.leaderboard_rank);

    return {
      address,
      name: typeof ensPayload?.name === "string" ? ensPayload.name : null,
      avatar: typeof ensPayload?.avatar === "string" ? ensPayload.avatar : null,
      followers,
      following,
      score: computeScore(followers, following),
      rank,
      bio: typeof ensPayload?.records?.description === "string" ? ensPayload.records.description : null,
    };
  } catch {
    return null;
  }
}
