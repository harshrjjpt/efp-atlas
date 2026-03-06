"use client";

import { useEffect, useState } from "react";
import { resolveClientSiteOrigin } from "@/lib/site-url";
import { COLORS, FAMOUS_PLANETS, TILE_PAL, WORLD_SIZE } from "./constants";
import { clamp } from "./math";
import type { Planet, Tile, WarpPhase } from "./types";

export function HUD({
  loading,
  total,
  lod,
  tileCount,
}: {
  zoom: number;
  loading: number;
  total: number;
  lod: string;
  tileCount: number;
}) {
  const lodColor = lod === "GALAXY" ? "#fbbf24" : lod === "SYSTEM" ? "#86efac" : "#67e8f9";

  return (
    <div style={{ position: "absolute", bottom: 24, left: 24, zIndex: 30, padding: "12px 16px", borderRadius: 14, background: "rgba(3,7,18,0.9)", border: "1px solid rgba(0,212,255,0.14)", backdropFilter: "blur(14px)", fontFamily: "monospace", fontSize: 11, color: "rgba(0,212,255,0.55)", minWidth: 240 }}>
      <div style={{ color: "rgba(0,212,255,0.9)", fontSize: 10, fontWeight: 700, letterSpacing: "0.09em", marginBottom: 6 }}>◈ EFP ATLAS</div>
      <div>⟐ Drag or WASD / arrows to roam</div>
      <div>⊕ Scroll to zoom · zooms toward cursor</div>
      <div>◉ Click a planet to inspect it</div>
      <div style={{ marginTop: 8, paddingTop: 8, borderTop: "1px solid rgba(0,212,255,0.09)", color: "rgba(255,255,255,0.3)", lineHeight: 1.75 }}>
        <div>
          Accounts: <b style={{ color: "rgba(0,212,255,0.8)" }}>{total.toLocaleString()}</b>{"  "}
          Sectors: <b style={{ color: "rgba(0,212,255,0.8)" }}>{tileCount}</b>
        </div>
        <div>
          View: <b style={{ color: lodColor }}>{lod}</b>
        </div>
        {loading > 0 && (
          <div style={{ color: "#fbbf24" }} className="animate-pulse">
            ⟳ Loading new sector…
          </div>
        )}
      </div>
      <div style={{ marginTop: 8, paddingTop: 8, borderTop: "1px solid rgba(0,212,255,0.09)", fontSize: 9, color: "rgba(255,255,255,0.25)", lineHeight: 1.7 }}>
        <div>🌙 Moons = NFT count  💍 Rings = DeFi</div>
        <div>✨ City lights = Tx vol  🌫 Haze = Wallet age</div>
      </div>
    </div>
  );
}

