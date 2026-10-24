import { EmailVerification } from "@/components/auth/EmailVerification";
import { PinSetup } from "@/components/auth/PinSetup";
import { PinUnlock } from "@/components/auth/PinUnlock";
import {
  StudioSessionContext,
  type StudioSessionValue,
} from "@/components/auth/studio-context";
import { api } from "@/convex/_generated/api";
import { brand } from "@/lib/brand";
import type { Id } from "@/convex/_generated/dataModel";
import {
  clearPendingClaim,
  clearUnlocked,
  markUnlocked,
  normalizeEmail,
  readEmailHint,
  readPendingClaim,
  readUnlockedUser,
  rememberEmail,
  rememberPendingClaim,
  type PendingClaim,
} from "@/lib/studio-auth";
import { useConvexAuth, useMutation, useQuery } from "convex/react";
import { Loader2 } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { toast } from "sonner";

function StudioLoading() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-background">
      <img
        src={brand.logos.lockupCrimson}
        alt={brand.name}
        className="h-[28px] w-auto select-none"
      />
      <span className="mt-4 flex items-center gap-2 font-meta text-[0.52rem] uppercase tracking-[0.16em] text-ink/56">
        <Loader2 className="size-3 animate-spin" />
        Opening the studio
      </span>
    </main>
  );
}

/**
 * Opens the studio with an email verified once and a server-checked PIN for
 * everyday access. Anonymous sessions are only used to carry invitations that
 * were started before this flow existed into the verified account.
 */
