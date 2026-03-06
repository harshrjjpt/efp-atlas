import type { FamousPlanet, PlanetPalette, PlanetType } from "./types";
import { h01 } from "./math";

export const WORLD_SIZE = 80_000_000;
export const EDGE_TRIGGER = 20_000_000;
export const PLANET_MARGIN = 2_000_000;
export const MIN_PLANET_SEP = 3_000_000;
export const INITIAL_ZOOM = 0.000_030;
export const ZOOM_MIN = 0.000_005;
export const ZOOM_MAX = 0.002;
export const THRESH_SYSTEM = 0.000_008;
export const THRESH_PLANET = 0.000_080;
export const PLANET_SCREEN_SCALE = 0.2;
export const INERTIA_DECAY = 0.84;
export const EDGE_PAN_ZONE_PX = 96;
export const EDGE_PAN_SPEED = 0.085;
export const WEI_PER_ETH = BigInt("1000000000000000000");
export const ROCKET_WORLD_RADIUS = 420_000;
export const ROCKET_IDLE_SPEED = 2_400_000;
export const ROCKET_MAX_SPEED = 12_000_000;
export const ROCKET_ACCEL = 11_000_000;
export const ROCKET_DECEL = 7_500_000;
export const ROCKET_TURN_RATE = 2.9;
export const ROCKET_BOUNCE = 0.65;
export const MAX_REQ = 2;
export const REQ_GAP_MS = 500;
export const PAGE_SIZE = 80;
export const MAX_PLANETS_SCREEN = 400;
export const STAR_COUNT = 900;
export const NEBULA_COUNT = 12;
export const NEBULA_SCROLL_FACTOR = 0.22;

export const FAMOUS_PLANETS: Record<string, FamousPlanet> = {
  "vitalik.eth": {
    label: "Vitalik's World",
    type: "gas",
    colorOverride: { a: "#60a5fa", b: "#1d4ed8", ring: "#93c5fd", glow: "rgba(29,78,216,0.6)", rgb: "29,78,216" },
    sizeMultiplier: 4.5,
    description: "Giant Blue Superplanet · The Ethereum Origin",
  },
  "uniswap.eth": {
    label: "Uniswap Treasury",
    type: "toxic",
    colorOverride: { a: "#f472b6", b: "#ec4899", ring: "#f9a8d4", glow: "rgba(236,72,153,0.55)", rgb: "236,72,153" },
    sizeMultiplier: 3.2,
    description: "DeFi Megacity · Liquidity Capital of the Universe",
  },
  "opensea.eth": {
    label: "OpenSea World",
    type: "ocean",
    colorOverride: { a: "#38bdf8", b: "#0ea5e9", ring: "#7dd3fc", glow: "rgba(14,165,233,0.55)", rgb: "14,165,233" },
    sizeMultiplier: 2.8,
    description: "NFT Galaxy · Where Digital Art Lives",
  },
  "binance.eth": {
    label: "Binance Station",
    type: "desert",
    colorOverride: { a: "#fde047", b: "#ca8a04", ring: "#fbbf24", glow: "rgba(202,138,4,0.55)", rgb: "202,138,4" },
    sizeMultiplier: 3.0,
    description: "Industrial Planet · The Exchange Behemoth",
  },
};

export const COLORS: Record<PlanetType, PlanetPalette> = {
  ocean: { a: "#67e8f9", b: "#0ea5e9", ring: "#7dd3fc", glow: "rgba(14,165,233,0.5)", rgb: "14,165,233" },
  lava: { a: "#ff8fab", b: "#f97316", ring: "#fdba74", glow: "rgba(249,115,22,0.48)", rgb: "249,115,22" },
  gas: { a: "#e9d5ff", b: "#8b5cf6", ring: "#c4b5fd", glow: "rgba(139,92,246,0.5)", rgb: "139,92,246" },
  ice: { a: "#dbeafe", b: "#60a5fa", ring: "#93c5fd", glow: "rgba(96,165,250,0.48)", rgb: "96,165,250" },
  forest: { a: "#86efac", b: "#14b8a6", ring: "#6ee7b7", glow: "rgba(20,184,166,0.48)", rgb: "20,184,166" },
  toxic: { a: "#d9f99d", b: "#65a30d", ring: "#a3e635", glow: "rgba(101,163,13,0.48)", rgb: "101,163,13" },
  desert: { a: "#fde68a", b: "#d97706", ring: "#fbbf24", glow: "rgba(217,119,6,0.48)", rgb: "217,119,6" },
};

export const P_TYPES = Object.keys(COLORS) as PlanetType[];

export const TILE_PAL = [
  { border: "rgba(14,165,233,0.06)", label: "rgba(14,165,233,0.18)" },
  { border: "rgba(139,92,246,0.06)", label: "rgba(139,92,246,0.18)" },
  { border: "rgba(20,184,166,0.06)", label: "rgba(20,184,166,0.18)" },
  { border: "rgba(217,119,6,0.06)", label: "rgba(217,119,6,0.18)" },
  { border: "rgba(249,115,22,0.06)", label: "rgba(249,115,22,0.18)" },
  { border: "rgba(59,130,246,0.06)", label: "rgba(59,130,246,0.18)" },
  { border: "rgba(101,163,13,0.06)", label: "rgba(101,163,13,0.18)" },
];

export const STARS = Array.from({ length: STAR_COUNT }, (_, i) => ({
  id: i,
  rx: h01(i * 17 + 11),
  ry: h01(i * 31 + 7),
  r: h01(i * 47 + 3) * 2.8 + 0.3,
  o: h01(i * 53 + 19) * 0.72 + 0.15,
  tw: h01(i * 61 + 23),
  par: [0.14, 0.08, 0.04][i % 3],
}));

export const NEBULAE = Array.from({ length: NEBULA_COUNT }, (_, i) => ({
  id: i,
  rx: h01(i * 113 + 57),
  ry: h01(i * 97 + 33),
  size: 260 + h01(i * 71) * 480,
  hue: Math.floor(h01(i * 43) * 360),
  op: 0.012 + h01(i * 83) * 0.022,
}));
