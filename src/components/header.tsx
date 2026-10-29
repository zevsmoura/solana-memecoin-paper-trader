import Link from "next/link";
import { currentUser } from "@/lib/auth";
import { formatSol } from "@/lib/money";
import { BrandMark } from "@/components/brand-mark";

export async function Header() {
  const user = await currentUser();
  return <header className="sticky top-0 z-20 flex h-14 items-center justify-between border-b border-[#202833] bg-[#090c11]/95 px-4 backdrop-blur md:px-7">
    <Link href="/" className="flex items-center gap-2.5 font-bold tracking-tight">
      <BrandMark size={34} />
      <span className="text-[15px]">memeport<span className="text-[#758293]">.</span></span>
      <span className="hidden rounded border border-[#27323d] px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-[.13em] text-[#83909d] sm:inline">Terminal</span>
    </Link>
    <nav className="flex items-center gap-3 text-[11px] text-[#aab4bf] sm:gap-5 sm:text-xs">
      <Link href="/" className="hover:text-white">Markets</Link>
      <Link href="/leaderboard" className="hidden hover:text-white sm:inline">Leaderboard</Link>
      {user ? <>
        <Link href="/portfolio" className="hover:text-white">Portfolio</Link>
        <span className="rounded-md border border-[#344354] bg-[#111923] px-2 py-1 font-mono text-[#afc2d2]">{formatSol(user.balance)} SOL</span>
        <form action="/api/auth/logout" method="post"><button className="text-[#7e8a98] hover:text-white">Log out</button></form>
      </> : <Link href="/login" className="rounded-md border border-[#53687c] bg-[#27394b] px-3 py-1.5 font-semibold text-[#d6e2ec] hover:bg-[#32495e]">Log in</Link>}
    </nav>
  </header>;
}
