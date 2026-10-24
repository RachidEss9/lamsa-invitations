import { BrandLink, Wordmark } from "@/components/brand/Wordmark";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useStudio } from "@/components/auth/studio-context";
import { motion, useReducedMotion } from "framer-motion";
import { Mail, Lock, Wrench, ArrowRight } from "lucide-react";
import { useState, type ReactNode } from "react";
import { Link } from "react-router";

const STUDIO_HREF = "/studio";

function reduceTransition(reduced: boolean, delay = 0) {
  return reduced
    ? { transition: { duration: 0 } }
    : {
        initial: { opacity: 0, y: 14 },
        animate: { opacity: 1, y: 0 },
        transition: { duration: 0.6, delay, ease: [0.22, 1, 0.36, 1] },
      };
}

function Reveal({
  children,
  delay = 0,
  className,
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
}) {
  const reduce = useReducedMotion();
  const { initial, animate, transition } = reduceTransition(reduce, delay);
  return (
    <motion.div
      className={className}
      initial={initial}
      animate={animate}
      transition={transition}
    >
      {children}
    </motion.div>
  );
}

function Folio({ label }: { label: string }) {
  return (
    <span className="font-meta text-[0.58rem] uppercase tracking-[0.2em] text-ink/40">
      {label}
    </span>
  );
}

