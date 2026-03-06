import { COLORS, FAMOUS_PLANETS, PLANET_SCREEN_SCALE, TILE_PAL, WORLD_SIZE } from "./constants";
import { clamp, fmod, h01, hash32 } from "./math";
import { isBlackHoleAccount } from "./planet-builder";
import type { Planet, Tile } from "./types";

function MoonEl({
  cx,
  cy,
  r,
  idx,
  time,
  tilt,
  parentR,
}: {
  cx: number;
  cy: number;
  r: number;
  idx: number;
  time: number;
  tilt: number;
  parentR: number;
}) {
  const orbitR = parentR * (1.6 + idx * 0.45);
  const speed = 0.3 + idx * 0.15;
  const phase = (idx / 5) * Math.PI * 2;
  const mx = cx + Math.cos(time * speed + phase) * orbitR;
  const my = cy + Math.sin(time * speed + phase) * orbitR * Math.abs(Math.cos(tilt));
  const moonR = Math.max(r * (0.1 - idx * 0.015), r * 0.05);

  return (
    <g>
      <ellipse cx={cx} cy={cy} rx={orbitR} ry={orbitR * Math.abs(Math.cos(tilt))} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={0.5} />
      <circle cx={mx} cy={my} r={moonR} fill="rgba(180,190,200,0.9)" stroke="rgba(255,255,255,0.2)" strokeWidth={moonR * 0.1} />
      <circle cx={mx + moonR * 0.15} cy={my + moonR * 0.1} r={moonR * 0.8} fill="rgba(0,0,0,0.4)" />
    </g>
  );
}

