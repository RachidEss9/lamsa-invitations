import { StudioShell } from "@/components/auth/StudioShell";
import { Button } from "@/components/ui/button";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import { authErrorMessage, isSixDigitPin } from "@/lib/studio-auth";
import { useAuthActions } from "@convex-dev/auth/react";
import { REGEXP_ONLY_DIGITS } from "input-otp";
import { ArrowRight, Loader2, ShieldCheck } from "lucide-react";
import { useState } from "react";

export function PinUnlock({
  email,
  onUnlocked,
  onUseEmail,
}: {
  email: string;
  onUnlocked: () => void;
  onUseEmail: () => void;
}) {
  const { signIn } = useAuthActions();
  const [pin, setPin] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (busy || !isSixDigitPin(pin)) return;

    setBusy(true);
    setError(null);
    try {
      await signIn("pin", { email, pin });
      onUnlocked();
    } catch (caught) {
      setError(authErrorMessage(caught));
      setPin("");
      setBusy(false);
    }
  };

  return (
    <StudioShell
      step="Welcome back"
      title="Open your"
      accent="studio."
      description={
        <>
          Enter the six-digit PIN for{" "}
          <span className="break-all text-foreground">{email}</span>.
        </>
      }
    >
      <form onSubmit={handleSubmit}>
        <div className="flex justify-start">
          <InputOTP
            value={pin}
            onChange={setPin}
            maxLength={6}
            pattern={REGEXP_ONLY_DIGITS}
            inputMode="numeric"
            disabled={busy}
            autoFocus
            aria-label="Six-digit studio PIN"
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
          disabled={busy || !isSixDigitPin(pin)}
          className="mt-7 h-12 w-full rounded-none bg-primary text-[0.66rem] uppercase tracking-[0.24em]"
        >
          {busy ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              Opening
            </>
          ) : (
            <>
              Open studio
              <ArrowRight className="size-4" />
            </>
          )}
        </Button>

        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 text-[0.68rem] text-muted-foreground">
          <button
            type="button"
            onClick={onUseEmail}
            className="text-[0.62rem] uppercase tracking-[0.16em] text-foreground underline-offset-4 hover:underline"
          >
            Forgot PIN?
          </button>
          <button
            type="button"
            onClick={onUseEmail}
            className="text-[0.62rem] uppercase tracking-[0.16em] text-muted-foreground underline-offset-4 hover:underline"
          >
            Use email instead
          </button>
        </div>

        <p className="mt-7 flex items-start gap-2 text-[0.68rem] leading-relaxed text-muted-foreground/70">
          <ShieldCheck className="mt-0.5 size-3.5 shrink-0 text-[var(--olive)]" />
          Checked securely on the server. After five wrong attempts the PIN
          rests for fifteen minutes.
        </p>
      </form>
    </StudioShell>
  );
}