export default function Landing() {
  const { email, lock } = useStudio();
  const reduce = useReducedMotion();
  const [pin, setPin] = useState("");
  const [pinError, setPinError] = useState("");
  const [leaving, setLeaving] = useState(false);

  const handlePinKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      if (lock && pin === lock) {
        window.location.href = STUDIO_HREF;
        return;
      }
      setPinError("That PIN didn’t match. Try again.");
    }
  };

  const handlePinPaste = (event: React.ClipboardEvent<HTMLInputElement>) => {
    const text = event.clipboardData.getData("text");
    if (/^\d{6}$/.test(text.trim())) {
      setPin(text.trim());
    }
  };

  return (
    <div className="min-h-screen bg-[var(--paper)] font-ui text-ink selection:bg-[var(--red)]/15 selection:text-[var(--red)]">
      <div className="pointer-events-none fixed inset-0 z-0 bg-[radial-gradient(120%_80%_at_50%_-10%,rgba(113,0,20,0.06),transparent_60%)]" />

      <header className="relative z-40 border-b border-ink/10 bg-[var(--paper)]/90 backdrop-blur">
        <div className="mx-auto flex h-[72px] w-full max-w-[1280px] items-center justify-between px-5 sm:px-8 lg:px-12">
          <BrandLink className="shrink-0" />
          <Folio label="Private studio" />
          <div className="flex items-center gap-3">
            <span className="hidden text-[0.62rem] uppercase tracking-[0.18em] text-ink/45 sm:inline">
              Owner only
            </span>
            <Lock className="size-3.5 text-ink/40" />
          </div>
        </div>
      </header>

      <main className="relative z-10 mx-auto max-w-[1280px] px-5 sm:px-8 lg:px-12">
        <div className="mt-20 sm:mt-28 lg:mt-36">
          <Reveal delay={0.05}>
            <div className="mb-4 flex items-center gap-3">
              <span className="flex h-8 w-8 items-center justify-center rounded-full border border-ink/12 bg-[var(--paper-light)] font-meta text-[0.55rem] uppercase tracking-[0.2em] text-ink/55">
                LAMSA
              </span>
              <span className="h-6 w-6 bg-ink/5" />
              <Folio label="Studio directory" />
            </div>
          </Reveal>

          <Reveal delay={0.12}>
            <div className="max-w-[760px]">
              <p className="font-meta text-[0.62rem] uppercase tracking-[0.2em] text-ink/45">
                {email ? `Signed in as ${email}` : "Sign in to continue"}
              </p>
              <h1 className="mt-5 font-display text-[clamp(2.6rem,5.6vw,4.6rem)] leading-[0.96] tracking-[-0.02em] sm:text-[5.2rem]">
                Your atelier.
                <br />
                No public front desk.
              </h1>
              <p className="mt-6 max-w-[540px] text-[1.04rem] leading-[1.72] text-ink/64 sm:text-[1.12rem]">
                LAMSA is a private invitation studio for one owner. There’s no public
                landing page, no open gallery, and no front-door marketing. The only
                door is the one you open from here.
              </p>
            </div>
          </Reveal>

          <Reveal delay={0.2}>
            <div className="mt-10 flex flex-col gap-4 sm:flex-row sm:gap-6">
              <Button
                asChild
                size="lg"
                className="h-12 px-7 sm:px-9"
                onClick={() => {
                  if (lock && pin !== lock) {
                    setPinError("Enter the studio PIN first.");
                    return;
                  }
                  if (lock) {
                    window.location.href = STUDIO_HREF;
                    return;
                  }
                  setLeaving(true);
                  window.location.href = "/auth?returnTo=" + encodeURIComponent(STUDIO_HREF);
                }}
              >
                <span className="flex items-center gap-2.5">
                  {lock ? (
                    <Lock className="size-4" />
                  ) : (
                    <Mail className="size-4" />
                  )}
                  {lock ? "Open the studio" : "Sign in to the studio"}
                  <ArrowRight className="size-4" />
                </span>
              </Button>
              <p className="text-[0.7rem] uppercase tracking-[0.16em] text-ink/40">
                {lock
                  ? "Your studio is private. Only this PIN opens it."
                  : "One verified email. A private studio behind it."}
              </p>
            </div>
          </Reveal>

          {pinError && (
            <Reveal>
              <div className="mt-5 flex items-center gap-2 rounded-md border border-[var(--red)]/40 bg-[var(--red)]/[0.05] px-3 py-2 text-[0.72rem] uppercase tracking-[0.1em] text-[var(--red)]">
                <Wrench className="size-3.5 shrink-0" />
                {pinError}
              </div>
            </Reveal>
          )}

          <Reveal delay={0.28}>
            <div className="mt-12 border-t border-ink/10 pt-8">
              <p className="font-meta text-[0.58rem] uppercase tracking-[0.2em] text-ink/40">
                What you get inside
              </p>
              <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {[
                  {
                    label: "Your invitation studio",
                    copy: "Design, compose, and publish from one private workspace — not a public homepage.",
                  },
                  {
                    label: "Your invitations",
                    copy: "A private gallery of the invitations you actually created, edited, and published.",
                  },
                  {
                    label: "A private door for guests",
                    copy: "Guests reach invitations only through the links you send them, not through a public listing.",
                  },
                ].map((item) => (
                  <div
                    key={item.label}
                    className="rounded-md border border-ink/12 bg-[var(--paper-light)]/40 p-4"
                  >
                    <p className="font-ui text-[1.02rem] font-semibold leading-snug">
                      {item.label}
                    </p>
                    <p className="mt-1.5 text-[0.82rem] leading-relaxed text-ink/58">
                      {item.copy}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </Reveal>

          {lock && (
            <Reveal delay={0.34}>
              <div className="mt-8 rounded-md border border-ink/12 bg-[var(--paper-light)]/40 p-4">
                <p className="font-meta text-[0.58rem] uppercase tracking-[0.2em] text-ink/40">
                  Studio access
                </p>
                <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-3">
                  <input
                    type="password"
                    inputMode="numeric"
                    maxLength={6}
                    value={pin}
                    onChange={(event) => {
                      setPin(event.target.value.replace(/\D/g, ""));
                      setPinError("");
                    }}
                    onKeyDown={handlePinKeyDown}
                    onPaste={handlePinPaste}
                    aria-label="Studio PIN"
                    className="h-10 w-28 rounded-md border border-ink/20 bg-[var(--paper)] px-3 text-center text-[1rem] uppercase tracking-[0.2em] font-mono outline-none focus:border-[var(--red)] focus:ring-1 focus:ring-[var(--red)]/30"
                    placeholder="••••••"
                  />
                  <Button
                    type="button"
                    size="sm"
                    className="h-10 px-4"
                    onClick={() => {
                      if (lock && pin === lock) {
                        window.location.href = STUDIO_HREF;
                      } else {
                        setPinError("Enter the correct studio PIN.");
                      }
                    }}
                  >
                    Open
                  </Button>
                </div>
              </div>
            </Reveal>
          )}
        </div>
      </main>

      <footer className="relative z-10 mt-24 border-t border-ink/10 pt-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <Wordmark tone="ink" className="h-[18px]" />
            <span className="text-[0.62rem] uppercase tracking-[0.2em] text-ink/40">
              Private invitation studio
            </span>
          </div>
          <p className="text-[0.62rem] uppercase tracking-[0.18em] text-ink/40">
            {lock
              ? "Signed in with a private studio PIN"
              : "Sign in to open the studio"}
          </p>
        </div>
      </footer>

      {leaving && <span className="sr-only" aria-live="polite">Opening the studio…</span>}
    </div>
  );
}
