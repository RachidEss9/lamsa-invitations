import { api } from "@/convex/_generated/api";
import { BrandLink, Wordmark } from "@/components/brand/Wordmark";
import { InvitationCanvas } from "@/components/invitation/InvitationCanvas";
import { Button } from "@/components/ui/button";
import {
  calendarHref,
  displayTitle,
  fontPairById,
  formatEventDate,
  formatEventTime,
  isPairedOccasion,
  type InvitationContent,
} from "@/lib/invitation";
import { useMutation, useQuery } from "convex/react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowUpRight,
  CalendarPlus,
  Check,
  Copy,
  Share2,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router";
import { toast } from "sonner";

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(
    () =>
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(query.matches);
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);

  return reduced;
}

function PageShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex min-h-screen flex-col bg-background">
      <div
        aria-hidden
        className="paper-grain pointer-events-none fixed inset-0 opacity-[0.035]"
      />
      <div
        aria-hidden
        className="pointer-events-none fixed inset-x-0 top-0 h-[45vh] bg-gradient-to-b from-[#eae2d3]/45 to-transparent"
      />
      <header className="relative z-10">
        <div className="mx-auto flex h-20 w-full max-w-[1200px] items-center justify-between px-5 sm:px-8">
          <BrandLink />
          <Link
            to="/"
            className="flex items-center gap-2 text-[0.58rem] uppercase tracking-[0.18em] text-muted-foreground transition-colors hover:text-foreground"
          >
            <span className="hidden sm:inline">Create your own</span>
            <ArrowUpRight className="size-3.5" />
          </Link>
        </div>
      </header>
      {children}
      <footer className="relative z-10 mt-auto border-t border-border/60">
        <div className="mx-auto flex w-full max-w-[1200px] flex-col items-center justify-between gap-3 px-5 py-6 sm:flex-row sm:px-8">
          <Wordmark className="text-[0.6rem] tracking-[0.34em] text-muted-foreground/60" />
          <p className="text-[0.56rem] uppercase tracking-[0.18em] text-muted-foreground/60">
            Invitations, considered · © 2026
          </p>
        </div>
      </footer>
    </div>
  );
}

