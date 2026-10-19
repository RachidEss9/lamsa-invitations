import { StudioShell } from "@/components/auth/StudioShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import { authErrorMessage, normalizeEmail } from "@/lib/studio-auth";
import { useAuthActions } from "@convex-dev/auth/react";
import {
  ArrowLeft,
  ArrowRight,
  Loader2,
  Mail,
  ShieldCheck,
} from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { REGEXP_ONLY_DIGITS } from "input-otp";

type Mode = "first" | "verify" | "recover" | "migrate";

const COPY: Record<
  Mode,
  { step: string; title: string; accent: string; description: ReactNode }
> = {
  first: {
    step: "First use · Email",
    title: "Begin with",
    accent: "your email.",
    description:
      "We'll send a six-digit code once. After that, your own PIN opens the studio — no email needed every time.",
  },
  verify: {
    step: "One more check",
    title: "Confirm",
    accent: "your email.",
    description:
      "Verify your email once so your invitations, guests, and share links belong to you alone.",
  },
  recover: {
    step: "Recovery · Email",
    title: "Reset your",
    accent: "PIN.",
    description:
      "Confirm your email and you can choose a new six-digit PIN. Your invitations stay exactly where they are.",
  },
  migrate: {
    step: "One small step · Email",
    title: "Carry your",
    accent: "studio with you.",
    description:
      "Confirm your email to protect your work. Any invitations you've already started will move with you, untouched.",
  },
};

