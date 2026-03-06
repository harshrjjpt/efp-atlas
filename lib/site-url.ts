export const PROD_SITE_ORIGIN = "https://efp-atlas.vercel.app";

const isLocalHost = (hostOrName: string) =>
  hostOrName.includes("localhost") ||
  hostOrName.startsWith("127.0.0.1") ||
  hostOrName.startsWith("0.0.0.0");

export function resolveServerSiteOrigin({
  host,
  forwardedProto,
}: {
  host?: string | null;
  forwardedProto?: string | null;
}): string {
  const resolvedHost = (host ?? "").toLowerCase();
  if (!resolvedHost) return PROD_SITE_ORIGIN;
  if (isLocalHost(resolvedHost)) {
    const proto = forwardedProto ?? "http";
    return `${proto}://${resolvedHost}`;
  }
  return PROD_SITE_ORIGIN;
}

export function resolveClientSiteOrigin(): string {
  if (typeof window === "undefined") return PROD_SITE_ORIGIN;
  if (isLocalHost(window.location.hostname)) return window.location.origin;
  return PROD_SITE_ORIGIN;
}