export function PlanetEl({
  planet,
  sx,
  sy,
  selected,
  dimmed,
  onClick,
  time,
  zr,
  full,
}: {
  planet: Planet;
  sx: number;
  sy: number;
  selected: boolean;
  dimmed: boolean;
  onClick: () => void;
  time: number;
  zr: number;
  full: boolean;
}) {
  const famous = planet.extras.famousKey ? FAMOUS_PLANETS[planet.extras.famousKey] : null;
  const c = famous?.colorOverride ?? COLORS[planet.type];
  const isBlackHole = isBlackHoleAccount(planet.account) && !famous;
  const r = Math.max(zr * PLANET_SCREEN_SCALE, 0.8);
  const rot = fmod(planet.rotOffset + time * planet.rotSpeed, Math.PI * 2);
  const bs = fmod((rot / (Math.PI * 2)) * 100, 100);
  const ringRy = r * (0.27 + 0.17 * Math.abs(Math.cos(rot * 0.5)));
  const tiltDeg = planet.tilt * 57.3;
  const uid = planet.account.address.slice(2, 12);
  const nightCx = clamp(66 + Math.cos(rot + 0.45) * 18, 18, 86);
  const nightCy = clamp(52 + Math.sin(rot * 0.6 + 0.8) * 12, 24, 82);
  const specX = -r * 0.23 + Math.cos(rot * 0.85) * r * 0.08;
  const specY = -r * 0.3 + Math.sin(rot * 0.72) * r * 0.05;
  const driftA = Math.sin(rot) * r * 0.22;
  const driftB = Math.sin(rot + 2.1) * r * 0.18;
  const driftC = Math.sin(rot * 1.3 + 1.2) * r * 0.15;
  const bhPulse = 0.9 + 0.1 * Math.sin(time * 2.2 + rot * 1.7);
  const showLbl = zr > 10;
  const showRnk = zr > 16;
  const defiRings = planet.extras.defiActivity;
  const ringColors = ["rgba(252,211,77,0.35)", "rgba(167,139,250,0.3)", "rgba(52,211,153,0.3)"];
  const hueShift = planet.extras.tokenDiversity * 30;
  const atmosphereThickness = r * (0.08 + planet.extras.walletAge * 0.22);
  const atmosphereOpacity = 0.15 + planet.extras.walletAge * 0.25;
  const labelY = famous ? -(r * 2.2) : isBlackHole ? -(r * 3.8) : -(r * 1.25);

  const cityLights = [];
  if (full && planet.extras.txCount > 0) {
    for (let i = 0; i < Math.min(planet.extras.txCount * 4, 12); i++) {
      const lx = (h01(hash32(uid + i) + 13) - 0.5) * r * 1.6;
      const ly = (h01(hash32(uid + i) + 77) - 0.5) * r * 1.2;
      const lr = r * (0.015 + h01(hash32(uid + i) + 42) * 0.025);
      const hue = 30 + h01(hash32(uid + i) + 99) * 60;
      cityLights.push(
        <circle key={i} cx={lx + Math.cos(rot) * r * 0.08} cy={ly} r={lr} fill={`hsla(${hue},90%,80%,0.7)`} />,
      );
    }
  }

  return (
    <g
      transform={`translate(${sx.toFixed(1)},${sy.toFixed(1)})`}
      style={{ cursor: "pointer", opacity: dimmed ? 0.07 : 1, filter: hueShift > 5 ? `hue-rotate(${hueShift}deg)` : undefined }}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
    >
      {full && (
        <defs>
          <radialGradient id={`sg${uid}`} cx="30%" cy="24%" r="78%">
            <stop offset="0%" stopColor="#fff" stopOpacity="0.78" />
            <stop offset="10%" stopColor={c.a} stopOpacity="0.98" />
            <stop offset="48%" stopColor={c.a} stopOpacity="0.88" />
            <stop offset="100%" stopColor={c.b} stopOpacity="0.96" />
          </radialGradient>
          <linearGradient id={`sb${uid}`} x1="0%" y1="0%" x2="100%" y2="0%" gradientTransform={`rotate(${tiltDeg + 90 + rot * 57.3},0.5,0.5)`}>
            <stop offset={`${bs}%`} stopColor={c.a} stopOpacity="0.16" />
            <stop offset={`${fmod(bs + 16, 100)}%`} stopColor={c.b} stopOpacity="0.38" />
            <stop offset={`${fmod(bs + 34, 100)}%`} stopColor={c.a} stopOpacity="0.14" />
            <stop offset={`${fmod(bs + 57, 100)}%`} stopColor={c.b} stopOpacity="0.34" />
            <stop offset={`${fmod(bs + 77, 100)}%`} stopColor={c.a} stopOpacity="0.11" />
            <stop offset="100%" stopColor={c.b} stopOpacity="0.22" />
          </linearGradient>
          <radialGradient id={`sn${uid}`} cx={`${nightCx}%`} cy={`${nightCy}%`} r="82%">
            <stop offset="0%" stopColor="#02050b" stopOpacity="0" />
            <stop offset="56%" stopColor="#02050b" stopOpacity="0.12" />
            <stop offset="100%" stopColor="#02050b" stopOpacity="0.74" />
          </radialGradient>
          <radialGradient id={`sl${uid}`} cx="58%" cy="58%" r="64%">
            <stop offset="62%" stopColor="#000" stopOpacity="0" />
            <stop offset="100%" stopColor="#000" stopOpacity="0.34" />
          </radialGradient>
          <radialGradient id={`sa${uid}`} cx="42%" cy="36%" r="74%">
            <stop offset="74%" stopColor={c.a} stopOpacity="0" />
            <stop offset="92%" stopColor={c.a} stopOpacity="0.42" />
            <stop offset="100%" stopColor="#fff" stopOpacity="0.18" />
          </radialGradient>
          <clipPath id={`cp${uid}`}>
            <circle r={r} />
          </clipPath>
        </defs>
      )}

      {isBlackHole ? (
        <>
          <defs>
            <radialGradient id={`bhGlow${uid}`} cx="50%" cy="50%" r="60%">
              <stop offset="0%" stopColor="rgba(99,102,241,0.28)" />
              <stop offset="60%" stopColor="rgba(236,72,153,0.18)" />
              <stop offset="100%" stopColor="rgba(14,165,233,0)" />
            </radialGradient>
            <linearGradient id={`bhDisk${uid}`} x1="0%" y1="50%" x2="100%" y2="50%" gradientTransform={`rotate(${rot * 57.3 + 18},0.5,0.5)`}>
              <stop offset="0%" stopColor="rgba(56,189,248,0.04)" />
              <stop offset="22%" stopColor="rgba(167,139,250,0.58)" />
              <stop offset="48%" stopColor="rgba(251,146,60,0.92)" />
              <stop offset="74%" stopColor="rgba(250,204,21,0.7)" />
              <stop offset="100%" stopColor="rgba(56,189,248,0.06)" />
            </linearGradient>
          </defs>
          <circle r={r * 4.4 * bhPulse} fill={`url(#bhGlow${uid})`} opacity={selected ? 0.95 : 0.75} />
          <ellipse rx={r * 3.5} ry={r * 0.95} fill={`url(#bhDisk${uid})`} transform={`rotate(${tiltDeg + 8})`} opacity={0.85} />
          <ellipse rx={r * 3.9} ry={r * 1.08} fill="none" stroke="rgba(251,191,36,0.38)" strokeWidth={r * 0.08} transform={`rotate(${tiltDeg + 8})`} />
          <circle r={r * 1.45} fill="#000" stroke="rgba(15,23,42,0.95)" strokeWidth={r * 0.22} />
          <circle r={r * 1.08} fill="#020308" />
          <circle r={r * 1.2} fill="none" stroke="rgba(148,163,184,0.35)" strokeWidth={r * 0.04} />
        </>
      ) : (
        <>
          {full && planet.extras.walletAge > 0.3 && (
            <circle r={r + atmosphereThickness} fill="none" stroke={c.a} strokeWidth={atmosphereThickness} strokeOpacity={atmosphereOpacity} />
          )}
          <circle r={r * 1.8} fill={c.glow} opacity={selected ? 0.72 : 0.3} />
          {selected && <circle r={r * 2.5} fill="none" stroke={c.a} strokeWidth={r * 0.02} opacity={0.5} />}
          {famous && <circle r={r * 2.8} fill={c.glow} opacity={0.2} />}

          {full && (planet.hasRing || defiRings > 0) && (
            <g transform={`rotate(${tiltDeg})`}>
              {planet.hasRing && (
                <>
                  <ellipse rx={r * 1.95} ry={ringRy} fill="none" stroke="rgba(255,255,255,0.14)" strokeWidth={r * 0.015} opacity={0.6} />
                  <ellipse rx={r * 1.9} ry={ringRy} fill="none" stroke={c.ring} strokeWidth={r * 0.06} opacity={0.38} />
                </>
              )}
              {Array.from({ length: Math.min(defiRings, 3) }, (_, i) => (
                <ellipse key={i} rx={r * (2.1 + i * 0.18)} ry={ringRy * (0.7 + i * 0.15)} fill="none" stroke={ringColors[i]} strokeWidth={r * 0.04} opacity={0.5 - i * 0.1} />
              ))}
            </g>
          )}

          {full ? (
            <>
              <circle r={r} fill={`url(#sg${uid})`} stroke={c.ring} strokeOpacity={0.4} strokeWidth={r * 0.015} />
              <g clipPath={`url(#cp${uid})`}>
                <circle r={r} fill={`url(#sb${uid})`} opacity={0.66} />
                <ellipse cx={driftA} cy={-r * 0.32} rx={r * 0.72} ry={r * 0.13} fill="rgba(255,255,255,0.15)" />
                <ellipse cx={driftB} cy={-r * 0.05} rx={r * 0.84} ry={r * 0.15} fill={`rgba(${c.rgb},0.17)`} />
                <ellipse cx={driftC} cy={r * 0.24} rx={r * 0.78} ry={r * 0.14} fill="rgba(255,255,255,0.11)" />
                <circle r={r} fill={`url(#sn${uid})`} />
                <circle r={r} fill={`url(#sl${uid})`} />
                {cityLights.length > 0 && <g>{cityLights}</g>}
                <ellipse cx={specX} cy={specY} rx={r * 0.36} ry={r * 0.2} fill="rgba(255,255,255,0.24)" transform={`rotate(${tiltDeg * 0.55})`} />
                <ellipse cx={specX * 0.7} cy={specY * 0.62} rx={r * 0.2} ry={r * 0.1} fill="rgba(255,255,255,0.34)" transform={`rotate(${tiltDeg * 0.55})`} />
              </g>
              <circle r={r} fill="none" stroke={`url(#sa${uid})`} strokeWidth={r * 0.11} opacity={0.95} />
              <circle r={r} fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth={r * 0.02} />
            </>
          ) : (
            <circle r={r} fill={c.a} opacity={0.85} />
          )}

          {full && (planet.hasRing || defiRings > 0) && (
            <g>
              {planet.hasRing && (
                <ellipse
                  rx={r * 1.9}
                  ry={ringRy}
                  fill="none"
                  stroke={c.ring}
                  strokeWidth={r * 0.06}
                  opacity={0.7}
                  transform={`rotate(${tiltDeg})`}
                  style={{ clipPath: "inset(-9999px -9999px 50% -9999px)" }}
                />
              )}
              {Array.from({ length: Math.min(defiRings, 3) }, (_, i) => (
                <ellipse
                  key={i}
                  rx={r * (2.1 + i * 0.18)}
                  ry={ringRy * (0.7 + i * 0.15)}
                  fill="none"
                  stroke={ringColors[i]}
                  strokeWidth={r * 0.04}
                  opacity={0.7 - i * 0.1}
                  transform={`rotate(${tiltDeg})`}
                  style={{ clipPath: "inset(-9999px -9999px 50% -9999px)" }}
                />
              ))}
            </g>
          )}

          {full &&
            planet.extras.moonCount > 0 &&
            zr > 30 &&
            Array.from({ length: Math.min(planet.extras.moonCount, 5) }, (_, i) => (
              <MoonEl key={i} cx={0} cy={0} r={r} idx={i} time={time} tilt={planet.tilt} parentR={r} />
            ))}

          {famous && full && showLbl && (
            <text
              y={r * 1.85}
              textAnchor="middle"
              fontSize={r * 0.18}
              fontFamily="'IBM Plex Mono',monospace"
              fill={c.a}
              style={{ pointerEvents: "none", filter: "drop-shadow(0 0 8px currentColor)" }}
            >
              ★ {famous.label}
            </text>
          )}
        </>
      )}

      {showLbl && (
        <text
          y={labelY}
          textAnchor="middle"
          fontSize={r * 0.22}
          fontFamily="'IBM Plex Mono',monospace"
          fill="rgba(255,255,255,0.92)"
          style={{ pointerEvents: "none", filter: "drop-shadow(0 1px 5px rgba(0,0,0,0.95))" }}
        >
          {(() => {
            const lbl = planet.account.name ?? `${planet.account.address.slice(0, 6)}…${planet.account.address.slice(-4)}`;
            return lbl.length > 22 ? `${lbl.slice(0, 20)}…` : lbl;
          })()}
        </text>
      )}

      {showRnk && (
        <text
          y={isBlackHole ? r * 4 : r * 1.35}
          textAnchor="middle"
          fontSize={r * 0.16}
          fontFamily="'IBM Plex Mono',monospace"
          fill={`rgba(${c.rgb},0.65)`}
          style={{ pointerEvents: "none" }}
        >
          ★ #{planet.account.rank}
        </text>
      )}
    </g>
  );
}