export function EmailVerification({
  initialEmail = "",
  mode,
  onVerified,
  onBack,
}: {
  initialEmail?: string;
  mode: Mode;
  onVerified: (email: string) => void;
  onBack?: () => void;
}) {
  const { signIn } = useAuthActions();
  const [step, setStep] = useState<"email" | "code">("email");
  const [email, setEmail] = useState(normalizeEmail(initialEmail));
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);

  const copy = COPY[mode];

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = window.setTimeout(
      () => setCooldown((value) => value - 1),
      1000,
    );
    return () => window.clearTimeout(timer);
  }, [cooldown]);

  async function sendCode(rawEmail: string) {
    const target = normalizeEmail(rawEmail);
    if (!target.includes("@")) {
      throw new Error("Enter a valid email address.");
    }
    const data = new FormData();
    data.set("email", target);
    await signIn("email-otp", data);
    setEmail(target);
    setStep("code");
    setCode("");
    setCooldown(30);
  }

  const handleEmailSubmit = async (
    event: React.FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await sendCode(email);
    } catch (caught) {
      setError(authErrorMessage(caught));
    } finally {
      setBusy(false);
    }
  };

  const handleCodeSubmit = async (
    event: React.FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();
    if (code.length !== 6 || busy) return;
    setBusy(true);
    setError(null);
    try {
      await signIn("email-otp", { email, code });
      onVerified(email);
    } catch (caught) {
      const message = authErrorMessage(caught);
      setError(
        /code/i.test(message) && /verif|invalid|wrong/i.test(message)
          ? "That code wasn't accepted. Check the six digits or request a new code."
          : message,
      );
      setCode("");
      setBusy(false);
    }
  };

  const handleResend = async () => {
    if (cooldown > 0 || busy) return;
    setBusy(true);
    setError(null);
    try {
      await sendCode(email);
    } catch (caught) {
      setError(authErrorMessage(caught));
    } finally {
      setBusy(false);
    }
  };

  const handleBack = () => {
    if (step === "code") {
      setStep("email");
      setCode("");
      setError(null);
      return;
    }
    onBack?.();
  };

  return (
    <StudioShell
      step={step === "email" ? copy.step : "Enter your code"}
      title={step === "email" ? copy.title : "Six quiet"}
      accent={step === "email" ? copy.accent : "digits."}
      description={
        step === "email" ? (
          copy.description
        ) : (
          <>
            We sent a six-digit code to{" "}
            <span className="text-foreground">{email}</span>. It expires in
            fifteen minutes.
          </>
        )
      }
      onBack={onBack || step === "code" ? handleBack : undefined}
      backLabel={step === "code" ? "Change email" : "Back"}
    >
      {step === "email" ? (
        <form onSubmit={handleEmailSubmit}>
          <label
            htmlFor="studio-email"
            className="eyebrow block text-[0.58rem] text-foreground/60"
          >
            Email address
          </label>
          <div className="relative mt-2.5">
            <Mail className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground/70" />
            <Input
              id="studio-email"
              name="email"
              type="email"
              inputMode="email"
              autoComplete="email"
              autoFocus
              placeholder="you@example.com"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              disabled={busy}
              className="h-12 rounded-none border-border bg-transparent pl-10 text-[0.88rem] shadow-none focus-visible:ring-1 focus-visible:ring-foreground/30"
            />
          </div>

          {error ? (
            <p
              role="alert"
              className="mt-3 border-l-2 border-destructive/60 pl-3 text-[0.78rem] leading-relaxed text-destructive"
            >
              {error}
            </p>
          ) : null}

          <Button
            type="submit"
            size="lg"
            disabled={busy}
            className="mt-6 h-12 w-full rounded-none bg-primary text-[0.66rem] uppercase tracking-[0.24em]"
          >
            {busy ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Sending your code
              </>
            ) : (
              <>
                Continue with email
                <ArrowRight className="size-4" />
              </>
            )}
          </Button>

          <p className="mt-5 flex items-start gap-2 text-[0.68rem] leading-relaxed text-muted-foreground/75">
            <ShieldCheck className="mt-0.5 size-3.5 shrink-0 text-[var(--olive)]" />
            One verification. No passwords. Codes expire after fifteen minutes.
          </p>
        </form>
      ) : (
        <form onSubmit={handleCodeSubmit}>
          <div className="flex justify-start">
            <InputOTP
              value={code}
              onChange={setCode}
              maxLength={6}
              pattern={REGEXP_ONLY_DIGITS}
              inputMode="numeric"
              autoComplete="one-time-code"
              disabled={busy}
              autoFocus
              aria-label="Six-digit email verification code"
            >
              <InputOTPGroup className="gap-1.5 sm:gap-2">
                {Array.from({ length: 6 }).map((_, index) => (
                  <InputOTPSlot
                    key={index}
                    index={index}
                    className="size-10 rounded-none border border-border text-base first:rounded-none last:rounded-none sm:size-12"
                  />
                ))}
              </InputOTPGroup>
            </InputOTP>
          </div>

          {error ? (
            <p
              role="alert"
              className="mt-4 border-l-2 border-destructive/60 pl-3 text-[0.78rem] leading-relaxed text-destructive"
            >
              {error}
            </p>
          ) : null}

          <Button
            type="submit"
            size="lg"
            disabled={busy || code.length !== 6}
            className="mt-7 h-12 w-full rounded-none bg-primary text-[0.66rem] uppercase tracking-[0.24em]"
          >
            {busy ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Verifying
              </>
            ) : (
              <>
                Verify email
                <ArrowRight className="size-4" />
              </>
            )}
          </Button>

          <div className="mt-6 flex flex-wrap items-center justify-between gap-3 text-[0.7rem] text-muted-foreground">
            <span>Didn&apos;t receive it?</span>
            <button
              type="button"
              onClick={() => void handleResend()}
              disabled={busy || cooldown > 0}
              className="inline-flex items-center gap-1.5 text-[0.64rem] uppercase tracking-[0.16em] text-foreground underline-offset-4 hover:underline disabled:opacity-50"
            >
              {cooldown > 0 ? `Resend in ${cooldown}s` : "Resend code"}
            </button>
          </div>

          <button
            type="button"
            onClick={handleBack}
            className="mt-8 flex items-center gap-2 text-[0.62rem] uppercase tracking-[0.18em] text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="size-3.5" />
            Use a different email
          </button>
        </form>
      )}
    </StudioShell>
  );
}
