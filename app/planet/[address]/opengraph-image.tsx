import { ImageResponse } from "next/og";
import { fetchPlanetProfile } from "@/lib/planet-profile";

export const size = {
  width: 1200,
  height: 630,
};

export const contentType = "image/png";

const ADDRESS_RE = /^0x[a-fA-F0-9]{40}$/;

const shortAddress = (address: string) => `${address.slice(0, 8)}…${address.slice(-6)}`;

export default async function Image({ params }: { params: { address: string } }) {
  const address = params.address.toLowerCase();
  const valid = ADDRESS_RE.test(address);
  const profile = valid ? await fetchPlanetProfile(address) : null;

  const label = profile?.name ?? (valid ? shortAddress(address) : "Unknown Planet");
  const followers = (profile?.followers ?? 0).toLocaleString();
  const following = (profile?.following ?? 0).toLocaleString();
  const score = Math.round(profile?.score ?? 0).toLocaleString();
  const rank = profile?.rank ? `#${profile.rank.toLocaleString()}` : "Unranked";

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          background: "radial-gradient(ellipse at 20% 20%, #0f2447 0%, #050a16 55%, #020508 100%)",
          color: "#e2eeff",
          fontFamily: "ui-sans-serif, system-ui, -apple-system",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div style={{ position: "absolute", top: 44, left: 56, width: 300, height: 300, borderRadius: 9999, background: "radial-gradient(circle at 35% 30%, #67e8f9 0%, #0ea5e9 45%, #1d4ed8 100%)", boxShadow: "0 0 120px rgba(14,165,233,0.45)" }} />
        <div style={{ position: "absolute", top: 178, left: 16, width: 380, height: 80, borderRadius: 9999, border: "5px solid rgba(147,197,253,0.8)", transform: "rotate(-10deg)", opacity: 0.75 }} />

        <div style={{ marginLeft: 460, marginTop: 78, display: "flex", flexDirection: "column" }}>
          <div style={{ fontSize: 20, letterSpacing: "0.16em", color: "#67e8f9" }}>EFP ATLAS</div>
          <div style={{ fontSize: 62, fontWeight: 800, lineHeight: 1.05, marginTop: 8 }}>{label}</div>
          <div style={{ fontSize: 22, color: "#9fc0df", marginTop: 10 }}>{valid ? shortAddress(address) : "Invalid address"}</div>

          <div style={{ display: "flex", gap: 14, marginTop: 36 }}>
            <Stat label="Followers" value={followers} />
            <Stat label="Following" value={following} />
            <Stat label="Score" value={score} />
            <Stat label="Rank" value={rank} />
          </div>

          <div style={{ marginTop: 28, fontSize: 20, color: "#c7def7" }}>Explore this wallet in EFP Atlas</div>
        </div>
      </div>
    ),
    size,
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        minWidth: 150,
        border: "1px solid rgba(103,232,249,0.35)",
        borderRadius: 14,
        background: "rgba(8,20,38,0.72)",
        padding: "12px 14px",
      }}
    >
      <div style={{ fontSize: 28, fontWeight: 700, color: "#e7f5ff" }}>{value}</div>
      <div style={{ fontSize: 16, color: "#8fb6da", marginTop: 4 }}>{label}</div>
    </div>
  );
}
