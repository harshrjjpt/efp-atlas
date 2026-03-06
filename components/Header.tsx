"use client";

interface Props {
  totalAccounts: number;
  loadedPages: number;
  loadingPages: number;
  searchQuery: string;
  onSearch: (q: string) => void;
}

export default function Header({
  totalAccounts,
  loadedPages,
  loadingPages,
  searchQuery,
  onSearch,
}: Props) {
  return (
    <header
      className="absolute top-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-4"
      style={{
        background: "linear-gradient(to bottom, rgba(5,10,20,0.95) 0%, rgba(5,10,20,0) 100%)",
      }}
    >
      {/* Logo */}
      <div className="flex items-center gap-3">
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center text-base"
          style={{
            background: "linear-gradient(135deg, #0ea5e9, #8b5cf6)",
            boxShadow: "0 0 20px rgba(14,165,233,0.4)",
          }}
        >
          🫧
        </div>
        <div>
          <div className="text-sm font-semibold tracking-wide" style={{ color: "var(--accent)" }}>
            EFP Atlas
          </div>
          <div className="text-xs font-mono" style={{ color: "var(--muted)" }}>
            {totalAccounts} planets · {loadedPages} pages · global efp index
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <input
          type="text"
          placeholder="Search by name or address…"
          value={searchQuery}
          onChange={(e) => onSearch(e.target.value)}
          className="w-72 px-4 py-2 text-sm font-mono rounded-lg outline-none transition-all"
          style={{
            background: "rgba(11,22,40,0.8)",
            border: "1px solid var(--border)",
            color: "var(--text)",
            backdropFilter: "blur(8px)",
          }}
          onFocus={(e) => {
            e.target.style.borderColor = "var(--accent)";
            e.target.style.boxShadow = "0 0 0 2px rgba(0,212,255,0.1)";
          }}
          onBlur={(e) => {
            e.target.style.borderColor = "var(--border)";
            e.target.style.boxShadow = "none";
          }}
        />
        {searchQuery && (
          <button
            onClick={() => onSearch("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-xs"
            style={{ color: "var(--muted)" }}
          >
            ✕
          </button>
        )}
      </div>

      <div className="text-xs font-mono px-3 py-1.5 rounded-lg" style={{ background: "rgba(0,212,255,0.08)", border: "1px solid rgba(0,212,255,0.2)", color: "var(--accent)" }}>
        {loadingPages > 0 ? `loading ${loadingPages}...` : "live api"}
      </div>
    </header>
  );
}
