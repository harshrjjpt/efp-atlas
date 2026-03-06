import type { EFPAccount } from "@/lib/efp";
import {
  FAMOUS_PLANETS,
  MIN_PLANET_SEP,
  P_TYPES,
  PLANET_MARGIN,
  WEI_PER_ETH,
  WORLD_SIZE,
} from "./constants";
import { clamp, h01, hash32 } from "./math";
import type { Planet, PlanetExtras, Tile } from "./types";

export const isVitalikName = (name: string | null | undefined) =>
  (name ?? "").trim().toLowerCase() === "vitalik.eth";

export const isBlackHoleAccount = (account: Pick<EFPAccount, "name" | "rank">) =>
  isVitalikName(account.name) || account.rank === 1;

const scoreRadius = (score: number) =>
  clamp(300_000 + Math.log10(Math.max(score, 1)) * 300_000, 300_000, 1_500_000);

const radiusWithBalance = (score: number, ethBalance: number) => {
  const base = scoreRadius(score);
  const boost = 1 + Math.min(1.8, Math.log10(Math.max(ethBalance, 0) + 1) * 0.42);
  return clamp(base * boost, 220_000, 2_400_000);
};

export const radiusForAccount = (
  account: EFPAccount,
  ethBalance: number,
  famousKey?: string,
) => {
  const base = radiusWithBalance(account.score, ethBalance);
  const famous = famousKey ? FAMOUS_PLANETS[famousKey] : null;
  if (famous) return clamp(base * famous.sizeMultiplier, 900_000, 9_000_000);
  if (!isBlackHoleAccount(account)) return base;
  return clamp(base * 4.2, 900_000, 8_000_000);
};

export const weiToEthApprox = (weiStr: string) => {
  try {
    const wei = BigInt(weiStr);
    return clamp(
      Number(wei / WEI_PER_ETH) + Number(wei % WEI_PER_ETH) / 1e18,
      0,
      1_000_000_000,
    );
  } catch {
    return 0;
  }
};

export function deriveExtras(account: EFPAccount): PlanetExtras {
  const h = hash32(account.address);
  const h2 = hash32(account.address + "nft");
  const h3 = hash32(account.address + "defi");
  const h4 = hash32(account.address + "age");
  const activityScale = Math.min(1, Math.log10(Math.max(account.score, 1)) / 6);
  const nftCount = Math.floor(h01(h2) * 6 * activityScale + h01(h2 + 1) * 2);
  const tokenDiversity = h01(h + 77) * activityScale;
  const txCount = Math.floor(h01(h3) * 4 * activityScale);
  const defiActivity = Math.floor(
    h01(h3 + 111) * 3 * activityScale + (account.following > 100 ? 1 : 0),
  );
  const walletAge = h01(h4) * 0.6 + 0.2;
  const name = (account.name ?? "").toLowerCase();
  const famousKey = Object.keys(FAMOUS_PLANETS).find(
    (k) => name === k || name.includes(k.replace(".eth", "")),
  );
  return {
    nftCount,
    moonCount: nftCount,
    tokenDiversity,
    txCount,
    defiActivity,
    walletAge,
    famousKey,
  };
}

function placePlanet(
  account: EFPAccount,
  tile: Tile,
  siblings: Planet[],
  radius: number,
): { wx: number; wy: number } {
  const h = hash32(account.address);
  const span = WORLD_SIZE - PLANET_MARGIN * 2;
  const baseX = tile.originX + PLANET_MARGIN + h01(h) * span;
  const baseY = tile.originY + PLANET_MARGIN + h01(h + 999983) * span;

  for (let t = 0; t < 80; t++) {
    const jitter =
      t === 0 ? 0 : h01(h + t * 7919) * span * 0.4 * Math.min(1, t / 12);
    const angle = h01(h + t * 6271) * Math.PI * 2;
    const cx = clamp(
      baseX + Math.cos(angle) * jitter,
      tile.originX + PLANET_MARGIN,
      tile.originX + WORLD_SIZE - PLANET_MARGIN,
    );
    const cy = clamp(
      baseY + Math.sin(angle) * jitter,
      tile.originY + PLANET_MARGIN,
      tile.originY + WORLD_SIZE - PLANET_MARGIN,
    );

    let ok = true;
    for (const s of siblings) {
      const dx = cx - s.wx;
      const dy = cy - s.wy;
      if (dx * dx + dy * dy < (MIN_PLANET_SEP + radius + s.r) ** 2) {
        ok = false;
        break;
      }
    }

    if (ok) return { wx: cx, wy: cy };
  }

  return { wx: baseX, wy: baseY };
}

export function buildPlanet(account: EFPAccount, tile: Tile): Planet {
  const h = hash32(account.address);
  const extras = deriveExtras(account);
  const r = radiusForAccount(account, 0, extras.famousKey);
  const { wx, wy } = placePlanet(account, tile, tile.planets, r);

  const baseSpin =
    (0.02 + h01(h + 1) * 0.05) * (700_000 / Math.max(r, 300_000));
  const spinDir = ((h >> 7) & 1) === 0 ? 1 : -1;
  let type = P_TYPES[h % P_TYPES.length];
  if (extras.famousKey) type = FAMOUS_PLANETS[extras.famousKey].type;

  const hasRing = (h >> 4) % 5 === 0 || extras.defiActivity >= 1;
  return {
    account,
    wx,
    wy,
    r,
    ethBalance: 0,
    type,
    hasRing,
    rotSpeed: baseSpin * spinDir,
    rotOffset: h01(h + 2) * Math.PI * 2,
    tilt: (h01(h + 3) - 0.5) * 0.45,
    extras,
  };
}