export function Minimap({
  tiles,
  camera,
  zoom,
  dims,
}: {
  tiles: Tile[];
  camera: { x: number; y: number };
  zoom: number;
  dims: { w: number; h: number };
}) {
  const SIZE = 180;
  const PAD = 10;
  if (!tiles.length) return null;

  const txs = tiles.map((t) => t.tx);
  const tys = tiles.map((t) => t.ty);
  const minTX = Math.min(...txs);
  const maxTX = Math.max(...txs);
  const minTY = Math.min(...tys);
  const maxTY = Math.max(...tys);
  const spanT = Math.max(maxTX - minTX + 1, maxTY - minTY + 1, 1);
  const scale = (SIZE - PAD * 2) / (spanT * WORLD_SIZE);
  const toM = (wx: number, wy: number) => ({
    x: PAD + (wx - minTX * WORLD_SIZE) * scale,
    y: PAD + (wy - minTY * WORLD_SIZE) * scale,
  });

  const cam = toM(camera.x, camera.y);
  const vpW = Math.max((dims.w / zoom) * scale, 2);
  const vpH = Math.max((dims.h / zoom) * scale, 2);
  const ts = WORLD_SIZE * scale;

  return (
    <div style={{ position: "absolute", bottom: 24, right: 24, zIndex: 30, width: SIZE, height: SIZE, borderRadius: 14, overflow: "hidden", background: "rgba(3,7,18,0.92)", border: "1px solid rgba(0,212,255,0.18)", backdropFilter: "blur(14px)" }}>
      <svg width={SIZE} height={SIZE}>
        {tiles.map((t) => {
          const o = toM(t.originX, t.originY);
          const pal = TILE_PAL[t.palIdx % TILE_PAL.length];
          return (
            <g key={t.key}>
              <rect x={o.x} y={o.y} width={ts} height={ts} fill={t.loaded ? "rgba(0,212,255,0.06)" : "rgba(255,255,255,0.02)"} stroke={pal.border.replace("0.06", "0.35")} strokeWidth={0.5} />
              {t.planets.map((p) => {
                const m = toM(p.wx, p.wy);
                return <circle key={p.account.address} cx={m.x} cy={m.y} r={p.extras.famousKey ? 2.5 : 1.2} fill={COLORS[p.type].a} opacity={p.extras.famousKey ? 1 : 0.7} />;
              })}
            </g>
          );
        })}
        <rect x={cam.x - vpW / 2} y={cam.y - vpH / 2} width={vpW} height={vpH} fill="rgba(0,212,255,0.07)" stroke="rgba(0,212,255,0.7)" strokeWidth={1} />
        <circle cx={cam.x} cy={cam.y} r={2.5} fill="#00d4ff" />
      </svg>
      <div style={{ position: "absolute", bottom: 3, left: 0, right: 0, textAlign: "center", fontFamily: "monospace", fontSize: 8.5, color: "rgba(0,212,255,0.45)" }}>SECTOR MAP</div>
    </div>
  );
}

export function LodBanner({ lod }: { lod: "GALAXY" | "SYSTEM" | "PLANET" }) {
  const messages = {
    GALAXY: "🔭  Zoom in to see individual planets",
    SYSTEM: "🪐  Individual planets visible · Zoom in for detail",
    PLANET: "✨  Planet view — click any world to inspect",
  };

  return (
    <div style={{ position: "absolute", top: 72, left: "50%", transform: "translateX(-50%)", fontFamily: "monospace", fontSize: 12, color: "rgba(255,255,255,0.45)", background: "rgba(0,0,0,0.45)", backdropFilter: "blur(10px)", padding: "7px 22px", borderRadius: 24, border: "1px solid rgba(255,255,255,0.08)", zIndex: 20, pointerEvents: "none", whiteSpace: "nowrap" }}>
      {messages[lod]}
    </div>
  );
}

export function WarpOverlay({ phase, targetName }: { phase: WarpPhase; targetName: string }) {
  if (phase === "idle") return null;

  const messages: Record<WarpPhase, string> = {
    idle: "",
    launching: "🚀  Launching...",
    warping: `⚡  Warping to ${targetName}...`,
    arriving: `🌍  Arriving at ${targetName}`,
  };

  return (
    <div style={{ position: "absolute", inset: 0, zIndex: 100, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: phase === "warping" ? "rgba(0,0,0,0.85)" : "rgba(0,0,10,0.5)", backdropFilter: phase === "warping" ? "blur(4px)" : "none", pointerEvents: "none", transition: "all 0.4s ease" }}>
      {phase === "warping" && (
        <svg width="100%" height="100%" style={{ position: "absolute", inset: 0, overflow: "visible" }}>
          {Array.from({ length: 80 }, (_, i) => {
            const angle = (i / 80) * Math.PI * 2;
            const len = 250 + (i % 7) * 60;
            return (
              <line
                key={i}
                x1="50%"
                y1="50%"
                x2={`calc(50% + ${Math.cos(angle) * len}px)`}
                y2={`calc(50% + ${Math.sin(angle) * len}px)`}
                stroke={`hsla(${180 + i * 2},80%,70%,${0.2 + (i % 5) * 0.07})`}
                strokeWidth={0.5 + (i % 4) * 0.4}
              />
            );
          })}
        </svg>
      )}

      <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 28, fontWeight: 700, color: "#fff", textShadow: "0 0 40px rgba(0,212,255,0.8)", zIndex: 1, letterSpacing: "0.05em" }}>
        {messages[phase]}
      </div>
      {phase === "warping" && (
        <div style={{ marginTop: 16, fontFamily: "monospace", fontSize: 12, color: "rgba(0,212,255,0.7)", letterSpacing: "0.2em", zIndex: 1 }}>
          HYPERDRIVE ENGAGED
        </div>
      )}
    </div>
  );
}

