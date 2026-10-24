import { BrandLink, Wordmark } from "@/components/brand/Wordmark";
import { Button } from "@/components/ui/button";
import { brand } from "@/lib/brand";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { ArrowRight, Lock, PenLine, Sparkles } from "lucide-react";
import type { ReactNode } from "react";
import { Link } from "react-router";

const EASE = [0.22, 1, 0.36, 1] as const;

function Reveal({
  children,
  delay = 0,
  className,
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
}) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.65, delay, ease: EASE }}
    >
      {children}
    </motion.div>
  );
}

function Folio({ label }: { label: string }) {
  return (
    <span className="font-meta text-[0.52rem] tracking-[0.22em] text-ink/40 uppercase">
      {label}
    </span>
  );
}

/**
 * The studio's front door.
 *
 * There is one owner, so this page is not marketing: it introduces the atelier
 * and opens the private studio. Sign-in, the email verification and the PIN all
 * live inside `StudioGate`, which protects every studio route.
 */
export default function Landing() {
  return (
    <div className="min-h-dvh bg-[var(--paper)] font-ui text-ink selection:bg-[var(--red)]/15 selection:text-[var(--red)]">
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 z-0 bg-[radial-gradient(120%_80%_at_50%_-10%,rgba(113,0,20,0.06),transparent_60%)]"
      />

      <header className="relative z-20 border-b border-ink/10">
        <div className="mx-auto flex h-[76px] w-full max-w-[1240px] items-center justify-between gap-4 px-5 sm:px-8 lg:px-12">
          <BrandLink className="shrink-0" />
          <Folio label="Private atelier" />
          <div className="flex items-center gap-2 text-ink/40">
            <Lock className="size-3.5" aria-hidden />
            <span className="hidden text-[0.56rem] tracking-[0.2em] uppercase sm:inline">
              One owner
            </span>
          </div>
        </div>
      </header>

      <main className="relative z-10 mx-auto w-full max-w-[1240px] px-5 sm:px-8 lg:px-12">
        <div className="grid items-center gap-14 pt-16 pb-16 sm:pt-24 lg:grid-cols-[1.05fr_0.95fr] lg:gap-10 lg:pt-28">
          <div>
            <Reveal delay={0.04}>
              <div className="flex items-center gap-3">
                <span
                  aria-hidden
                  className="size-1.5 rounded-full bg-[var(--red)]"
                />
                <Folio label="Digital & printed invitations" />
              </div>
            </Reveal>

            <Reveal delay={0.1}>
              <h1 className="mt-6 text-[clamp(2.5rem,6vw,4.4rem)] leading-[0.94] font-semibold tracking-[-0.045em] text-balance">
                Your atelier,
                <br />
                <span className="text-ink/45">open only to you.</span>
              </h1>
              <p className="mt-6 max-w-[46ch] text-[0.98rem] leading-[1.75] text-ink/60">
                {brand.name} is a private invitation studio. Design from a blank
                page or a template, set the typography, frame and opening, then
                send one considered link to the people you love.
              </p>
            </Reveal>

            <Reveal delay={0.18}>
              <div className="mt-9 flex flex-wrap items-center gap-3">
                <Button asChild className="h-12 gap-2 px-6">
                  <Link to="/dashboard">
                    Open the studio
                    <ArrowRight className="size-4" aria-hidden />
                  </Link>
                </Button>
                <Button
                  asChild
                  variant="subtle"
                  className="h-12 gap-2 px-5"
                >
                  <Link to="/dashboard">
                    <PenLine className="size-4" aria-hidden />
                    Start an invitation
                  </Link>
                </Button>
              </div>
              <p className="mt-4 max-w-[42ch] text-[0.72rem] leading-relaxed text-ink/45">
                A verified email and your six-digit studio PIN open the atelier.
                Guests never see this page — only the invitation you send them.
              </p>
            </Reveal>
          </div>

          <Reveal delay={0.22} className="relative">
            <div className="relative mx-auto w-full max-w-[420px]">
              <div
                aria-hidden
                className="absolute -inset-6 rounded-[2rem] opacity-70 blur-3xl"
                style={{
                  background:
                    "radial-gradient(circle at 60% 35%, rgba(179,143,111,0.22), transparent 70%)",
                }}
              />
              <div className="relative overflow-hidden rounded-xl border border-ink/12 bg-[var(--paper-light)] p-7 shadow-[0_28px_60px_rgba(21,21,21,0.12)]">
                <div className="flex items-center justify-between border-b border-ink/10 pb-4">
                  <Wordmark className="h-[18px]" />
                  <Folio label="No. 001" />
                </div>
                <div className="mt-8 text-center">
                  <p className="font-meta text-[0.5rem] tracking-[0.28em] text-ink/40 uppercase">
                    Together with their families
                  </p>
                  <p className="mt-5 font-display text-[2.1rem] leading-[1.05] tracking-tight">
                    Alexandra
                    <span className="mx-2 text-ink/30">&</span>
                    Omar
                  </p>
                  <p className="mt-6 font-meta text-[0.52rem] tracking-[0.22em] text-ink/45 uppercase">
                    Riad El Fenn · Marrakech
                  </p>
                  <div className="mx-auto mt-5 h-px w-16 bg-[var(--gold)]/60" />
                  <p className="mt-5 text-[0.78rem] leading-relaxed text-ink/55">
                    A specimen page, to show the paper, the type and the frame —
                    your own wording replaces every word of it.
                  </p>
                </div>
                <div className="mt-8 flex items-center justify-between border-t border-ink/10 pt-4">
                  <span className="flex items-center gap-1.5 font-meta text-[0.48rem] tracking-[0.18em] text-ink/40 uppercase">
                    <Sparkles className="size-3" aria-hidden />
                    Blank canvas or template
                  </span>
                  <span className="font-meta text-[0.48rem] tracking-[0.18em] text-ink/40 uppercase">
                    A5 · 148 × 210 mm
                  </span>
                </div>
              </div>
            </div>
          </Reveal>
        </div>

        <Reveal delay={0.28}>
          <section className="border-t border-ink/12 pt-8 pb-20">
            <Folio label="Inside the studio" />
            <div className="mt-6 grid gap-px overflow-hidden rounded-lg border border-ink/12 bg-ink/10 sm:grid-cols-2 lg:grid-cols-4">
              {[
                {
                  label: "Blank canvas",
                  copy: "Custom size, units, bleed, margins and paper — then build from nothing.",
                },
                {
                  label: "Decorative frames",
                  copy: "Fifteen drawn frames from botanicals to Art Deco and zellige, as editable vectors.",
                },
                {
                  label: "Real stationery",
                  copy: "Envelopes, seals, gatefolds and boxes whose openings play on the invitation.",
                },
                {
                  label: "Print & publish",
                  copy: "Print-ready artwork and one private guest link from the same design.",
                },
              ].map((item) => (
                <div
                  key={item.label}
                  className={cn(
                    "bg-[var(--paper-light)] p-5",
                    "transition-colors duration-300 hover:bg-[var(--paper)]",
                  )}
                >
                  <p className="text-[0.9rem] font-semibold tracking-tight">
                    {item.label}
                  </p>
                  <p className="mt-2 text-[0.78rem] leading-relaxed text-ink/55">
                    {item.copy}
                  </p>
                </div>
              ))}
            </div>
          </section>
        </Reveal>
      </main>

      <footer className="relative z-10 border-t border-ink/10">
        <div className="mx-auto flex w-full max-w-[1240px] flex-col gap-3 px-5 py-7 sm:flex-row sm:items-center sm:justify-between sm:px-8 lg:px-12">
          <p className="font-meta text-[0.48rem] tracking-[0.22em] text-ink/40 uppercase">
            {brand.name} · An atelier for invitations
          </p>
          <p className="flex items-center gap-2 font-meta text-[0.48rem] tracking-[0.22em] text-ink/40 uppercase">
            <Lock className="size-3" aria-hidden />
            Private studio
          </p>
        </div>
      </footer>
    </div>
  );
}
