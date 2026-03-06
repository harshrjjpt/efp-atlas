"use client";

import { useEffect, useState } from "react";
import type { EFPAccount } from "@/lib/efp";

interface Props {
  account: EFPAccount;
  onClose: () => void;
}

export default function AccountPanel({ account, onClose }: Props) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Trigger enter animation
    const t = setTimeout(() => setVisible(true), 10);
    return () => clearTimeout(t);
  }, [account.address]);

  const handleClose = () => {
    setVisible(false);
    setTimeout(onClose, 300);
  };

  const shortAddr = `${account.address.slice(0, 8)}…${account.address.slice(-6)}`;
  const efpUrl = `https://efp.app/${account.name ?? account.address}`;

  return (
    <div
      className="absolute right-0 top-0 bottom-0 flex items-center pr-6 pointer-events-none z-40"
    >
      <div
        className="pointer-events-auto w-80 rounded-2xl overflow-hidden"
        style={{
          background: "rgba(11,22,40,0.92)",
          border: "1px solid rgba(0,212,255,0.2)",
          backdropFilter: "blur(20px)",
          boxShadow: "0 0 60px rgba(0,0,0,0.5), 0 0 30px rgba(0,212,255,0.05)",
          transform: visible ? "translateX(0)" : "translateX(120%)",
          opacity: visible ? 1 : 0,
          transition: "transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.3s ease",
        }}
      >
        {/* Top gradient bar */}
        <div
          className="h-1 w-full"
          style={{ background: "linear-gradient(90deg, #0ea5e9, #8b5cf6, #0ea5e9)" }}
        />

        <div className="p-5">
          {/* Close button */}
          <button
            onClick={handleClose}
            className="absolute top-4 right-4 w-6 h-6 rounded-full flex items-center justify-center text-xs transition-opacity hover:opacity-70"
            style={{ background: "rgba(255,255,255,0.08)", color: "var(--muted)" }}
          >
            ✕
          </button>

          {/* Avatar + Name */}
          <div className="flex items-center gap-3 mb-5">
            <div
              className="w-14 h-14 rounded-full flex items-center justify-center text-2xl flex-shrink-0 overflow-hidden"
              style={{
                background: "linear-gradient(135deg, #0ea5e9 0%, #8b5cf6 100%)",
                boxShadow: "0 0 20px rgba(0,212,255,0.3)",
              }}
            >
              {account.avatar ? (
                <img
                  src={account.avatar}
                  alt={account.name ?? "avatar"}
                  className="w-full h-full object-cover rounded-full"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = "none";
                  }}
                />
              ) : (
                <span>⟠</span>
              )}
            </div>
            <div className="min-w-0">
              <div className="font-semibold truncate" style={{ color: "var(--text)" }}>
                {account.name ?? shortAddr}
              </div>
              <div
                className="text-xs font-mono mt-0.5 truncate"
                style={{ color: "var(--muted)" }}
              >
                {account.name ? shortAddr : ""}
              </div>
              <div className="flex items-center gap-1.5 mt-1">
                <span
                  className="text-xs px-1.5 py-0.5 rounded font-mono"
                  style={{
                    background: "rgba(0,212,255,0.1)",
                    color: "var(--accent)",
                    border: "1px solid rgba(0,212,255,0.2)",
                  }}
                >
                  #{account.rank}
                </span>
              </div>
            </div>
          </div>

          {/* Bio */}
          {account.bio && (
            <p
              className="text-xs mb-4 leading-relaxed"
              style={{ color: "var(--muted)", borderLeft: "2px solid rgba(0,212,255,0.3)", paddingLeft: "8px" }}
            >
              {account.bio}
            </p>
          )}

          {/* Stats grid */}
          <div className="grid grid-cols-3 gap-2 mb-4">
            <StatCard label="Followers" value={formatNum(account.followers)} accent="#0ea5e9" />
            <StatCard label="Following" value={formatNum(account.following)} accent="#8b5cf6" />
            <StatCard label="EFP Score" value={formatNum(Math.round(account.score))} accent="#06b6d4" />
          </div>

          {/* Address copy */}
          <div
            className="rounded-lg px-3 py-2 mb-4 font-mono text-xs truncate cursor-pointer group transition-colors"
            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid var(--border)", color: "var(--muted)" }}
            onClick={() => navigator.clipboard?.writeText(account.address)}
            title="Click to copy"
          >
            <span className="opacity-50 group-hover:opacity-100 transition-opacity">📋 </span>
            {account.address}
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <a
              href={efpUrl}
              target="_blank"
              rel="noreferrer"
              className="flex-1 text-center text-xs font-mono py-2 rounded-lg transition-all hover:opacity-80"
              style={{
                background: "linear-gradient(135deg, rgba(14,165,233,0.2), rgba(139,92,246,0.2))",
                border: "1px solid rgba(0,212,255,0.3)",
                color: "var(--accent)",
              }}
            >
              View on EFP ↗
            </a>
            <a
              href={`https://etherscan.io/address/${account.address}`}
              target="_blank"
              rel="noreferrer"
              className="flex-1 text-center text-xs font-mono py-2 rounded-lg transition-all hover:opacity-80"
              style={{
                background: "rgba(255,255,255,0.04)",
                border: "1px solid var(--border)",
                color: "var(--muted)",
              }}
            >
              Etherscan ↗
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, accent }: { label: string; value: string; accent: string }) {
  return (
    <div
      className="rounded-xl p-2.5 text-center"
      style={{
        background: `rgba(${hexToRgb(accent)}, 0.05)`,
        border: `1px solid rgba(${hexToRgb(accent)}, 0.15)`,
      }}
    >
      <div className="text-base font-bold font-mono" style={{ color: accent }}>
        {value}
      </div>
      <div className="text-xs mt-0.5" style={{ color: "var(--muted)" }}>
        {label}
      </div>
    </div>
  );
}

function hexToRgb(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `${r},${g},${b}`;
}

function formatNum(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1) + "K";
  return n.toString();
}