export function ShareModal({ planet, onClose }: { planet: Planet; onClose: () => void }) {
  const [shareHint, setShareHint] = useState<string | null>(null);
  const account = planet.account;
  const name = account.name ?? `${account.address.slice(0, 6)}…${account.address.slice(-4)}`;
  const c = planet.extras.famousKey ? FAMOUS_PLANETS[planet.extras.famousKey].colorOverride : COLORS[planet.type];
  const famous = planet.extras.famousKey ? FAMOUS_PLANETS[planet.extras.famousKey] : null;
  const rankLabel = account.rank <= 10 ? "👑 Legend" : account.rank <= 100 ? "🐋 Whale" : account.rank <= 1000 ? "🦈 Shark" : "🐟 Citizen";
  const planetPath = `/planet/${account.address.toLowerCase()}`;
  const planetUrl = `${resolveClientSiteOrigin()}${planetPath}`;

  const onTwitterShare = () => {
    const liveUrl = `${resolveClientSiteOrigin()}${planetPath}`;
    const tweetRawText = `My EFP Planet 🌍

${name}
Rank: #${account.rank} ${rankLabel}
Followers: ${account.followers.toLocaleString()}
Moons: ${planet.extras.moonCount} 🌙
DeFi Rings: ${planet.extras.defiActivity} 💍

Explore EFP Atlas 🚀
${liveUrl}`;
    const tweetText = encodeURIComponent(tweetRawText);
    setShareHint("Tweet includes a planet URL with a dynamic preview image (Twitter card).");
    window.open(`https://twitter.com/intent/tweet?text=${tweetText}`, "_blank", "noopener,noreferrer");
  };

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.8)", backdropFilter: "blur(8px)" }} onClick={onClose}>
      <div style={{ background: "linear-gradient(135deg, #0a1628 0%, #0d1f3c 100%)", border: `1px solid ${c.a}44`, borderRadius: 20, minWidth: 340, maxWidth: 380, boxShadow: `0 0 80px ${c.glow}, 0 0 40px rgba(0,0,0,0.8)`, overflow: "hidden", position: "relative" }} onClick={(e) => e.stopPropagation()}>
        <div style={{ background: `linear-gradient(135deg, ${c.b}33, ${c.a}22)`, padding: "24px 24px 20px", borderBottom: `1px solid ${c.a}22` }}>
          <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: c.a, letterSpacing: "0.2em", marginBottom: 8 }}>◈ EFP ATLAS · PLANET CARD</div>
          <div style={{ fontSize: 22, fontWeight: 700, color: "#fff", fontFamily: "monospace" }}>{name}</div>
          {famous && <div style={{ fontSize: 12, color: c.a, marginTop: 4, fontFamily: "monospace" }}>★ {famous.description}</div>}
          <div style={{ display: "inline-block", marginTop: 8, background: `${c.b}33`, border: `1px solid ${c.a}44`, borderRadius: 20, padding: "3px 12px", fontFamily: "monospace", fontSize: 12, color: c.a }}>
            {rankLabel} · Rank #{account.rank.toLocaleString()}
          </div>
        </div>

        <div style={{ padding: "16px 24px", display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
          {[
            { label: "Followers", value: account.followers.toLocaleString(), icon: "👥" },
            { label: "Following", value: account.following.toLocaleString(), icon: "🔗" },
            { label: "EFP Score", value: Math.round(account.score).toLocaleString(), icon: "⭐" },
          ].map((s) => (
            <div key={s.label} style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, padding: "10px 8px", textAlign: "center" }}>
              <div style={{ fontSize: 18 }}>{s.icon}</div>
              <div style={{ fontFamily: "monospace", fontSize: 13, fontWeight: 700, color: "#fff", marginTop: 2 }}>{s.value}</div>
              <div style={{ fontFamily: "monospace", fontSize: 9, color: "rgba(255,255,255,0.4)", marginTop: 2 }}>{s.label}</div>
            </div>
          ))}
        </div>

        <div style={{ padding: "0 24px 16px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          {[
            { icon: "🌙", label: "Moons", val: planet.extras.moonCount, max: 5 },
            { icon: "💍", label: "DeFi Rings", val: planet.extras.defiActivity, max: 3 },
            { icon: "✨", label: "City Lights", val: planet.extras.txCount, max: 3 },
            { icon: "🌫", label: "Atmosphere", val: `${Math.round(planet.extras.walletAge * 100)}%`, max: null },
          ].map((f) => (
            <div key={f.label} style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 10, padding: "8px 12px", display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 16 }}>{f.icon}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: "monospace", fontSize: 9, color: "rgba(255,255,255,0.4)" }}>{f.label}</div>
                {f.max !== null ? (
                  <div style={{ display: "flex", gap: 3, marginTop: 3 }}>
                    {Array.from({ length: f.max }, (_, i) => (
                      <div key={i} style={{ width: 10, height: 4, borderRadius: 2, background: i < (f.val as number) ? c.a : "rgba(255,255,255,0.1)" }} />
                    ))}
                  </div>
                ) : (
                  <div style={{ fontFamily: "monospace", fontSize: 12, color: c.a, fontWeight: 700 }}>{f.val}</div>
                )}
              </div>
            </div>
          ))}
        </div>

        <div style={{ padding: "0 24px 24px", display: "flex", gap: 10 }}>
          <button onClick={onTwitterShare} style={{ flex: 1, textAlign: "center", padding: "11px", background: "rgba(29,161,242,0.15)", border: "1px solid rgba(29,161,242,0.4)", borderRadius: 12, color: "#60a5fa", fontFamily: "monospace", fontSize: 12, fontWeight: 700, textDecoration: "none", cursor: "pointer" }}>
            𝕏 Twitter
          </button>
          <a href={`https://warpcast.com/~/compose?text=${encodeURIComponent(`My EFP Planet 🌍\n\n${name}\nRank: #${account.rank} ${rankLabel}\nFollowers: ${account.followers.toLocaleString()}\nMoons: ${planet.extras.moonCount} 🌙\nDeFi Rings: ${planet.extras.defiActivity} 💍\n\nExplore EFP Atlas 🚀\n${planetUrl}`)}`} target="_blank" rel="noreferrer" style={{ flex: 1, textAlign: "center", padding: "11px", background: "rgba(139,92,246,0.15)", border: "1px solid rgba(139,92,246,0.4)", borderRadius: 12, color: "#c4b5fd", fontFamily: "monospace", fontSize: 12, fontWeight: 700, textDecoration: "none" }}>
            🟣 Farcaster
          </a>
          <button onClick={() => navigator.clipboard?.writeText(`My EFP Planet: ${name} | Rank #${account.rank} | Followers: ${account.followers} | Moons: ${planet.extras.moonCount} | ${planetUrl}`)} style={{ padding: "11px 14px", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 12, color: "rgba(255,255,255,0.6)", fontFamily: "monospace", fontSize: 11, cursor: "pointer" }}>
            📋
          </button>
        </div>

        {shareHint && (
          <div style={{ margin: "0 24px 16px", padding: "8px 10px", borderRadius: 10, border: "1px solid rgba(96,165,250,0.35)", background: "rgba(59,130,246,0.09)", color: "rgba(191,219,254,0.95)", fontFamily: "monospace", fontSize: 10 }}>
            {shareHint}
          </div>
        )}

        <button onClick={onClose} style={{ position: "absolute", top: 16, right: 16, background: "rgba(255,255,255,0.08)", border: "none", borderRadius: "50%", width: 28, height: 28, color: "rgba(255,255,255,0.6)", cursor: "pointer", fontSize: 14 }}>
          ✕
        </button>
      </div>
    </div>
  );
}

