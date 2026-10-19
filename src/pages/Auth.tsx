import { BrandLink, Wordmark } from "@/components/brand/Wordmark";
import { InvitationCanvas } from "@/components/invitation/InvitationCanvas";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import { useAuth } from "@/hooks/use-auth";
import { draftFromTemplate } from "@/lib/invitation";
import { ArrowLeft, ArrowRight, Loader2, Mail } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { toast } from "sonner";

interface AuthProps {
  redirectAfterAuth?: string;
}

function resolveRedirectAfterAuth(
  returnTo: string | null,
  fallback = "/dashboard",
) {
  if (returnTo?.startsWith("/") && !returnTo.startsWith("//")) {
    return returnTo;
  }
  return fallback;
}

function Auth({ redirectAfterAuth }: AuthProps = {}) {
  const { isLoading: authLoading, isAuthenticated, signIn } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirect = resolveRedirectAfterAuth(
    searchParams.get("returnTo"),
    redirectAfterAuth,
  );

  const [step, setStep] = useState<"email" | "code">("email");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const preview = useMemo(() => draftFromTemplate("the-vow"), []);

  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      navigate(redirect, { replace: true });
    }
  }, [authLoading, isAuthenticated, navigate, redirect]);

  async function requestCode(formData: FormData) {
    await signIn("email-otp", formData);
  }

  const handleEmailSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const submittedEmail = String(formData.get("email") ?? "").trim();
    setIsLoading(true);
    setError(null);
    try {
      await requestCode(formData);
      setEmail(submittedEmail);
      setOtp("");
      setStep("code");
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "We could not send your code. Please try again.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleCodeSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (otp.length !== 6) return;
    setIsLoading(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.set("email", email);
      formData.set("code", otp);
      await signIn("email-otp", formData);
      navigate(redirect, { replace: true });
    } catch {
      setError("That code was not right. Check the six digits and try again.");
      setOtp("");
      setIsLoading(false);
    }
  };

  const handleResend = async () => {
    if (!email) return;
    setIsResending(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.set("email", email);
      await requestCode(formData);
      toast.success("A fresh code is on its way.", {
        description: `Sent to ${email}`,
      });
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "We could not resend the code. Please try again.",
      );
    } finally {
      setIsResending(false);
    }
  };

  if (authLoading && !isAuthenticated) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="size-5 animate-spin text-muted-foreground" />
      </main>
    );
  }

  return (
    <div className="relative min-h-screen bg-background lg:grid lg:grid-cols-[0.92fr_1.08fr]">
      {/* Editorial panel */}
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
          <p className="eyebrow text-[#f5efe2]/40">The LAMSA studio</p>
          <h2 className="mt-6 max-w-[26rem] font-display text-[clamp(2.8rem,4vw,4rem)] leading-[0.94] tracking-[-0.025em]">
            The moment begins
            <span className="block italic text-[#c6b692]">with a name.</span>
          </h2>
          <p className="mt-6 max-w-[23rem] text-[0.85rem] leading-[1.85] text-[#f5efe2]/55">
            Sign in with your email — no password, nothing to remember. Your
            invitations, guests, and private links stay yours.
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

      {/* Form panel */}
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
            onClick={() => navigate("/")}
            className="flex items-center gap-2 text-[0.62rem] uppercase tracking-[0.2em] text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="size-3.5" />
            Back
          </button>
        </header>

        <div className="relative flex flex-1 items-center justify-center px-5 py-10 sm:px-8">
          <div className="w-full max-w-[390px]">
            {step === "email" ? (
              <div>
                <p className="eyebrow text-muted-foreground">Sign in or begin</p>
                <h1 className="mt-4 font-display text-[clamp(2.8rem,7vw,3.6rem)] leading-[0.96] tracking-[-0.02em]">
                  Enter the studio.
                </h1>
                <p className="mt-5 text-[0.86rem] leading-[1.8] text-muted-foreground">
                  We&apos;ll email you a six-digit code. The same code signs you
                  in, creates your account, or restores access if you&apos;ve
                  been away.
                </p>

                <form onSubmit={handleEmailSubmit} className="mt-9">
                  <label
                    htmlFor="email"
                    className="eyebrow block text-[0.58rem] text-foreground/60"
                  >
                    Email address
                  </label>
                  <div className="relative mt-2.5">
                    <Mail className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground/70" />
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      inputMode="email"
                      autoComplete="email"
                      placeholder="you@example.com"
                      required
                      disabled={isLoading}
                      className="h-12 rounded-none border-border bg-transparent pl-10 text-[0.88rem] shadow-none focus-visible:ring-1 focus-visible:ring-foreground/30"
                    />
                  </div>

                  {error && (
                    <p
                      role="alert"
                      className="mt-3 border-l-2 border-destructive/60 pl-3 text-[0.78rem] leading-relaxed text-destructive"
                    >
                      {error}
                    </p>
                  )}

                  <Button
                    type="submit"
                    size="lg"
                    disabled={isLoading}
                    className="mt-6 h-12 w-full rounded-none bg-primary text-[0.66rem] uppercase tracking-[0.24em]"
                  >
                    {isLoading ? (
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
                </form>

                <p className="mt-5 text-[0.68rem] leading-relaxed text-muted-foreground/70">
                  By continuing you agree to keep your invitations and guest
                  names private. Codes expire after 15 minutes.
                </p>
              </div>
            ) : (
              <div>
                <button
                  type="button"
                  onClick={() => {
                    setStep("email");
                    setError(null);
                    setOtp("");
                  }}
                  className="mb-7 flex items-center gap-2 text-[0.62rem] uppercase tracking-[0.2em] text-muted-foreground transition-colors hover:text-foreground"
                >
                  <ArrowLeft className="size-3.5" />
                  Back
                </button>
                <p className="eyebrow text-muted-foreground">Check your inbox</p>
                <h1 className="mt-4 font-display text-[clamp(2.6rem,7vw,3.4rem)] leading-[0.98] tracking-[-0.02em]">
                  Six quiet digits.
                </h1>
                <p className="mt-5 text-[0.86rem] leading-[1.8] text-muted-foreground">
                  We sent a code to{" "}
                  <span className="text-foreground">{email}</span>. Enter it
                  below to enter your studio.
                </p>

                <form onSubmit={handleCodeSubmit} className="mt-9">
                  <div className="flex justify-start">
                    <InputOTP
                      value={otp}
                      onChange={setOtp}
                      maxLength={6}
                      disabled={isLoading}
                      autoFocus
                      aria-label="Six-digit verification code"
                      onKeyDown={(event) => {
                        if (
                          event.key === "Enter" &&
                          otp.length === 6 &&
                          !isLoading
                        ) {
                          const form = (event.target as HTMLElement).closest(
                            "form",
                          );
                          form?.requestSubmit();
                        }
                      }}
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

                  {error && (
                    <p
                      role="alert"
                      className="mt-4 border-l-2 border-destructive/60 pl-3 text-[0.78rem] leading-relaxed text-destructive"
                    >
                      {error}
                    </p>
                  )}

                  <Button
                    type="submit"
                    size="lg"
                    disabled={isLoading || otp.length !== 6}
                    className="mt-7 h-12 w-full rounded-none bg-primary text-[0.66rem] uppercase tracking-[0.24em]"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="size-4 animate-spin" />
                        Verifying
                      </>
                    ) : (
                      <>
                        Enter the studio
                        <ArrowRight className="size-4" />
                      </>
                    )}
                  </Button>
                </form>

                <div className="mt-6 flex flex-wrap items-center justify-between gap-3 text-[0.7rem] text-muted-foreground">
                  <span>Didn&apos;t receive it?</span>
                  <button
                    type="button"
                    onClick={handleResend}
                    disabled={isResending}
                    className="inline-flex items-center gap-1.5 text-[0.64rem] uppercase tracking-[0.16em] text-foreground underline-offset-4 hover:underline disabled:opacity-50"
                  >
                    {isResending && (
                      <Loader2 className="size-3 animate-spin" />
                    )}
                    Resend code
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        <footer className="relative px-5 pb-7 text-[0.6rem] uppercase tracking-[0.2em] text-muted-foreground/60 sm:px-8 lg:px-12">
          <div className="flex items-center gap-3">
            <span className="h-px w-8 bg-border" />
            <Wordmark className="text-[0.62rem] tracking-[0.36em] text-muted-foreground/60" />
            <span>· Secure email access</span>
          </div>
        </footer>
      </main>
    </div>
  );
}

export default function AuthPage(props: AuthProps) {
  return <Auth {...props} />;
}
