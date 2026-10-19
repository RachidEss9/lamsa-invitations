import { StudioShell } from "@/components/auth/StudioShell";
import { Button } from "@/components/ui/button";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import {
  authErrorMessage,
  isSixDigitPin,
  isWeakPin,
} from "@/lib/studio-auth";
import { REGEXP_ONLY_DIGITS } from "input-otp";
import { ArrowRight, Loader2, LockKeyhole, ShieldCheck } from "lucide-react";
import { useState } from "react";

export function PinSetup({
  mode,
  email,
  onSubmit,
  onVerifyAgain,
}: {
  mode: "create" | "reset";
  email: string;
  onSubmit: (pin: string) => Promise<void>;
  onVerifyAgain: () => void;
}) {
  const [pin, setPin] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const ready = isSixDigitPin(pin) && isSixDigitPin(confirm);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (busy || !ready) return;
    if (pin !== confirm) {
      setError("Both PINs need to match.");
      return;
    }
    if (isWeakPin(pin)) {
      setError("Choose a less predictable PIN.");
      return;
    }

    setBusy(true);
    setError(null);
    try {
      await onSubmit(pin);
    } catch (caught) {
      setError(authErrorMessage(caught));
      setBusy(false);
    }
  };

  return (
    <StudioShell
      step={mode === "reset" ? "Recovery · New PIN" : "First use · PIN"}
      title={mode === "reset" ? "Choose a new" : "A key only"}
      accent={mode === "reset" ? "six-digit key." : "you know."}
      description={
        <>
          {mode === "reset"
            ? "Your email is confirmed. Set a new PIN for everyday access to "
            : "Choose six digits for everyday access to "}
          <span className="text-foreground">{email}</span>. It is stored as a
          salted hash and checked on the server — never in the browser alone.
        </>
      }
    >
      <form onSubmit={handleSubmit}>
        <div>
          <p className="eyebrow text-[0.58rem] text-foreground/60">
            Six-digit PIN
          </p>
          <div className="mt-2.5 flex justify-start">
            <InputOTP
              value={pin}
              onChange={setPin}
              maxLength={6}
              pattern={REGEXP_ONLY_DIGITS}
              inputMode="numeric"
              disabled={busy}
              autoFocus
              aria-label="Choose a six-digit PIN"
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
        </div>

        <div className="mt-5">
          <p className="eyebrow text-[0.58rem] text-foreground/60">
            Confirm PIN
          </p>
          <div className="mt-2.5 flex justify-start">
            <InputOTP
              value={confirm}
              onChange={setConfirm}
              maxLength={6}
              pattern={REGEXP_ONLY_DIGITS}
              inputMode="numeric"
              disabled={busy}
              aria-label="Confirm your six-digit PIN"
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
        </div>

        {error ? (
          <div className="mt-4">
            <p
              role="alert"
              className="border-l-2 border-destructive/60 pl-3 text-[0.78rem] leading-relaxed text-destructive"
            >
              {error}
            </p>
            <button
              type="button"
              onClick={onVerifyAgain}
              className="mt-2 text-[0.62rem] uppercase tracking-[0.16em] text-foreground underline-offset-4 hover:underline"
            >
              Verify my email again
            </button>
          </div>
        ) : null}

        <Button
          type="submit"
          size="lg"
          disabled={busy || !ready}
          className="mt-7 h-12 w-full rounded-none bg-primary text-[0.66rem] uppercase tracking-[0.24em]"
        >
          {busy ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              Saving your PIN
            </>
          ) : (
            <>
              <LockKeyhole className="size-4" />
              {mode === "reset" ? "Set new PIN" : "Set my PIN"}
              <ArrowRight className="size-4" />
            </>
          )}
        </Button>

        <div className="mt-6 space-y-2 text-[0.68rem] leading-relaxed text-muted-foreground/75">
          <p className="flex items-start gap-2">
            <ShieldCheck className="mt-0.5 size-3.5 shrink-0 text-[var(--olive)]" />
            Never share this PIN. Five wrong attempts pause it for fifteen
            minutes.
          </p>
          <p className="flex items-start gap-2">
            <ShieldCheck className="mt-0.5 size-3.5 shrink-0 text-[var(--olive)]" />
            You can always recover access with your email.
          </p>
        </div>
      </form>
    </StudioShell>
  );
}
