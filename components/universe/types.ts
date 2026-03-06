import type { EFPAccount } from "@/lib/efp";

export type PlanetType = "ocean" | "lava" | "gas" | "ice" | "forest" | "toxic" | "desert";
export type WarpPhase = "idle" | "launching" | "warping" | "arriving";

export interface PlanetExtras {
  nftCount: number;
  moonCount: number;
  tokenDiversity: number;
  txCount: number;
  defiActivity: number;
  walletAge: number;
  famousKey?: string;
}

export interface Planet {
  account: EFPAccount;
  wx: number;
  wy: number;
  r: number;
  ethBalance: number;
  type: PlanetType;
  hasRing: boolean;
  rotSpeed: number;
  rotOffset: number;
  tilt: number;
  extras: PlanetExtras;
}

export interface Tile {
  tx: number;
  ty: number;
  key: string;
  originX: number;
  originY: number;
  planets: Planet[];
  page: number;
  loading: boolean;
  loaded: boolean;
  palIdx: number;
}

export interface RocketState {
  x: number;
  y: number;
  vx: number;
  vy: number;
  angle: number;
  boosting: boolean;
}

export interface PlanetPalette {
  a: string;
  b: string;
  ring: string;
  glow: string;
  rgb: string;
}

export interface FamousPlanet {
  label: string;
  type: PlanetType;
  colorOverride: PlanetPalette;
  sizeMultiplier: number;
  description: string;
}
