import { useAuthActions } from "@convex-dev/auth/react";
import { useConvexAuth } from "convex/react";
import { useCallback, useEffect, useRef, useState } from "react";

/**
 * The studio no longer asks anyone to sign in. Instead, the first visit
 * quietly opens an anonymous session so drafts, guests, and share links still
 * belong to this browser and stay private from everyone else.
 */
export function useStudioSession() {
  const { isLoading, isAuthenticated } = useConvexAuth();
  const { signIn } = useAuthActions();
  const [error, setError] = useState<Error | null>(null);
  const [attempt, setAttempt] = useState(0);
  const started = useRef(false);

  useEffect(() => {
    if (isLoading || isAuthenticated || started.current) return;
    started.current = true;
    setError(null);
    signIn("anonymous").catch((caught: unknown) => {
      started.current = false;
      setError(
        caught instanceof Error
          ? caught
          : new Error("The studio could not be opened."),
      );
    });
  }, [attempt, isAuthenticated, isLoading, signIn]);

  const retry = useCallback(() => {
    started.current = false;
    setError(null);
    setAttempt((value) => value + 1);
  }, []);

  return { ready: isAuthenticated, error, retry };
}
