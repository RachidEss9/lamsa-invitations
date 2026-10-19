import { BrandLink, Wordmark } from "@/components/brand/Wordmark";
import { InvitationCanvas } from "@/components/invitation/InvitationCanvas";
import { draftFromTemplate } from "@/lib/invitation";
import { ArrowLeft } from "lucide-react";
import { useMemo, type ReactNode } from "react";
import { useNavigate } from "react-router";

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
  const preview = useMemo(() => draftFromTemplate("the-vow"), []);

  return (
    <div className="relative min-h-screen bg-background lg:grid lg:grid-cols-[0.92fr_1.08fr]">
      <aside className="relative hidden overflow-hidden bg-[#26271f] text-[#f5efe2] lg:flex lg:flex-col lg:justify-between">
        <div
          aria-hidden
          className="paper-grain absolute inset-0 opacity-[0.07] mix-blend-screen"
        />
        <div
          aria-hidden
          className="absolute -left-28 top-[18%] size-[460px] rounded-full border border-[#c6b692]/10"
        />
        <div
          aria-hidden
          className="absolute -left-10 top-[26%] size-[260px] rounded-full border border-[#c6b692]/10"
        />
        <div className="relative px-12 pt-10">
          <BrandLink tone="paper" />
        </div>

        <div className="relative px-12">
          <p className="eyebrow text-[#f5efe2]/40">A studio held quietly</p>
          <h2 className="mt-6 max-w-[26rem] font-display text-[clamp(2.8rem,4vw,4rem)] leading-[0.94] tracking-[-0.025em]">
            One email.
            <span className="block italic text-[#c6b692]">
              One six-digit key.
            </span>
          </h2>
          <p className="mt-6 max-w-[23rem] text-[0.85rem] leading-[1.85] text-[#f5efe2]/55">
            Verify once, then open your invitations with a PIN only you know.
            Your guest names and share links stay private to this account.
          </p>
        </div>

        <div className="relative flex items-end justify-between px-12 pb-10">
          <div className="w-[190px] rotate-[-5deg] shadow-[0_30px_60px_-30px_rgba(0,0,0,0.7)]">
            <InvitationCanvas content={preview} />
          </div>
          <p className="max-w-[10rem] text-[0.6rem] uppercase leading-relaxed tracking-[0.2em] text-[#f5efe2]/30">
            Invitations,
            <br />
            considered.
          </p>
        </div>
      </aside>

      <main className="relative flex min-h-screen flex-col">
        <div
          aria-hidden
          className="paper-grain pointer-events-none absolute inset-0 opacity-[0.03]"
        />
        <header className="relative flex items-center justify-between px-5 py-6 sm:px-8 lg:px-12">
          <div className="lg:invisible">
            <BrandLink />
          </div>
          <button
            type="button"
            onClick={onBack ?? (() => navigate("/"))}
            className="flex items-center gap-2 text-[0.62rem] uppercase tracking-[0.2em] text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="size-3.5" />
            {onBack ? backLabel : "Back"}
          </button>
        </header>

        <div className="relative flex flex-1 items-center justify-center px-5 py-10 sm:px-8">
          <div className="w-full max-w-[400px]">
            <p className="eyebrow text-muted-foreground">{step}</p>
            <h1 className="mt-4 font-display text-[clamp(2.7rem,7vw,3.5rem)] leading-[0.96] tracking-[-0.02em]">
              {title}
              {accent ? (
                <span className="block italic text-[var(--olive)]">
                  {accent}
                </span>
              ) : null}
            </h1>
            <div className="mt-5 text-[0.86rem] leading-[1.8] text-muted-foreground">
              {description}
            </div>
            <div className="mt-9">{children}</div>
          </div>
        </div>

        <footer className="relative px-5 pb-7 text-[0.6rem] uppercase tracking-[0.2em] text-muted-foreground/60 sm:px-8 lg:px-12">
          <div className="flex items-center gap-3">
            <span className="h-px w-8 bg-border" />
            <Wordmark className="text-[0.62rem] tracking-[0.36em] text-muted-foreground/60" />
            <span>· Private by design</span>
          </div>
        </footer>
      </main>
    </div>
  );
}