export function StudioGate({ children }: { children: ReactNode }) {
  const { isLoading: authLoading, isAuthenticated } = useConvexAuth();
  const user = useQuery(api.users.currentUser);
  const pinStatus = useQuery(api.pin.status);
  const setPin = useMutation(api.pin.setPin);
  const beginClaim = useMutation(api.studio.beginClaim);
  const claimStudio = useMutation(api.studio.claim);

  const [unlockedFor, setUnlockedFor] = useState<string | null>(() =>
    readUnlockedUser(),
  );
  const [emailHint, setEmailHint] = useState<string | null>(() =>
    readEmailHint(),
  );
  const [claim, setClaim] = useState<PendingClaim | null>(() =>
    readPendingClaim(),
  );
  const [justVerified, setJustVerified] = useState(false);
  const [verifiedEmail, setVerifiedEmail] = useState<string | null>(null);
  const [emailOpen, setEmailOpen] = useState(false);
  const [emailMode, setEmailMode] = useState<"recover" | "verify">("verify");
  const [pendingUnlock, setPendingUnlock] = useState(false);
  const [pinSaved, setPinSaved] = useState(false);

  const claimStarted = useRef(false);
  const claimResumed = useRef(false);

  const isAnonymous = user?.isAnonymous === true;
  const hasPin = Boolean(pinStatus?.hasPin) || pinSaved;
  const effectiveUnlockedFor =
    pendingUnlock && user && !user.isAnonymous ? user._id : unlockedFor;

  // Acquire the transfer secret while the anonymous session is still valid.
  useEffect(() => {
    if (!isAuthenticated || !isAnonymous || claim) return;
    if (claimStarted.current) return;
    claimStarted.current = true;
    void beginClaim({})
      .then((result) => {
        if (!result) return;
        const next: PendingClaim = {
          anonymousUserId: result.anonymousUserId,
          token: result.token,
        };
        setClaim(next);
        rememberPendingClaim(next);
      })
      .catch(() => {
        claimStarted.current = false;
      });
  }, [beginClaim, claim, isAnonymous, isAuthenticated]);

  // Write the tab-scoped unlock marker once a PIN sign-in has produced a real
  // session. No React state changes here: the unlocked value is derived.
  useEffect(() => {
    if (!pendingUnlock || !isAuthenticated || !user || user.isAnonymous) {
      return;
    }
    markUnlocked(user._id);
  }, [isAuthenticated, pendingUnlock, user]);

  // Resume a transfer that was interrupted after the PIN was saved.
  useEffect(() => {
    if (
      !claim ||
      !isAuthenticated ||
      !user ||
      user.isAnonymous ||
      !hasPin ||
      justVerified
    ) {
      return;
    }
    if (claim.email && claim.email !== user.email) return;
    if (effectiveUnlockedFor !== user._id) return;
    if (claimResumed.current) return;
    claimResumed.current = true;
    void claimStudio({
      anonymousUserId: claim.anonymousUserId as Id<"users">,
      token: claim.token,
    })
      .then(() => {
        clearPendingClaim();
        setClaim(null);
      })
      .catch(() => {
        claimResumed.current = false;
      });
  }, [
    claim,
    claimStudio,
    effectiveUnlockedFor,
    hasPin,
    isAuthenticated,
    justVerified,
    user,
  ]);

  const handleVerified = (email: string) => {
    const normalized = normalizeEmail(email);
    rememberEmail(normalized);
    setEmailHint(normalized);
    setVerifiedEmail(normalized);
    setJustVerified(true);
    setEmailOpen(false);
    if (claim && !claim.email) {
      const next: PendingClaim = { ...claim, email: normalized };
      setClaim(next);
      rememberPendingClaim(next);
    }
  };

  const handleSetPin = async (pin: string) => {
    if (!user) throw new Error("Please verify your email again.");
    const accountEmail = verifiedEmail ?? user.email;
    await setPin({ pin });

    if (claim && (!claim.email || claim.email === accountEmail)) {
      try {
        await claimStudio({
          anonymousUserId: claim.anonymousUserId as Id<"users">,
          token: claim.token,
        });
        clearPendingClaim();
        setClaim(null);
      } catch {
        // Never block a saved PIN on the transfer. The claim stays in local
        // storage and the resume effect retries it once the studio opens.
        toast.error(
          "Your PIN is saved. Your earlier invitations could not be moved yet; we'll retry when the studio opens.",
        );
      }
    }

    setPinSaved(true);
    setPendingUnlock(true);
    setJustVerified(false);
  };

  const handleLock = () => {
    clearUnlocked();
    setUnlockedFor(null);
    setPendingUnlock(false);
    setJustVerified(false);
    setVerifiedEmail(null);
    setEmailOpen(false);
    setEmailMode("verify");
  };

  if (authLoading || user === undefined) {
    return <StudioLoading />;
  }

  if (!isAuthenticated || !user) {
    if (!emailOpen && emailHint) {
      return (
        <PinUnlock
          email={emailHint}
          onUnlocked={() => setPendingUnlock(true)}
          onUseEmail={() => {
            setEmailMode("recover");
            setEmailOpen(true);
          }}
        />
      );
    }
    return (
      <EmailVerification
        initialEmail={emailHint ?? ""}
        mode={emailOpen ? emailMode : "first"}
        onVerified={handleVerified}
        onBack={emailHint ? () => setEmailOpen(false) : undefined}
      />
    );
  }

  // While the verified identity is settling, trust the email we just verified
  // rather than briefly falling back to the anonymous studio screen.
  const accountEmail = verifiedEmail ?? user.email ?? null;

  if (isAnonymous && !justVerified) {
    return (
      <EmailVerification
        initialEmail=""
        mode="migrate"
        onVerified={handleVerified}
      />
    );
  }

  if (!justVerified && (!user.email || !user.emailVerificationTime)) {
    return (
      <EmailVerification
        initialEmail={user.email ?? ""}
        mode="verify"
        onVerified={handleVerified}
      />
    );
  }

  if (emailOpen) {
    return (
      <EmailVerification
        initialEmail={accountEmail ?? ""}
        mode={emailMode}
        onVerified={handleVerified}
        onBack={() => setEmailOpen(false)}
      />
    );
  }

  if (pinStatus === undefined) {
    return <StudioLoading />;
  }

  if (justVerified) {
    return (
      <PinSetup
        mode={hasPin ? "reset" : "create"}
        email={accountEmail ?? ""}
        onSubmit={handleSetPin}
        onVerifyAgain={() => {
          setJustVerified(false);
          setEmailMode("verify");
          setEmailOpen(true);
        }}
      />
    );
  }

  if (!hasPin) {
    if (!pinStatus?.canSetPin) {
      return (
        <EmailVerification
          initialEmail={accountEmail ?? ""}
          mode="verify"
          onVerified={handleVerified}
        />
      );
    }
    return (
      <PinSetup
        mode="create"
        email={accountEmail ?? ""}
        onSubmit={handleSetPin}
        onVerifyAgain={() => {
          setJustVerified(false);
          setEmailMode("verify");
          setEmailOpen(true);
        }}
      />
    );
  }

  if (effectiveUnlockedFor !== user._id) {
    return (
      <PinUnlock
        email={pinStatus?.email ?? accountEmail ?? ""}
        onUnlocked={() => setPendingUnlock(true)}
        onUseEmail={() => {
          setJustVerified(false);
          setEmailMode("recover");
          setEmailOpen(true);
        }}
      />
    );
  }

  const session: StudioSessionValue = {
    email: user.email ?? null,
    lock: handleLock,
  };

  return (
    <StudioSessionContext.Provider value={session}>
      {children}
    </StudioSessionContext.Provider>
  );
}
