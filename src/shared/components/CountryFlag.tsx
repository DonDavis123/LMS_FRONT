"use client";

import { useState } from "react";

interface CountryFlagProps {
  /** ISO 3166-1 alpha-2 code, e.g. "IN". */
  iso: string;
  className?: string;
}

/**
 * Small flag image for a country. Real images are used instead of emoji flags
 * because Windows browsers draw emoji flags as two letters. If the image can't
 * load (offline, blocked), a neutral placeholder keeps the layout steady.
 */
export default function CountryFlag({ iso, className = "" }: CountryFlagProps) {
  const [failed, setFailed] = useState(false);
  const code = iso.toLowerCase();
  const box = `inline-block h-[15px] w-5 shrink-0 rounded-[3px] shadow-[0_0_0_1px_rgba(15,23,42,0.12)] ${className}`;

  if (failed || !/^[a-z]{2}$/.test(code)) {
    return <span aria-hidden="true" className={`${box} bg-line`} />;
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={`https://flagcdn.com/w40/${code}.png`}
      srcSet={`https://flagcdn.com/w40/${code}.png 1x, https://flagcdn.com/w80/${code}.png 2x`}
      width={20}
      height={15}
      alt=""
      aria-hidden="true"
      loading="lazy"
      decoding="async"
      onError={() => setFailed(true)}
      className={`${box} object-cover`}
    />
  );
}
