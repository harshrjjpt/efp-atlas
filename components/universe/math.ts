export const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

export const fmod = (v: number, b: number) => {
  const m = v % b;
  return m < 0 ? m + b : m;
};

export function hash32(s: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h;
}

export function h01(n: number): number {
  n = ((n >>> 16) ^ n) * 0x45d9f3b | 0;
  n = ((n >>> 16) ^ n) * 0x45d9f3b | 0;
  n = (n >>> 16) ^ n;
  return (n >>> 0) / 0x100000000;
}

export const angleDelta = (from: number, to: number) => {
  let d = fmod(to - from + Math.PI, Math.PI * 2) - Math.PI;
  if (d < -Math.PI) d += Math.PI * 2;
  return d;
};

export const tileKey = (tx: number, ty: number) => `${tx},${ty}`;

export const isUiTarget = (target: EventTarget | null) => {
  if (!(target instanceof Element)) return false;
  return Boolean(target.closest("button,input,textarea,select,a,header,[data-ui='true']"));
};