export default function InvitationPage() {
  const { slug, guestToken } = useParams<{
    slug: string;
    guestToken?: string;
  }>();
  const data = useQuery(
    api.invitations.getPublic,
    slug
      ? { slug, ...(guestToken ? { guestToken } : {}) }
      : "skip",
  );
  const recordView = useMutation(api.invitations.recordView);
  const reducedMotion = usePrefersReducedMotion();
  const [opened, setOpened] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!data) return;
    const key = `lamsa-view:${data.slug}:${guestToken ?? "public"}`;
    try {
      if (sessionStorage.getItem(key)) return;
      sessionStorage.setItem(key, "1");
    } catch {
      // Storage can be unavailable in strict privacy modes; counting views
      // is best-effort and must never block the invitation.
    }
    void recordView({
      slug: data.slug,
      ...(guestToken ? { guestToken } : {}),
    }).catch(() => {
      // View counting is best-effort and never blocks the invitation.
    });
  }, [data, guestToken, recordView]);

  const coverVisible = Boolean(data?.animations) && !reducedMotion && !opened;

  useEffect(() => {
    if (!coverVisible) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [coverVisible]);

  if (data === undefined) {
    return (
      <div className="relative flex min-h-screen flex-col items-center justify-center bg-background">
        <div
          aria-hidden
          className="paper-grain pointer-events-none absolute inset-0 opacity-[0.035]"
        />
        <Wordmark />
        <div className="mt-7 h-px w-24 overflow-hidden bg-border">
          <motion.div
            className="h-full w-8 bg-foreground/50"
            animate={{ x: [-32, 96] }}
            transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut" }}
          />
        </div>
      </div>
    );
  }

  if (data === null) {
    return (
      <PageShell>
        <main className="relative z-10 flex flex-1 items-center justify-center px-5 py-20">
          <div className="max-w-md text-center">
            <p className="eyebrow text-muted-foreground">LAMSA</p>
            <h1 className="mt-5 font-display text-4xl leading-tight tracking-[-0.02em] sm:text-5xl">
              This invitation isn&apos;t here.
            </h1>
            <p className="mt-4 text-[0.86rem] leading-[1.8] text-muted-foreground">
              The link may have expired, or the host may have returned the
              invitation to drafts. Ask them for a fresh link — or begin your own.
            </p>
            <Button
              asChild
              className="mt-8 h-11 rounded-none px-6 text-[0.62rem] uppercase tracking-[0.2em]"
            >
              <Link to="/">
                Visit LAMSA
                <ArrowUpRight className="size-4" />
              </Link>
            </Button>
          </div>
        </main>
      </PageShell>
    );
  }

  const content: InvitationContent = {
    title: displayTitle({ names: data.names, occasion: data.occasion }),
    occasion: data.occasion,
    templateId: "published",
    names: data.names,
    eyebrow: data.eyebrow,
    message: data.message,
    date: data.date,
    time: data.time,
    venueName: data.venueName,
    venueAddress: data.venueAddress,
    palette: data.palette,
    fontPair: data.fontPair,
    layout: data.layout,
    motif: data.motif,
    animations: data.animations,
  };

  const display = fontPairById(data.fontPair).family;
  const paired = isPairedOccasion(data.occasion);
  const cleanUrl = `${window.location.origin}/i/${data.slug}`;

  const handleShare = async () => {
    try {
      if (navigator.share) {
        await navigator.share({
          title: displayTitle(content),
          text: `${displayTitle(content)} — ${formatEventDate(data.date)}`,
          url: cleanUrl,
        });
        return;
      }
      await navigator.clipboard.writeText(cleanUrl);
      setCopied(true);
      toast.success("Invitation link copied.");
      window.setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      toast.error("Could not share the link. You can copy it from the address bar.");
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(cleanUrl);
      setCopied(true);
      toast.success("Invitation link copied.");
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Could not copy the link.");
    }
  };

  return (
    <PageShell>
      <main className="relative z-10 flex flex-1 flex-col items-center px-4 py-8 sm:px-6 sm:py-12">
        <motion.div
          initial={reducedMotion ? false : { opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: opened ? 0.2 : 0.1, ease: [0.16, 1, 0.3, 1] }}
          className="w-full max-w-[540px]"
        >
          <div className="editorial-shadow">
            <InvitationCanvas
              content={content}
              recipientName={data.guestName}
            />
          </div>

          <div className="mt-5 flex flex-col items-center gap-4">
            <div className="flex w-full items-center gap-2">
              <Button
                type="button"
                onClick={handleShare}
                className="h-11 flex-1 rounded-none text-[0.62rem] uppercase tracking-[0.2em]"
              >
                {copied ? (
                  <Check className="size-3.5" />
                ) : (
                  <Share2 className="size-3.5" />
                )}
                {copied ? "Link copied" : "Share invitation"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={handleCopy}
                className="h-11 rounded-none border-border px-4 text-[0.62rem] uppercase tracking-[0.18em]"
                aria-label="Copy invitation link"
              >
                <Copy className="size-3.5" />
              </Button>
              <Button
                asChild
                variant="outline"
                className="h-11 rounded-none border-border px-4 text-[0.62rem] uppercase tracking-[0.18em]"
              >
                <a
                  href={calendarHref(content)}
                  download="lamsa-invitation.ics"
                  aria-label="Add to calendar"
                >
                  <CalendarPlus className="size-3.5" />
                </a>
              </Button>
            </div>

            <p className="max-w-[26rem] text-center text-[0.66rem] leading-relaxed text-muted-foreground">
              {data.guestName
                ? `This invitation was prepared for ${data.guestName}. `
                : ""}
              The link is yours to keep.
            </p>
          </div>
        </motion.div>
      </main>

      <AnimatePresence>
        {coverVisible && (
          <motion.div
            key="cover"
            role="dialog"
            aria-modal="true"
            aria-label="Open invitation"
            className="fixed inset-0 z-[60] flex flex-col"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0, transition: { duration: 0.7, ease: "easeInOut" } }}
            style={{ backgroundColor: data.palette.ink, color: data.palette.background }}
          >
            <div
              aria-hidden
              className="paper-grain absolute inset-0 opacity-[0.09] mix-blend-screen"
            />
            <motion.div
              aria-hidden
              className="absolute inset-4 border sm:inset-7"
              style={{ borderColor: data.palette.accent, opacity: 0.4 }}
              initial={{ opacity: 0, scale: 0.985 }}
              animate={{ opacity: 0.4, scale: 1 }}
              transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
            />

            <div className="relative flex flex-1 flex-col items-center justify-center px-6 text-center">
              <motion.p
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.9, delay: 0.1 }}
                className="eyebrow text-[0.58rem]"
                style={{ color: data.palette.background, opacity: 0.55 }}
              >
                {data.eyebrow || "You are invited"}
              </motion.p>

              {data.guestName && (
                <motion.p
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.9, delay: 0.25 }}
                  className="mt-5 text-[0.8rem] italic"
                  style={{
                    fontFamily: display,
                    color: data.palette.accent,
                  }}
                >
                  For {data.guestName}
                </motion.p>
              )}

              <motion.div
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 1, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
                className="mt-6 flex flex-col items-center"
              >
                {paired ? (
                  <>
                    <span
                      className="max-w-full break-words text-[clamp(2.8rem,11vw,5.2rem)] leading-[0.95]"
                      style={{ fontFamily: display, letterSpacing: "-0.015em" }}
                    >
                      {data.names.primary || "Your name"}
                    </span>
                    <span
                      className="my-1 text-[clamp(1.6rem,5vw,2.4rem)] italic leading-none"
                      style={{ fontFamily: display, color: data.palette.accent }}
                    >
                      &
                    </span>
                    <span
                      className="max-w-full break-words text-[clamp(2.8rem,11vw,5.2rem)] leading-[0.95]"
                      style={{ fontFamily: display, letterSpacing: "-0.015em" }}
                    >
                      {data.names.secondary || "Your name"}
                    </span>
                  </>
                ) : (
                  <>
                    <span
                      className="max-w-full break-words text-[clamp(2.6rem,10vw,4.6rem)] leading-[0.98]"
                      style={{ fontFamily: display, letterSpacing: "-0.015em" }}
                    >
                      {data.names.primary || "Your name"}
                    </span>
                    {data.names.secondary && (
                      <span
                        className="mt-2 text-[clamp(1rem,3.4vw,1.5rem)] italic"
                        style={{ fontFamily: display, color: data.palette.accent }}
                      >
                        {data.names.secondary}
                      </span>
                    )}
                  </>
                )}
              </motion.div>

              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 1, delay: 0.7 }}
                className="mt-9 flex flex-col items-center gap-1.5"
              >
                <p
                  className="text-[0.68rem] uppercase tracking-[0.22em]"
                  style={{ opacity: 0.7 }}
                >
                  {formatEventDate(data.date)}
                </p>
                {data.time && (
                  <p
                    className="text-[0.6rem] uppercase tracking-[0.22em]"
                    style={{ opacity: 0.45 }}
                  >
                    {formatEventTime(data.time)}
                  </p>
                )}
              </motion.div>

              <motion.button
                type="button"
                onClick={() => setOpened(true)}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.9, delay: 0.95 }}
                whileHover={reducedMotion ? undefined : { y: -2 }}
                whileTap={reducedMotion ? undefined : { scale: 0.985 }}
                className="group mt-12 inline-flex flex-col items-center gap-3"
              >
                <span className="border px-8 py-3.5 text-[0.6rem] uppercase tracking-[0.24em] transition-colors group-hover:bg-white/5"
                  style={{ borderColor: `${data.palette.accent}99`, color: data.palette.background }}
                >
                  Open the invitation
                </span>
                <span
                  className="h-px w-10 transition-all duration-500 group-hover:w-16"
                  style={{ backgroundColor: data.palette.accent, opacity: 0.6 }}
                />
              </motion.button>
            </div>

            <div className="relative flex items-center justify-between px-6 pb-6 sm:px-10 sm:pb-8">
              <span
                className="text-[0.55rem] uppercase tracking-[0.36em]"
                style={{ opacity: 0.4 }}
              >
                LAMSA
              </span>
              <span
                className="text-[0.52rem] uppercase tracking-[0.2em]"
                style={{ opacity: 0.3 }}
              >
                Open to begin
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </PageShell>
  );
}
