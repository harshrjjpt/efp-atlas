"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { EFPAccount } from "@/lib/efp";
import AccountPanel from "./AccountPanel";
import Header from "./Header";
import {
  EDGE_PAN_SPEED,
  EDGE_PAN_ZONE_PX,
  EDGE_TRIGGER,
  INERTIA_DECAY,
  INITIAL_ZOOM,
  MAX_PLANETS_SCREEN,
  MAX_REQ,
  NEBULAE,
  NEBULA_SCROLL_FACTOR,
  PAGE_SIZE,
  PLANET_SCREEN_SCALE,
  REQ_GAP_MS,
  ROCKET_ACCEL,
  ROCKET_BOUNCE,
  ROCKET_DECEL,
  ROCKET_IDLE_SPEED,
  ROCKET_MAX_SPEED,
  ROCKET_TURN_RATE,
  ROCKET_WORLD_RADIUS,
  STARS,
  THRESH_PLANET,
  THRESH_SYSTEM,
  TILE_PAL,
  WORLD_SIZE,
  ZOOM_MAX,
  ZOOM_MIN,
} from "./universe/constants";
import { clamp, angleDelta, fmod, isUiTarget, tileKey } from "./universe/math";
import { buildPlanet, radiusForAccount, weiToEthApprox } from "./universe/planet-builder";
import { PlanetEl, TileBorder } from "./universe/SceneElements";
import {
  HUD,
  LodBanner,
  Minimap,
  RocketEl,
  ShareModal,
  TileCenterLabels,
  WarpOverlay,
  WarpSearchUI,
} from "./universe/Overlays";
import type { Planet, RocketState, Tile, WarpPhase } from "./universe/types";

interface Props {
  initialLimit: number;
}

async function fetchPage(page: number, limit: number): Promise<EFPAccount[]> {
  const res = await fetch(`/api/efp/leaderboard?page=${page}&limit=${limit}`, { cache: "no-store" });
  if (!res.ok) throw new Error(`page ${page}`);
  const j = await res.json();
  return Array.isArray(j?.accounts) ? j.accounts : [];
}

