"use client";

import { useState } from "react";

/* Token icon hosts are dynamic CDN/IPFS URLs; a plain img avoids maintaining a
 * brittle remote-host allow-list. Failed or missing artwork falls back to a mint. */
/* eslint @next/next/no-img-element: off */
export function TokenImage({ src, symbol, size = 36 }: { src?: string | null; symbol: string; size?: number }) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const showImage = !!src && src !== failedSrc;
  const initials = symbol.slice(0, 2).toUpperCase();
  return <span
    className="relative grid shrink-0 place-items-center overflow-hidden rounded-full border border-white/[.08] bg-[#1b3428] font-bold text-[#a1eabb]"
    style={{ width: size, height: size, fontSize: Math.max(10, size * .3) }}
    aria-label={`${symbol} token image`}
  >
    <span className={showImage ? "sr-only" : ""}>{initials}</span>
    {src && showImage && <img src={src} alt="" loading="lazy" referrerPolicy="no-referrer" className="absolute inset-0 h-full w-full object-cover" onError={() => setFailedSrc(src)} />}
  </span>;
}
