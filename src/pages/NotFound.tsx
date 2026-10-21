import { BrandLink } from "@/components/brand/Wordmark";
import { ArrowLeft, ArrowUpRight } from "lucide-react";
import { Link } from "react-router";

export default function NotFound() {
  return (
    <div className="relative flex min-h-screen flex-col bg-background">
      <div
        aria-hidden
        className="paper-grain pointer-events-none absolute inset-0 opacity-[0.035]"
      />
      <div className="relative border-b border-ink/15 bg-[var(--paper-deep)]/60">
        <div className="mx-auto flex w-full max-w-[1200px] items-center justify-between px-5 py-2 font-meta text-[0.54rem] uppercase tracking-[0.16em] text-ink/60 sm:px-8">
          <span>Misprint</span>
          <span className="hidden sm:inline">Nothing filed at this address</span>
          <span>Folio —</span>
        </div>
      </div>
      <header className="relative border-b border-ink/15">
        <div className="mx-auto flex h-[72px] w-full max-w-[1200px] items-center px-5 sm:px-8">
          <BrandLink />
        </div>
      </header>

      <main className="relative flex flex-1 items-center px-5 py-16 sm:px-8">
        <div className="mx-auto grid w-full max-w-[1200px] gap-10 lg:grid-cols-[1fr_auto] lg:items-end">
          <div>
            <div className="flex items-baseline gap-3">
              <span className="font-meta text-[0.58rem] text-[var(--red)]">
                404
              </span>
              <span className="h-px w-6 bg-ink/30" />
              <span className="eyebrow text-ink/60">Page not sent</span>
            </div>
            <h1 className="mt-6 max-w-[36rem] font-display text-[clamp(3rem,8vw,6rem)] leading-[0.9] tracking-[-0.02em]">
              A page that was never delivered.
            </h1>
            <p className="mt-6 max-w-[26rem] text-[0.9rem] leading-[1.8] text-ink/72">
              The address may be mistyped, or the invitation behind it has been
              moved. Everything you have made is in the studio.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-6">
              <Link
                to="/"
                className="inline-flex items-center gap-2 border border-ink/30 px-5 py-2.5 text-[0.64rem] uppercase tracking-[0.14em] transition-colors hover:border-ink hover:bg-ink hover:text-background"
              >
                <ArrowLeft className="size-3.5" />
                Back to LAMSA
              </Link>
              <Link
                to="/dashboard"
                className="inline-flex items-center gap-2 border-b border-ink/40 pb-1 text-[0.64rem] uppercase tracking-[0.14em] transition-colors hover:border-[var(--red)] hover:text-[var(--red)]"
              >
                Your studio
                <ArrowUpRight className="size-3.5" />
              </Link>
            </div>
          </div>

          <div aria-hidden className="hidden text-right lg:block">
            <p className="font-display text-[13rem] leading-[0.7] tracking-[-0.04em] text-ink/[0.08]">
              404
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