export default function BubbleUniverse({ initialLimit }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ id: number; x: number; y: number; cx: number; cy: number } | null>(null);
  const velRef = useRef({ x: 0, y: 0 });
  const lastDragRef = useRef({ x: 0, y: 0, t: 0 });
  const keysRef = useRef<Set<string>>(new Set());
  const rafRef = useRef<number | null>(null);
  const tickRef = useRef(0);
  const mouseRef = useRef({ x: 0, y: 0, inside: false });
  const rocketRef = useRef<RocketState | null>(null);
  const travelRef = useRef(false);
  const tileMapRef = useRef<Map<string, Tile>>(new Map());
  const nextPageRef = useRef(0);
  const activeRef = useRef(0);
  const pumpTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const loadQueue = useRef<Array<{ key: string; page: number }>>([]);
  const balanceCacheRef = useRef<Map<string, number>>(new Map());
  const balancePendingRef = useRef<Set<string>>(new Set());
  const nftCountCacheRef = useRef<Map<string, number>>(new Map());
  const nftPendingRef = useRef<Set<string>>(new Set());

  const [dims, setDims] = useState({ w: 1280, h: 800 });
  const [camera, setCamera] = useState({ x: WORLD_SIZE / 2, y: WORLD_SIZE / 2 });
  const [zoom, setZoom] = useState(INITIAL_ZOOM);
  const [tiles, setTiles] = useState<Tile[]>([]);
  const [totalPlanets, setTotalPlanets] = useState(0);
  const [selected, setSelected] = useState<EFPAccount | null>(null);
  const [search, setSearch] = useState("");
  const [loadingCnt, setLoadingCnt] = useState(0);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [time, setTime] = useState(0);
  const [travelMode, setTravelMode] = useState(false);
  const [rocketUi, setRocketUi] = useState<RocketState | null>(null);
  const [warpPhase, setWarpPhase] = useState<WarpPhase>("idle");
  const [warpTarget, setWarpTarget] = useState("");
  const [sharePlanet, setSharePlanet] = useState<Planet | null>(null);
  const [selectedPlanet, setSelectedPlanet] = useState<Planet | null>(null);

  const camRef = useRef(camera);
  const zoomRef = useRef(zoom);
  const dimsRef = useRef(dims);
  const tilesRef = useRef(tiles);

  useEffect(() => {
    camRef.current = camera;
  }, [camera]);

  useEffect(() => {
    zoomRef.current = zoom;
  }, [zoom]);

  useEffect(() => {
    dimsRef.current = dims;
  }, [dims]);

  useEffect(() => {
    tilesRef.current = tiles;
  }, [tiles]);

  useEffect(() => {
    travelRef.current = travelMode;
  }, [travelMode]);

  const allPlanets = useMemo(() => tiles.flatMap((t) => t.planets), [tiles]);

  useEffect(() => {
    const update = () => {
      if (!containerRef.current) return;
      setDims({
        w: containerRef.current.clientWidth,
        h: containerRef.current.clientHeight,
      });
    };

    update();
    const ro = new ResizeObserver(update);
    if (containerRef.current) ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const tick = (now: number) => {
      const dt = clamp((now - tickRef.current) / 1000, 0, 0.05);
      tickRef.current = now;
      setTime((t) => t + dt);

      const keys = keysRef.current;
      const speed = (dimsRef.current.w * 0.6) / zoomRef.current;
      let mx = 0;
      let my = 0;

      if (keys.has("arrowleft") || keys.has("a")) mx -= speed * dt;
      if (keys.has("arrowright") || keys.has("d")) mx += speed * dt;
      if (keys.has("arrowup") || keys.has("w")) my -= speed * dt;
      if (keys.has("arrowdown") || keys.has("s")) my += speed * dt;

      if (!travelRef.current) {
        if (mx || my) {
          velRef.current = { x: 0, y: 0 };
          setCamera((p) => ({ x: p.x + mx, y: p.y + my }));
        } else {
          const { x: vx, y: vy } = velRef.current;
          if (Math.abs(vx) > 0.5 || Math.abs(vy) > 0.5) {
            velRef.current = { x: vx * INERTIA_DECAY, y: vy * INERTIA_DECAY };
            setCamera((p) => ({ x: p.x + vx * dt, y: p.y + vy * dt }));
          }
        }
      }

      const m = mouseRef.current;
      if (!travelRef.current && m.inside && !dragRef.current) {
        const zone = EDGE_PAN_ZONE_PX;
        let ex = 0;
        let ey = 0;

        if (m.x < zone) ex = -(1 - m.x / zone);
        else if (m.x > dimsRef.current.w - zone) ex = (m.x - (dimsRef.current.w - zone)) / zone;

        if (m.y < zone) ey = -(1 - m.y / zone);
        else if (m.y > dimsRef.current.h - zone) ey = (m.y - (dimsRef.current.h - zone)) / zone;

        const easeX = ex === 0 ? 0 : Math.sign(ex) * ex * ex;
        const easeY = ey === 0 ? 0 : Math.sign(ey) * ey * ey;

        if (easeX || easeY) {
          const panSpeed = (Math.min(dimsRef.current.w, dimsRef.current.h) * EDGE_PAN_SPEED) / zoomRef.current;
          setCamera((p) => ({ x: p.x + easeX * panSpeed * dt, y: p.y + easeY * panSpeed * dt }));
        }
      }

      if (travelRef.current && rocketRef.current) {
        const r = rocketRef.current;
        const targetWx = camRef.current.x + (mouseRef.current.x - dimsRef.current.w / 2) / zoomRef.current;
        const targetWy = camRef.current.y + (mouseRef.current.y - dimsRef.current.h / 2) / zoomRef.current;
        const targetAngle = Math.atan2(targetWy - r.y, targetWx - r.x);

        r.angle += clamp(angleDelta(r.angle, targetAngle), -ROCKET_TURN_RATE * dt, ROCKET_TURN_RATE * dt);

        const speedNow = Math.hypot(r.vx, r.vy);
        const targetSpeed = r.boosting ? ROCKET_MAX_SPEED : ROCKET_IDLE_SPEED;
        const accel = r.boosting ? ROCKET_ACCEL : ROCKET_DECEL;
        const nextSpeed = speedNow + clamp(targetSpeed - speedNow, -accel * dt, accel * dt);

        r.vx = Math.cos(r.angle) * nextSpeed;
        r.vy = Math.sin(r.angle) * nextSpeed;
        r.x += r.vx * dt;
        r.y += r.vy * dt;

        const checkRange = Math.max(ROCKET_WORLD_RADIUS + 2_600_000, WORLD_SIZE * 0.06);
        for (const tile of tilesRef.current) {
          if (tile.originX > r.x + checkRange || tile.originX + WORLD_SIZE < r.x - checkRange) continue;
          if (tile.originY > r.y + checkRange || tile.originY + WORLD_SIZE < r.y - checkRange) continue;

          for (const p of tile.planets) {
            const dx = r.x - p.wx;
            const dy = r.y - p.wy;
            const minDist = p.r + ROCKET_WORLD_RADIUS;
            const distSq = dx * dx + dy * dy;
            if (distSq >= minDist * minDist) continue;

            const dist = Math.max(Math.sqrt(distSq), 1);
            const nx = dx / dist;
            const ny = dy / dist;
            r.x += nx * (minDist - dist + 4_000);
            r.y += ny * (minDist - dist + 4_000);
            const vn = r.vx * nx + r.vy * ny;
            if (vn < 0) {
              r.vx -= (1 + ROCKET_BOUNCE) * vn * nx;
              r.vy -= (1 + ROCKET_BOUNCE) * vn * ny;
            }
          }
        }

        setCamera({ x: r.x, y: r.y });
        setRocketUi({ ...r });
      }

      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  useEffect(() => {
    const NAV = new Set(["arrowleft", "arrowright", "arrowup", "arrowdown", "a", "d", "w", "s"]);
    const onKeyDown = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      if (NAV.has(k)) {
        e.preventDefault();
        keysRef.current.add(k);
      }
    };

    const onKeyUp = (e: KeyboardEvent) => keysRef.current.delete(e.key.toLowerCase());
    window.addEventListener("keydown", onKeyDown, { passive: false });
    window.addEventListener("keyup", onKeyUp);

    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, []);

  const pump = useCallback(() => {
    while (activeRef.current < MAX_REQ && loadQueue.current.length > 0) {
      const job = loadQueue.current.shift();
      if (!job) break;

      const tile = tileMapRef.current.get(job.key);
      if (!tile || tile.loaded || tile.loading) continue;

      tile.loading = true;
      activeRef.current++;
      setLoadingCnt((n) => n + 1);

      fetchPage(job.page, initialLimit || PAGE_SIZE)
        .then((accounts) => {
          tile.loading = false;
          tile.loaded = true;

          for (const acc of accounts) tile.planets.push(buildPlanet(acc, tile));

          const uncached = tile.planets
            .map((p) => p.account.address.toLowerCase())
            .filter((addr) => !balanceCacheRef.current.has(addr) && !balancePendingRef.current.has(addr));

          if (uncached.length > 0) {
            const chunk = uncached.slice(0, 80);
            chunk.forEach((addr) => balancePendingRef.current.add(addr));

            fetch("/api/eth/balances", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ addresses: chunk }),
            })
              .then((res) => (res.ok ? res.json() : Promise.reject()))
              .then((payload) => {
                const balances = payload?.balances ?? {};
                for (const [addrRaw, weiRaw] of Object.entries(balances as Record<string, string>)) {
                  balanceCacheRef.current.set(addrRaw.toLowerCase(), weiToEthApprox(String(weiRaw)));
                }

                Array.from(tileMapRef.current.values()).forEach((t) =>
                  t.planets.forEach((p) => {
                    const b = balanceCacheRef.current.get(p.account.address.toLowerCase());
                    if (b == null) return;
                    p.ethBalance = b;
                    p.r = radiusForAccount(p.account, b, p.extras.famousKey);
                  }),
                );

                setTiles(Array.from(tileMapRef.current.values()));
              })
              .catch(() => {})
              .finally(() => chunk.forEach((addr) => balancePendingRef.current.delete(addr)));
          }

          const nftUncached = tile.planets
            .map((p) => p.account.address.toLowerCase())
            .filter((addr) => !nftCountCacheRef.current.has(addr) && !nftPendingRef.current.has(addr));

          if (nftUncached.length > 0) {
            const chunk = nftUncached.slice(0, 60);
            chunk.forEach((addr) => nftPendingRef.current.add(addr));
            fetch("/api/eth/nft-counts", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ addresses: chunk }),
            })
              .then((res) => (res.ok ? res.json() : Promise.reject()))
              .then((payload) => {
                const counts = payload?.counts ?? {};
                for (const [addrRaw, countRaw] of Object.entries(counts as Record<string, number>)) {
                  const normalized = addrRaw.toLowerCase();
                  const count = Number.isFinite(countRaw) ? Math.max(0, Math.floor(Number(countRaw))) : 0;
                  nftCountCacheRef.current.set(normalized, count);
                }

                Array.from(tileMapRef.current.values()).forEach((t) =>
                  t.planets.forEach((p) => {
                    const count = nftCountCacheRef.current.get(p.account.address.toLowerCase());
                    if (count == null) return;
                    p.extras.nftCount = count;
                    p.extras.moonCount = count;
                  }),
                );
                setTiles(Array.from(tileMapRef.current.values()));
              })
              .catch(() => {})
              .finally(() => chunk.forEach((addr) => nftPendingRef.current.delete(addr)));
          }

          setTiles(Array.from(tileMapRef.current.values()));
          setTotalPlanets((p) => p + tile.planets.length);
          setLoadError(null);
        })
        .catch(() => {
          tile.loading = false;
          setLoadError("EFP API error — move to retry");
        })
        .finally(() => {
          activeRef.current = Math.max(0, activeRef.current - 1);
          setLoadingCnt((n) => Math.max(0, n - 1));
          if (pumpTimer.current) clearTimeout(pumpTimer.current);
          pumpTimer.current = setTimeout(pump, REQ_GAP_MS);
        });
    }
  }, [initialLimit]);

  const ensureTile = useCallback(
    (tx: number, ty: number) => {
      const key = tileKey(tx, ty);
      if (tileMapRef.current.has(key) || tileMapRef.current.size >= 100) return;

      const page = nextPageRef.current++;
      const tile: Tile = {
        tx,
        ty,
        key,
        originX: tx * WORLD_SIZE,
        originY: ty * WORLD_SIZE,
        planets: [],
        page,
        loading: false,
        loaded: false,
        palIdx: Math.abs(tx * 31 + ty * 17) % TILE_PAL.length,
      };

      tileMapRef.current.set(key, tile);
      loadQueue.current.push({ key, page });
      setTiles(Array.from(tileMapRef.current.values()));
      pump();
    },
    [pump],
  );

  const checkEdges = useCallback(
    (cam: { x: number; y: number }) => {
      const tx0 = Math.floor(cam.x / WORLD_SIZE);
      const ty0 = Math.floor(cam.y / WORLD_SIZE);
      ensureTile(tx0, ty0);

      const localX = cam.x - tx0 * WORLD_SIZE;
      const localY = cam.y - ty0 * WORLD_SIZE;
      if (localX < EDGE_TRIGGER) ensureTile(tx0 - 1, ty0);
      if (localX > WORLD_SIZE - EDGE_TRIGGER) ensureTile(tx0 + 1, ty0);
      if (localY < EDGE_TRIGGER) ensureTile(tx0, ty0 - 1);
      if (localY > WORLD_SIZE - EDGE_TRIGGER) ensureTile(tx0, ty0 + 1);
    },
    [ensureTile],
  );

  useEffect(() => {
    checkEdges({ x: WORLD_SIZE / 2, y: WORLD_SIZE / 2 });
  }, [checkEdges]);

  useEffect(() => {
    checkEdges(camera);
  }, [camera, checkEdges]);

  useEffect(
    () => () => {
      if (pumpTimer.current) clearTimeout(pumpTimer.current);
    },
    [],
  );

  const warpToPlanet = useCallback((planet: Planet) => {
    setWarpTarget(planet.account.name ?? planet.account.address.slice(0, 8));
    setWarpPhase("launching");
    setTimeout(() => setWarpPhase("warping"), 400);
    setTimeout(() => {
      setCamera({ x: planet.wx, y: planet.wy });
      setZoom(0.0008);
      setWarpPhase("arriving");
    }, 1800);
    setTimeout(() => {
      setWarpPhase("idle");
      setSelected(planet.account);
      setSelectedPlanet(planet);
    }, 2600);
  }, []);

  const lod: "GALAXY" | "SYSTEM" | "PLANET" =
    zoom < THRESH_SYSTEM ? "GALAXY" : zoom < THRESH_PLANET ? "SYSTEM" : "PLANET";

  const renderItems = useMemo(() => {
    const q = search.trim().toLowerCase();
    const halfW = dims.w / (2 * zoom);
    const halfH = dims.h / (2 * zoom);
    const pad = WORLD_SIZE * 0.1;

    const L = camera.x - halfW - pad;
    const R = camera.x + halfW + pad;
    const T = camera.y - halfH - pad;
    const B = camera.y + halfH + pad;

    const list: Array<{ planet: Planet; sx: number; sy: number; zr: number }> = [];
    for (const tile of tiles) {
      if (tile.originX + WORLD_SIZE < L || tile.originX > R || tile.originY + WORLD_SIZE < T || tile.originY > B) continue;
      for (const p of tile.planets) {
        if (p.wx < L || p.wx > R || p.wy < T || p.wy > B) continue;
        list.push({
          planet: p,
          sx: (p.wx - camera.x) * zoom + dims.w / 2,
          sy: (p.wy - camera.y) * zoom + dims.h / 2,
          zr: p.r * zoom,
        });
      }
    }

    list.sort((a, b) => a.planet.account.rank - b.planet.account.rank);

    return list.slice(0, MAX_PLANETS_SCREEN).map(({ planet, sx, sy, zr }) => ({
      planet,
      sx,
      sy,
      zr,
      full: true,
      dimmed:
        q.length > 0 &&
        !(planet.account.name ?? "").toLowerCase().includes(q) &&
        !planet.account.address.toLowerCase().includes(q),
      selected: selected?.address === planet.account.address,
    }));
  }, [tiles, camera, zoom, dims, search, selected]);

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (isUiTarget(e.target)) return;
    if (travelRef.current && rocketRef.current) {
      rocketRef.current.boosting = true;
      setRocketUi({ ...rocketRef.current });
      return;
    }

    velRef.current = { x: 0, y: 0 };
    dragRef.current = {
      id: e.pointerId,
      x: e.clientX,
      y: e.clientY,
      cx: camRef.current.x,
      cy: camRef.current.y,
    };
    lastDragRef.current = { x: e.clientX, y: e.clientY, t: performance.now() };
    containerRef.current?.setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (rect) {
      mouseRef.current = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
        inside: true,
      };
    }

    if (!dragRef.current || dragRef.current.id !== e.pointerId || isUiTarget(e.target)) return;

    const now = performance.now();
    const dt = Math.max(now - lastDragRef.current.t, 1);
    velRef.current = {
      x: (-(e.clientX - lastDragRef.current.x) / dt) * 1000 / zoomRef.current,
      y: (-(e.clientY - lastDragRef.current.y) / dt) * 1000 / zoomRef.current,
    };

    lastDragRef.current = { x: e.clientX, y: e.clientY, t: now };
    setCamera({
      x: dragRef.current.cx - (e.clientX - dragRef.current.x) / zoomRef.current,
      y: dragRef.current.cy - (e.clientY - dragRef.current.y) / zoomRef.current,
    });
  };

  const onPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (travelRef.current && rocketRef.current) {
      rocketRef.current.boosting = false;
      setRocketUi({ ...rocketRef.current });
      return;
    }
    if (isUiTarget(e.target) || dragRef.current?.id !== e.pointerId) return;

    dragRef.current = null;
    containerRef.current?.releasePointerCapture(e.pointerId);
  };

  const onPointerLeave = () => {
    mouseRef.current.inside = false;
    if (rocketRef.current) rocketRef.current.boosting = false;
  };

  const onPointerEnter = (e: React.PointerEvent<HTMLDivElement>) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    mouseRef.current = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
      inside: true,
    };
  };

  const onWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (travelRef.current) return;

    const rect = containerRef.current!.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    const wx = camRef.current.x + (mx - dimsRef.current.w / 2) / zoomRef.current;
    const wy = camRef.current.y + (my - dimsRef.current.h / 2) / zoomRef.current;
    const nz = clamp(
      zoomRef.current * Math.exp(-e.deltaY * (e.ctrlKey ? 0.008 : 0.004)),
      ZOOM_MIN,
      ZOOM_MAX,
    );

    setZoom(nz);
    setCamera({
      x: wx - (mx - dimsRef.current.w / 2) / nz,
      y: wy - (my - dimsRef.current.h / 2) / nz,
    });
  };

  const nebulaEls = useMemo(
    () =>
      NEBULAE.map((n) => {
        const x = fmod(n.rx * dims.w * 3 - camera.x * zoom * NEBULA_SCROLL_FACTOR, dims.w * 3) - dims.w;
        const y = fmod(n.ry * dims.h * 3 - camera.y * zoom * NEBULA_SCROLL_FACTOR, dims.h * 3) - dims.h;
        return <ellipse key={n.id} cx={x} cy={y} rx={n.size * 2} ry={n.size * 0.72} fill={`hsla(${n.hue},60%,50%,${n.op})`} />;
      }),
    [camera, dims, zoom],
  );

  const starEls = useMemo(
    () =>
      STARS.map((s) => {
        const x = fmod(s.rx * dims.w - camera.x * zoom * s.par, dims.w);
        const y = fmod(s.ry * dims.h - camera.y * zoom * s.par, dims.h);
        const op = s.o * (0.7 + 0.3 * Math.sin(time * s.tw * 2.5 + s.id));
        return <circle key={s.id} cx={x} cy={y} r={s.r} fill={`rgba(255,255,255,${op.toFixed(2)})`} />;
      }),
    [camera, dims, time, zoom],
  );

  const toggleTravel = () => {
    if (!travelRef.current) {
      const start: RocketState = {
        x: camRef.current.x,
        y: camRef.current.y,
        vx: ROCKET_IDLE_SPEED,
        vy: 0,
        angle: 0,
        boosting: false,
      };
      rocketRef.current = start;
      setRocketUi(start);
      setSelected(null);
      setTravelMode(true);
    } else {
      setTravelMode(false);
      rocketRef.current = null;
      setRocketUi(null);
    }
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!travelRef.current) return;
      const k = e.key.toLowerCase();
      if (k !== "escape" && k !== "t") return;
      setTravelMode(false);
      rocketRef.current = null;
      setRocketUi(null);
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const handlePlanetClick = useCallback(
    (account: EFPAccount) => {
      setSelected(account);
      const planet = allPlanets.find((p) => p.account.address === account.address) ?? null;
      setSelectedPlanet(planet);
    },
    [allPlanets],
  );

  return (
    <div
      ref={containerRef}
      className="relative w-screen h-screen overflow-hidden select-none"
      style={{
        background: "radial-gradient(ellipse at 30% 22%, #0d1c3a 0%, #050a16 55%, #020508 100%)",
        cursor: dragRef.current ? "grabbing" : "grab",
      }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onPointerEnter={onPointerEnter}
      onPointerLeave={onPointerLeave}
      onWheel={onWheel}
    >
      <svg width={dims.w} height={dims.h} className="absolute inset-0" style={{ pointerEvents: "none", overflow: "visible" }}>
        <defs>
          <filter id="nblur" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="52" />
          </filter>
        </defs>
        <g filter="url(#nblur)">{nebulaEls}</g>
        <g>{starEls}</g>
      </svg>

      <svg width={dims.w} height={dims.h} className="absolute inset-0">
        {tiles.map((tile) => (
          <TileBorder key={tile.key} tile={tile} camera={camera} zoom={zoom} dims={dims} />
        ))}
        {renderItems.map(({ planet, sx, sy, zr, full, dimmed, selected: sel }) => (
          <PlanetEl key={planet.account.address} planet={planet} sx={sx} sy={sy} zr={zr} full={full} dimmed={dimmed} selected={sel} onClick={() => handlePlanetClick(planet.account)} time={time} />
        ))}
        <TileCenterLabels tiles={tiles} camera={camera} zoom={zoom} dims={dims} />
      </svg>

      <Header totalAccounts={totalPlanets} loadedPages={nextPageRef.current} loadingPages={loadingCnt} searchQuery={search} onSearch={setSearch} />
      <WarpSearchUI onWarpTo={warpToPlanet} allPlanets={allPlanets} />
      <LodBanner lod={lod} />

      <div style={{ position: "absolute", top: 72, right: 24, zIndex: 40, display: "flex", flexDirection: "column", gap: 8 }} data-ui="true">
        <button
          type="button"
          onClick={toggleTravel}
          onPointerDown={(e) => e.stopPropagation()}
          onPointerUp={(e) => e.stopPropagation()}
          data-ui="true"
          style={{ padding: "10px 14px", borderRadius: 12, border: "1px solid rgba(56,189,248,0.45)", background: travelMode ? "rgba(56,189,248,0.2)" : "rgba(3,7,18,0.82)", color: "rgba(186,230,253,0.95)", fontFamily: "'IBM Plex Mono',monospace", fontSize: 12, letterSpacing: "0.03em", cursor: "pointer", backdropFilter: "blur(8px)" }}
        >
          {travelMode ? "Stop Travel (Esc)" : "🚀 Travel Space"}
        </button>

        {selectedPlanet && (
          <button
            type="button"
            onClick={() => setSharePlanet(selectedPlanet)}
            onPointerDown={(e) => e.stopPropagation()}
            data-ui="true"
            style={{ padding: "10px 14px", borderRadius: 12, border: "1px solid rgba(52,211,153,0.45)", background: "rgba(3,7,18,0.82)", color: "rgba(110,231,183,0.95)", fontFamily: "'IBM Plex Mono',monospace", fontSize: 12, letterSpacing: "0.03em", cursor: "pointer", backdropFilter: "blur(8px)" }}
          >
            🌍 Share My Planet
          </button>
        )}
      </div>

      {loadError && (
        <div style={{ position: "absolute", top: 110, left: "50%", transform: "translateX(-50%)", fontFamily: "monospace", fontSize: 11, zIndex: 20, background: "rgba(249,115,22,0.12)", border: "1px solid rgba(249,115,22,0.4)", color: "#fdba74", padding: "6px 18px", borderRadius: 20 }}>
          ⚠ {loadError}
        </div>
      )}

      <HUD zoom={zoom} loading={loadingCnt} total={totalPlanets} lod={lod} tileCount={tiles.length} />
      <Minimap tiles={tiles} camera={camera} zoom={zoom} dims={dims} />

      {rocketUi && (
        <svg width={dims.w} height={dims.h} className="absolute inset-0" style={{ pointerEvents: "none", zIndex: 18 }}>
          <RocketEl
            x={(rocketUi.x - camera.x) * zoom + dims.w / 2}
            y={(rocketUi.y - camera.y) * zoom + dims.h / 2}
            angle={rocketUi.angle}
            boosting={rocketUi.boosting}
            size={Math.max(ROCKET_WORLD_RADIUS * zoom * PLANET_SCREEN_SCALE * 2.5, 6)}
            time={time}
          />
        </svg>
      )}

      <WarpOverlay phase={warpPhase} targetName={warpTarget} />
      {sharePlanet && <ShareModal planet={sharePlanet} onClose={() => setSharePlanet(null)} />}
      {selected && <AccountPanel account={selected} onClose={() => { setSelected(null); setSelectedPlanet(null); }} />}
    </div>
  );
}
