import { BrandLink } from "@/components/brand/Wordmark";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { Link } from "react-router";

export default function NotFound() {
  return (
    <div className="relative flex min-h-screen flex-col bg-background">
      <div
        aria-hidden
        className="paper-grain pointer-events-none absolute inset-0 opacity-[0.035]"
      />
      <header className="relative px-5 py-6 sm:px-8 lg:px-12">
        <BrandLink />
      </header>
      <main className="relative flex flex-1 flex-col items-center justify-center px-6 pb-24 text-center">
        <p className="eyebrow text-muted-foreground">404</p>
        <h1 className="mt-5 max-w-xl font-display text-[clamp(2.8rem,8vw,5rem)] leading-[0.96] tracking-[-0.02em]">
          A page that was never{" "}
          <span className="italic text-[var(--olive)]">sent.</span>
        </h1>
        <p className="mt-5 max-w-sm text-[0.86rem] leading-[1.8] text-muted-foreground">
          The address may be mistyped, or the invitation behind it has moved on.
        </p>
        <div className="mt-8 flex flex-col items-center gap-4 sm:flex-row">
          <Button
            asChild
            className="h-11 rounded-none px-6 text-[0.62rem] uppercase tracking-[0.2em]"
          >
            <Link to="/">
              <ArrowLeft className="size-3.5" />
              Back to LAMSA
            </Link>
          </Button>
          <Link
            to="/dashboard"
            className="text-[0.62rem] uppercase tracking-[0.18em] text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
          >
            Your studio
          </Link>
        </div>
      </main>
    </div>
  );
}
