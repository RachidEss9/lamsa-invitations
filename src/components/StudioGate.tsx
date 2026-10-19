import { useStudioSession } from "@/hooks/use-studio-session";
import { Loader2 } from "lucide-react";
import type { ReactNode } from "react";

/**
 * Opens the studio without a sign-in step, then reveals the page. The session
 * is anonymous and tied to this browser, which is enough to keep a host's
 * invitations and guest names private.
 */
export function StudioGate({ children }: { children: ReactNode }) {
  const { ready, error, retry } = useStudioSession();

  if (error) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background p-6">
        <div className="w-full max-w-sm text-center">
          <p className="eyebrow text-muted-foreground">The studio</p>
          <h1 className="mt-4 font-display text-3xl leading-tight">
            The page could not open.
          </h1>
          <p className="mt-3 text-[0.84rem] leading-relaxed text-muted-foreground">
            {error.message}
          </p>
          <button
            type="button"
            onClick={retry}
            className="mt-7 h-10 border border-foreground px-6 text-[0.62rem] uppercase tracking-[0.2em] transition-colors hover:bg-foreground hover:text-background"
          >
            Try again
          </button>
        </div>
      </main>
    );
  }

  if (!ready) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center bg-background">
        <span className="font-ui text-[0.7rem] uppercase tracking-[0.42em] text-foreground/70">
          LAMSA
        </span>
        <Loader2 className="mt-5 size-4 animate-spin text-muted-foreground" />
      </main>
    );
  }

  return <>{children}</>;
}
