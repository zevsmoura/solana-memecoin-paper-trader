export function BrandMark({ size = 34 }: { size?: number }) {
  return <span
    className="relative grid shrink-0 place-items-center overflow-hidden rounded-xl border border-[#53687c]/70 bg-[linear-gradient(145deg,#293b4e,#111b29_70%)] shadow-[inset_0_1px_0_rgba(210,230,246,.18),0_5px_18px_rgba(26,46,67,.35)]"
    style={{ width: size, height: size }}
    aria-hidden="true"
  >
    <svg viewBox="0 0 40 40" width={size * .72} height={size * .72} fill="none">
      <path d="M20 2.8 35.1 11.4v17.2L20 37.2 4.9 28.6V11.4L20 2.8Z" stroke="#9fb7cc" strokeOpacity=".8" strokeWidth="1.2" />
      <path d="m20 8.4 10.2 5.9v11.4L20 31.6 9.8 25.7V14.3L20 8.4Z" fill="url(#ice)" fillOpacity=".14" stroke="#b7cadb" strokeWidth="1.2" />
      <path d="m12.7 24.9 4.8-10.2 2.6 5.4 2.3-3.6 4.9 8.4h-4.1l-2.3-3.8-2.4 3.8h-5.8Z" fill="#c2d3e1" />
      <path d="m17.5 14.7-2.3 4.9h4.5l-2.2-4.9Z" fill="#edf5fb" />
      <defs><linearGradient id="ice" x1="10" y1="8" x2="31" y2="31" gradientUnits="userSpaceOnUse"><stop stopColor="#d5e6f2" /><stop offset="1" stopColor="#617d97" /></linearGradient></defs>
    </svg>
  </span>;
}