export function WarpSearchUI({
  onWarpTo,
  allPlanets,
}: {
  onWarpTo: (planet: Planet) => void;
  allPlanets: Planet[];
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Planet[]>([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }

    const q = query.toLowerCase();
    setResults(
      allPlanets
        .filter((p) => (p.account.name ?? "").toLowerCase().includes(q) || p.account.address.toLowerCase().includes(q))
        .slice(0, 5),
    );
  }, [query, allPlanets]);

  return (
    <div style={{ position: "absolute", top: 116, left: "50%", transform: "translateX(-50%)", zIndex: 50, width: 320 }} data-ui="true">
      <div style={{ display: "flex", alignItems: "center", background: "rgba(3,7,18,0.92)", border: "1px solid rgba(0,212,255,0.3)", borderRadius: open && results.length > 0 ? "12px 12px 0 0" : 12, backdropFilter: "blur(16px)", overflow: "hidden" }}>
        <span style={{ padding: "0 12px", fontSize: 16, opacity: 0.6 }}>🚀</span>
        <input value={query} onChange={(e) => setQuery(e.target.value)} onFocus={() => setOpen(true)} onBlur={() => setTimeout(() => setOpen(false), 150)} placeholder="Warp to wallet or .eth name..." style={{ flex: 1, background: "none", border: "none", outline: "none", fontFamily: "'IBM Plex Mono', monospace", fontSize: 12, color: "#fff", padding: "11px 0" }} />
        {query && (
          <button onClick={() => { setQuery(""); setResults([]); }} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.4)", cursor: "pointer", padding: "0 12px", fontSize: 14 }}>
            ✕
          </button>
        )}
      </div>

      {open && results.length > 0 && (
        <div style={{ background: "rgba(3,7,18,0.98)", border: "1px solid rgba(0,212,255,0.3)", borderTop: "none", borderRadius: "0 0 12px 12px", overflow: "hidden" }}>
          {results.map((planet) => {
            const c = planet.extras.famousKey ? FAMOUS_PLANETS[planet.extras.famousKey].colorOverride : COLORS[planet.type];
            return (
              <button
                key={planet.account.address}
                onMouseDown={() => {
                  onWarpTo(planet);
                  setQuery("");
                  setResults([]);
                  setOpen(false);
                }}
                style={{ width: "100%", background: "none", border: "none", borderTop: "1px solid rgba(255,255,255,0.05)", padding: "10px 16px", cursor: "pointer", textAlign: "left", display: "flex", alignItems: "center", gap: 10 }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(0,212,255,0.08)")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "none")}
              >
                <div style={{ width: 10, height: 10, borderRadius: "50%", background: c.a, boxShadow: `0 0 8px ${c.a}` }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontFamily: "monospace", fontSize: 12, color: "#fff" }}>
                    {planet.account.name ?? `${planet.account.address.slice(0, 10)}…`}
                  </div>
                  <div style={{ fontFamily: "monospace", fontSize: 10, color: "rgba(255,255,255,0.35)", marginTop: 1 }}>
                    #{planet.account.rank} · {planet.extras.moonCount}🌙 {planet.extras.defiActivity}💍
                  </div>
                </div>
                <span style={{ fontSize: 10, color: "rgba(0,212,255,0.6)", fontFamily: "monospace" }}>WARP →</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function RocketEl({
  x,
  y,
  angle,
  boosting,
  size,
  time,
}: {
  x: number;
  y: number;
  angle: number;
  boosting: boolean;
  size: number;
  time: number;
}) {
  const len = size * 2.5;
  const w = size * 1.25;
  const flick = 0.85 + 0.15 * Math.sin(time * 30);
  const flame = (boosting ? size * 1.95 : size * 1.05) * flick;
  const heat = 0.82 + 0.18 * Math.sin(time * 24 + 0.8);
  const uid = `rk-${Math.round(x)}-${Math.round(y)}`;

  return (
    <g transform={`translate(${x.toFixed(1)},${y.toFixed(1)}) rotate(${(angle * 57.2958).toFixed(2)})`}>
      <defs>
        <linearGradient id={`${uid}-outer`} x1="0%" y1="50%" x2="100%" y2="50%">
          <stop offset="0%" stopColor={boosting ? "rgba(251,113,133,0)" : "rgba(56,189,248,0)"} />
          <stop offset="45%" stopColor={boosting ? "rgba(251,146,60,0.75)" : "rgba(125,211,252,0.58)"} />
          <stop offset="100%" stopColor={boosting ? "rgba(250,204,21,0.9)" : "rgba(226,232,240,0.8)"} />
        </linearGradient>
        <linearGradient id={`${uid}-core`} x1="0%" y1="50%" x2="100%" y2="50%">
          <stop offset="0%" stopColor="rgba(255,255,255,0)" />
          <stop offset="56%" stopColor="rgba(255,244,214,0.9)" />
          <stop offset="100%" stopColor="rgba(255,255,255,0.98)" />
        </linearGradient>
      </defs>
      <ellipse cx={-len * 0.55} cy={0} rx={flame * (boosting ? 1.05 : 0.9)} ry={size * 0.5 * heat} fill={`url(#${uid}-outer)`} />
      <ellipse cx={-len * 0.68} cy={0} rx={flame * 0.64} ry={size * 0.28 * heat} fill={`url(#${uid}-core)`} />
      <ellipse cx={-len * 0.38} cy={0} rx={size * 0.55} ry={size * 0.2} fill={boosting ? "rgba(251,146,60,0.45)" : "rgba(56,189,248,0.28)"} />
      <polygon points={`${len * 0.55},0 ${-len * 0.38},${w * 0.72} ${-len * 0.38},${-w * 0.72}`} fill="rgba(226,232,240,0.98)" stroke="rgba(15,23,42,0.7)" strokeWidth={Math.max(size * 0.12, 1)} />
      <circle cx={len * 0.2} cy={0} r={size * 0.28} fill="rgba(56,189,248,0.92)" stroke="rgba(255,255,255,0.65)" strokeWidth={Math.max(size * 0.08, 1)} />
      <polygon points={`${-len * 0.2},0 ${-len * 0.56},${w * 0.46} ${-len * 0.56},${-w * 0.46}`} fill="rgba(148,163,184,0.95)" />
    </g>
  );
}

export function TileCenterLabels({
  tiles,
  camera,
  zoom,
  dims,
}: {
  tiles: Tile[];
  camera: { x: number; y: number };
  zoom: number;
  dims: { w: number; h: number };
}) {
  return (
    <>
      {tiles.map((tile) => {
        const cx = {
          sx: (tile.originX + WORLD_SIZE / 2 - camera.x) * zoom + dims.w / 2,
          sy: (tile.originY + WORLD_SIZE / 2 - camera.y) * zoom + dims.h / 2,
        };
        const pal = TILE_PAL[tile.palIdx % TILE_PAL.length];
        if (!tile.loaded && !tile.loading) return null;
        return (
          <g key={`lbl-${tile.key}`}>
            <text x={cx.sx} y={cx.sy} textAnchor="middle" dominantBaseline="middle" fontSize={clamp(WORLD_SIZE * zoom * 0.06, 10, 28)} fontFamily="'IBM Plex Mono',monospace" fill={pal.label} style={{ pointerEvents: "none" }}>
              {tile.loading ? "loading…" : `${tile.planets.length} planets`}
            </text>
          </g>
        );
      })}
    </>
  );
}