export function TileBorder({
  tile,
  camera,
  zoom,
  dims,
}: {
  tile: Tile;
  camera: { x: number; y: number };
  zoom: number;
  dims: { w: number; h: number };
}) {
  const tl = {
    sx: (tile.originX - camera.x) * zoom + dims.w / 2,
    sy: (tile.originY - camera.y) * zoom + dims.h / 2,
  };
  const sz = WORLD_SIZE * zoom;
  const pal = TILE_PAL[tile.palIdx % TILE_PAL.length];

  if (tl.sx > dims.w || tl.sy > dims.h || tl.sx + sz < 0 || tl.sy + sz < 0) return null;

  return (
    <g>
      <rect x={tl.sx} y={tl.sy} width={sz} height={sz} fill="none" stroke={pal.border} strokeWidth={1} strokeDasharray="8 6" />
      {sz > 80 && (
        <text
          x={tl.sx + sz * 0.02}
          y={tl.sy + Math.min(sz * 0.04, 28)}
          fontSize={clamp(sz * 0.018, 10, 22)}
          fontFamily="'IBM Plex Mono',monospace"
          fill={pal.label}
          style={{ pointerEvents: "none" }}
        >
          {tile.loading ? "⟳ loading…" : tile.loaded ? `sector (${tile.tx},${tile.ty})` : ""}
        </text>
      )}
    </g>
  );
}
