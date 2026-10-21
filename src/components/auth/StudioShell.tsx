import { BrandLink, Wordmark } from "@/components/brand/Wordmark";
import { ArrowLeft } from "lucide-react";
import type { ReactNode } from "react";
import { useNavigate } from "react-router";

/** The studio opens in three sittings: email, code, PIN. */
function stepIndex(step: string): number {
  if (/pin|welcome back/i.test(step)) return 3;
  if (/code|digit/i.test(step)) return 2;
  return 1;
}

const STEPS = [
  { n: "01", label: "Email" },
  { n: "02", label: "Code" },
  { n: "03", label: "PIN" },
];

export function StudioShell({
  step,
  title,
  accent,
  description,
  children,
  onBack,
  backLabel = "Back",
}: {
  step: string;
  title: string;
  accent?: string;
  description: ReactNode;
  children: ReactNode;
  onBack?: () => void;
  backLabel?: string;
}) {
  const navigate = useNavigate();
  const current = stepIndex(step);

  return (
    <div className="relative flex min-h-screen flex-col bg-background">
      <div
        aria-hidden
        className="paper-grain pointer-events-none fixed inset-0 opacity-[0.035]"
      />
      <div
        aria-hidden
        className="pointer-events-none fixed -bottom-[7vw] -right-[3vw] select-none font-display text-[46vw] leading-none text-ink/[0.035]"
      >
        {String(current).padStart(2, "0")}
      </div>

      <div className="relative z-10 border-b border-ink/15 bg-[var(--paper-deep)]/60">
        <div className="mx-auto flex w-full max-w-[1180px] items-center justify-between px-5 py-2 font-meta text-[0.54rem] uppercase tracking-[0.16em] text-ink/62 sm:px-8">
          <span>Private studio</span>
          <span className="hidden sm:inline">
            Invitations, kept to one account
          </span>
          <span>Folio {String(current).padStart(2, "0")} / 03</span>
        </div>
      </div>

      <header className="relative z-10 border-b border-ink/15">
        <div className="mx-auto flex h-[72px] w-full max-w-[1180px] items-center justify-between px-5 sm:px-8">
          <BrandLink />
          <button
            type="button"
            onClick={onBack ?? (() => navigate("/"))}
            className="flex items-center gap-2 text-[0.64rem] uppercase tracking-[0.14em] text-ink/68 transition-colors hover:text-ink"
          >
            <ArrowLeft className="size-3.5" />
            {onBack ? backLabel : "Back to the atelier"}
          </button>
        </div>
      </header>

      <main className="relative z-10 flex flex-1 items-stretch">
        <div className="mx-auto grid w-full max-w-[1180px] flex-1 gap-12 px-5 py-10 sm:px-8 sm:py-14 lg:grid-cols-[0.86fr_1.14fr] lg:gap-20 lg:py-16">
          {/* Left: the ledger, the promise, the specimen. */}
          <aside className="hidden flex-col justify-between border-r border-ink/15 pr-10 lg:flex">
            <div>
              <p className="eyebrow text-ink/56">Three sittings</p>
              <ol className="mt-5">
                {STEPS.map((item, index) => {
                  const active = index + 1 === current;
                  const done = index + 1 < current;
                  return (
                    <li
                      key={item.n}
                      className="flex items-baseline gap-4 border-t border-ink/12 py-3 first:border-t-0"
                    >
                      <span
                        className={
                          active
                            ? "font-meta text-[0.6rem] text-[var(--red)]"
                            : "font-meta text-[0.6rem] text-ink/25"
                        }
                      >
                        {item.n}
                      </span>
                      <span
                        className={
                          active
                            ? "font-display text-[1.5rem] leading-none text-ink"
                            : done
                              ? "font-display text-[1.5rem] leading-none text-ink/52"
                              : "font-display text-[1.5rem] leading-none text-ink/25"
                        }
                      >
                        {item.label}
                      </span>
                      {active && (
                        <span className="ml-auto font-meta text-[0.5rem] uppercase tracking-[0.14em] text-[var(--red)]">
                          You are here
                        </span>
                      )}
                    </li>
                  );
                })}
              </ol>

              <div className="mt-10 max-w-[21rem] border-t border-ink/15 pt-6">
                <p className="eyebrow text-ink/56">Why a PIN</p>
                <p className="mt-3 text-[0.84rem] leading-[1.8] text-ink/72">
                  Your email is confirmed once. After that the studio opens to six
                  digits only you know — nothing to reset, nothing to remember
                  beyond that.
                </p>
              </div>
            </div>

            <div className="mt-12">
              <div className="flex items-baseline justify-between border-b border-ink/20 pb-1 font-meta text-[0.5rem] uppercase tracking-[0.12em] text-ink/56">
                <span>Kept private</span>
                <span>No. 03</span>
              </div>
              <p className="mt-5 font-display text-[clamp(1.9rem,2.6vw,2.6rem)] leading-[0.98] tracking-[-0.01em]">
                Guest names,
                <br />
                replies, and
                <br />
                share links stay
                <br />
                inside this account.
              </p>
              <div className="mt-6 flex items-center gap-2">
                <Wordmark className="text-[0.82rem] tracking-[0.2em] text-ink/62" />
                <span className="font-meta text-[0.5rem] uppercase tracking-[0.12em] text-ink/52">
                  Atelier rules, since 2026
                </span>
              </div>
            </div>
          </aside>

          {/* Right: the sheet. */}
          <div className="w-full max-w-[460px] lg:max-w-none lg:pt-4">
            <div className="flex items-baseline gap-3">
              <span className="font-meta text-[0.58rem] text-[var(--red)]">
                {String(current).padStart(2, "0")}
              </span>
              <span className="h-px w-6 bg-ink/30" />
              <span className="eyebrow text-ink/60">{step}</span>
            </div>

            <h1 className="mt-5 font-display text-[clamp(2.6rem,6vw,3.7rem)] leading-[0.94] tracking-[-0.015em]">
              {title}
              {accent ? (
                <span className="text-[var(--red)]"> {accent}</span>
              ) : null}
            </h1>

            <div className="mt-4 max-w-[27rem] text-[0.88rem] leading-[1.75] text-ink/72">
              {description}
            </div>

            <div className="mt-8 max-w-[27rem] border-t border-ink/15 pt-8">
              {children}
            </div>
          </div>
        </div>
      </main>

      <footer className="relative z-10 border-t border-ink/15">
        <div className="mx-auto flex w-full max-w-[1180px] items-center justify-between px-5 py-4 font-meta text-[0.52rem] uppercase tracking-[0.14em] text-ink/56 sm:px-8">
          <span className="flex items-center gap-2">
            <span className="size-[3px] bg-[var(--red)]" />
            Private by design
          </span>
          <span className="hidden sm:inline">Checked on the server</span>
          <span>© 2026 LAMSA</span>
        </div>
      </footer>
    </div>
  );
}
