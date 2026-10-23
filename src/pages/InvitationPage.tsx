import { api } from "@/convex/_generated/api";
import { BrandLink, Wordmark } from "@/components/brand/Wordmark";
import { InvitationCanvas } from "@/components/invitation/InvitationCanvas";
import { SequentialInvitation } from "@/components/invitation/SequentialInvitation";
import { RevealOpening } from "@/components/invitation/RevealOpening";
import { Button } from "@/components/ui/button";
import {
  CalendarDays,
  Check,
  Copy,
  Heart,
  MapPin,
  MessageCircle,
  Music,
  Pause,
  Share2,
} from "lucide-react";
import {
  calendarHref,
  displayTitle,
  fontPairById,
  formatEventDate,
  formatEventTime,
  isPairedOccasion,
  isRevealLayout,
  whatsappShareHref,
  type InvitationContent,
  type Occasion,
} from "@/lib/invitation";
import { normalizeDesign } from "@/lib/design";
import { useMutation, useQuery } from "convex/react";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
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
      <div className="relative z-10 border-b border-ink/15 bg-[var(--paper-deep)]/60">
        <div className="mx-auto flex w-full max-w-[1200px] items-center justify-between px-5 py-2 font-meta text-[0.5rem] uppercase tracking-[0.14em] text-ink/60 sm:px-8">
          <span>An invitation</span>
          <span className="hidden sm:inline">Sent by hand</span>
          <span>LAMSA</span>
        </div>
      </div>
      <header className="sticky top-0 z-30 border-b border-ink/10 bg-background/85 backdrop-blur-xl">
        <div className="mx-auto flex h-[68px] w-full max-w-[1200px] items-center justify-between px-5 sm:px-8">
          <BrandLink />
          <Link
            to="/"
            className="flex items-center gap-2 text-[0.6rem] uppercase tracking-[0.14em] text-ink/68 transition-colors hover:text-ink"
          >
            <span className="hidden sm:inline">Compose your own</span>
            <Share2 className="size-3.5" />
          </Link>
        </div>
      </header>
      {children}
      <footer className="relative z-10 mt-16 border-t border-border/60">
        <div className="mx-auto flex w-full max-w-[1200px] flex-col items-center justify-between gap-3 px-5 py-6 sm:flex-row sm:px-8">
          <Wordmark className="text-[0.95rem] tracking-[0.2em] text-ink/62" />
          <p className="font-meta text-[0.5rem] uppercase tracking-[0.14em] text-ink/56">
            Composed once · Kept by you · © 2026
          </p>
        </div>
      </footer>
    </div>
  );
}

function Countdown({ target }: { target: Date }) {
  const [now, setNow] = useState(() => Date.now());
  const remains = target.getTime() > now;

  useEffect(() => {
    if (!remains && now - target.getTime() > 90_000) return;
    const step = 1000;
    const timer = window.setInterval(() => setNow(Date.now()), step);
    return () => window.clearInterval(timer);
  });

  const full = target.getTime() - now;
  if (full <= 0) {
    // Show a gentle "today" marker for up to a day after the start.
    return null;
  }

  const days = Math.floor(full / 86_400_000);
  const hours = Math.floor((full % 86_400_000) / 3_600_000);
  const minutes = Math.floor((full % 3_600_000) / 60_000);
  const seconds = Math.floor((full % 60_000) / 1000);

  const cells: { value: number; label: string }[] =
    days > 0
      ? [
          { value: days, label: "days" },
          { value: hours, label: "hours" },
          { value: minutes, label: "minutes" },
        ]
      : [
          { value: hours, label: "hours" },
          { value: minutes, label: "minutes" },
          { value: seconds, label: "seconds" },
        ];

  return (
    <div className="mt-6 grid grid-cols-3 divide-x divide-ink/15 border-y border-ink/20">
      {cells.map((cell) => (
        <div key={cell.label} className="py-3 text-center">
          <p className="font-ui text-[2rem] font-semibold leading-none tabular-nums tracking-[-0.03em]">
            {String(cell.value).padStart(2, "0")}
          </p>
          <p className="mt-1.5 font-meta text-[0.46rem] uppercase tracking-[0.14em] text-ink/56">
            {cell.label}
          </p>
        </div>
      ))}
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
  const recordShare = useMutation(api.invitations.recordShare);
  const recordRsvp = useMutation(api.invitations.recordRsvp);
  const reducedMotion = usePrefersReducedMotion();
  const [opened, setOpened] = useState(false);
  const [copied, setCopied] = useState(false);
  const [revealGo, setRevealGo] = useState(false);

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

  const savedDesign = data?.design ?? null;
  // Saved designs open inside the sequential journey itself: the journey owns
  // the cover, the opening animation and the hand-off to the first section. The
  // legacy cover below is only for invitations saved before the design canvas.
  const coverVisible = savedDesign
    ? false
    : Boolean(data?.animations) && !reducedMotion && !opened;

  useEffect(() => {
    if (!coverVisible) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [coverVisible]);

  // LAMSA v5 animated reveal layouts: the cover opens with the touch-to-open
  // animation before the invitation fades in beneath it.
  const reveal =
    data &&
    !savedDesign &&
    !reducedMotion &&
    Boolean(data.animations) &&
    isRevealLayout(data.layout)
      ? data.layout
      : null;

  const handleOpen = () => {
    if (reveal && !revealGo) {
      setRevealGo(true);
      // Let the opener finish: the envelope flies away a beat after the
      // flap opens; the arch/ribbons resolve a little faster.
      window.setTimeout(() => setOpened(true), reveal === "envelope" ? 2100 : 1500);
    } else {
      setOpened(true);
    }
  };

  // Music: only present when the host enabled it, and never auto-plays.
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);

  const toggleMusic = () => {
    if (!audioRef.current) return;
    if (playing) {
      audioRef.current.pause();
      setPlaying(false);
    } else {
      void audioRef.current
        .play()
        .then(() => setPlaying(true))
        .catch(() => toast.error("This browser cannot play the music file."));
    }
  };

  // RSVP form state. Server-confirmed replies are synced via a render-phase
  // update (same component, settled before paint) rather than an effect, so
  // the guest never sees a flash of their previous answer.
  interface RsvpFormState {
    attending: boolean | null;
    count: number;
    meal: string;
    note: string;
  }
  const emptyForm: RsvpFormState = { attending: null, count: 2, meal: "", note: "" };
  const [form, setForm] = useState<RsvpFormState>(emptyForm);
  const serverReply = data?.rsvpState ?? null;
  const [syncedReply, setSyncedReply] = useState(serverReply);
  if (serverReply !== syncedReply) {
    setSyncedReply(serverReply);
    setForm(
      serverReply
        ? {
            attending: serverReply.attending ?? null,
            count: serverReply.count ?? 2,
            meal: serverReply.meal ?? "",
            note: serverReply.note ?? "",
          }
        : emptyForm,
    );
  }
  const [attending, setAttending] = [
    form.attending,
    (value: boolean | null) =>
      setForm((previous) => ({ ...previous, attending: value })),
  ] as const;
  const [attendeeCount, setAttendeeCount] = [
    form.count,
    (value: number) => setForm((previous) => ({ ...previous, count: value })),
  ] as const;
  const [meal, setMeal] = [
    form.meal,
    (value: string) => setForm((previous) => ({ ...previous, meal: value })),
  ] as const;
  const [note, setNote] = [
    form.note,
    (value: string) => setForm((previous) => ({ ...previous, note: value })),
  ] as const;
  const [rsvpBusy, setRsvpBusy] = useState(false);

  const eventTargetDate = data?.date ?
    new Date(
      data.date.length === 10
        ? `${data.date}${data.time ? `T${data.time}` : "T12:00:00"}`
        : data.date,
    )
  : null;
  const eventTarget =
    eventTargetDate && !Number.isNaN(eventTargetDate.getTime())
      ? eventTargetDate
      : null;

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
                <Share2 className="size-4" />
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
    cornerMotif: data.cornerMotif ?? "none",
    animations: data.animations,
    rtl: Boolean(data.rtl),
    rsvp: data.rsvp ?? undefined,
  };

  // RTL invitations use their chosen Arabic pair, or Amiri for Latin pairs.
  const arabicPair =
    data.fontPair === "arabic" ||
    data.fontPair === "ruqaa" ||
    data.fontPair === "kufi";
  const display =
    data.rtl && !arabicPair
      ? '"Amiri", "Times New Roman", serif'
      : fontPairById(data.fontPair).family;
  const paired = isPairedOccasion(data.occasion as Occasion);
  const designDoc = data.design ? normalizeDesign(data.design, content) : null;
  const designImageUrls = data.designImageUrls ?? {};

  const cleanUrl = `${window.location.origin}/i/${data.slug}`;
  const trackShare = () => {
    void recordShare({
      slug: data.slug,
      ...(guestToken ? { guestToken } : {}),
    }).catch(() => {
      // Sharing must never be blocked by a tracking failure.
    });
  };

  const handleShare = async () => {
    trackShare();
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
    trackShare();
    try {
      await navigator.clipboard.writeText(cleanUrl);
      setCopied(true);
      toast.success("Invitation link copied.");
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Could not copy the link.");
    }
  };

  const handleWhatsApp = () => {
    trackShare();
    window.open(
      whatsappShareHref(
        `${displayTitle(content)} — ${formatEventDate(data.date)}`,
        cleanUrl,
      ),
      "_blank",
      "noopener,noreferrer",
    );
  };

  const handleRsvpSubmit = async (attendingValue: boolean) => {
    if (!data.slug || !guestToken) return;
    setRsvpBusy(true);
    try {
      await recordRsvp({
        slug: data.slug,
        guestToken,
        attending: attendingValue,
        ...(attendingValue
          ? { count: attendeeCount, meal: meal || undefined }
          : {}),
        ...(attendingValue && data.rsvp?.askNote && note
          ? { note }
          : {}),
      });
      setAttending(attendingValue);
      toast.success(
        attendingValue ? "See you there. Your reply is saved." : "Your reply is saved.",
      );
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Reply could not be saved.",
      );
    } finally {
      setRsvpBusy(false);
    }
  };

  return (
    <PageShell>
      <main
        dir={data.rtl ? "rtl" : "ltr"}
        className="relative z-10 flex flex-1 flex-col items-center px-4 py-8 sm:px-6 sm:py-12"
      >
        <motion.div
          initial={reducedMotion ? false : { opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: opened ? 0.2 : 0.1, ease: [0.16, 1, 0.3, 1] }}
          className="w-full max-w-[540px]"
        >
          {designDoc ? (
            <SequentialInvitation
              design={designDoc}
              imageUrls={designImageUrls}
              guestName={data.guestName}
              names={displayTitle(content)}
              rtl={Boolean(data.rtl)}
              reducedMotion={reducedMotion}
              active
              accent={data.palette.accent}
              ink={data.palette.ink}
            />
          ) : (
            <div className="editorial-shadow">
              <InvitationCanvas
                content={content}
                recipientName={data.guestName}
              />
            </div>
          )}

          {eventTarget && <Countdown target={eventTarget} />}

          <p className="mt-5 max-w-[26rem] text-center text-[0.66rem] leading-relaxed text-muted-foreground">
            {data.guestName
              ? `This invitation was prepared for ${data.guestName}. `
              : ""}
            The link is yours to keep.
          </p>

          <div className="mt-6 flex flex-col items-center gap-4">
            <div className="grid w-full grid-cols-4 gap-2">
              <Button
                type="button"
                onClick={handleShare}
                className="col-span-2 h-11 rounded-none text-[0.62rem] uppercase tracking-[0.18em]"
              >
                {copied ? <Check className="size-3.5" /> : <Share2 className="size-3.5" />}
                {copied ? "Copied" : "Share"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={handleWhatsApp}
                className="h-11 rounded-none border-border px-0 text-[0.58rem] uppercase tracking-[0.14em]"
                aria-label="Share on WhatsApp"
              >
                <MessageCircle className="size-3.5" />
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={handleCopy}
                className="h-11 rounded-none border-border px-0"
                aria-label="Copy invitation link"
              >
                <Copy className="size-3.5" />
              </Button>
            </div>

            <Button
              type="button"
              variant="outline"
              asChild
              className="h-10 w-full rounded-none border-border text-[0.58rem] uppercase tracking-[0.16em]"
            >
              <a
                href={calendarHref({
                  names: content.names,
                  occasion: content.occasion,
                  date: content.date,
                  time: content.time,
                  venueName: content.venueName,
                  venueAddress: content.venueAddress,
                  message: content.message,
                })}
                download="lamsa-invitation.ics"
                className="flex items-center gap-2"
                aria-label="Add to calendar"
              >
                <CalendarDays className="size-3.5" />
                Add to calendar
              </a>          </Button>
        </div>

          {/* Event details */}
          {(data.schedule.length > 0 ||
            data.dressCode ||
            data.mapUrl ||
            data.hostNotes) && (
            <motion.section
              initial={reducedMotion ? false : { opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.25 }}
              className="mt-8 w-full border border-ink/20 bg-[var(--paper-light)] p-5 sm:p-7"
            >
              <div className="flex items-baseline justify-between border-b border-ink/15 pb-2">
                <p className="font-meta text-[0.5rem] uppercase tracking-[0.14em] text-ink/60">
                  For the day
                </p>
                <p className="font-meta text-[0.5rem] uppercase tracking-[0.12em] text-ink/48">
                  Details
                </p>
              </div>

              {eventTarget && (
                <p className="mt-3 font-display text-xl leading-snug">
                  {formatEventDate(data.date)}
                  {data.time ? ` · ${formatEventTime(data.time)}` : ""}
                </p>
              )}

              {data.venueName && (
                <p className="mt-1 text-[0.7rem] uppercase tracking-[0.16em] text-muted-foreground">
                  {data.venueName}
                  {data.venueAddress ? ` · ${data.venueAddress}` : ""}
                </p>
              )}

              {data.schedule.length > 0 && (
                <div className="mt-5 space-y-2 border-t border-border/60 pt-4">
                  {data.schedule.map((item, index) => (
                    <div
                      key={index}
                      className="flex items-baseline gap-3 text-[0.78rem]"
                    >
                      <span className="w-[4.5rem] shrink-0 text-[0.66rem] uppercase tracking-[0.14em] text-muted-foreground">
                        {formatEventTime(item.time).replace(/\s?(am|pm)/i, "")}
                      </span>
                      <span className="leading-relaxed">{item.label}</span>
                    </div>
                  ))}
                </div>
              )}

              {data.dressCode && (
                <p className="mt-4 border-t border-border/60 pt-4 text-[0.74rem] leading-relaxed text-muted-foreground">
                  <span className="text-foreground">Dress code. </span>
                  {data.dressCode}
                </p>
              )}

              {data.hostNotes && (
                <p className="mt-4 border-t border-border/60 pt-4 text-[0.74rem] italic leading-relaxed text-muted-foreground">
                  <span className="not-italic text-foreground">The hosts note. </span>
                  {data.hostNotes}
                </p>
              )}

              {data.mapUrl && (
                <a
                  href={data.mapUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-4 inline-flex items-center gap-2 border border-border/80 px-4 py-2 text-[0.56rem] uppercase tracking-[0.18em] text-foreground transition-colors hover:border-foreground/40"
                >
                  <MapPin className="size-3.5" />
                  Open in maps
                </a>
              )}
            </motion.section>
          )}

          {/* Photo gallery */}
          {data.photos.length > 0 && (
            <motion.section
              initial={reducedMotion ? false : { opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.3 }}
              className="mt-6 w-full"
            >
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {data.photos.map((photo) => (
                  <a
                    key={photo.storageId}
                    href={photo.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group block overflow-hidden border border-border/70"
                    aria-label="Open photo"
                  >
                    {/* Plain host-provided photo; opened in a new tab on click. */}
                    <img
                      src={photo.url}
                      alt={photo.caption ?? "Invitation photo"}
                      className="aspect-square w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                      loading="lazy"
                    />
                  </a>
                ))}
              </div>
              {data.photos.some((photo) => photo.caption) && (
                <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1">
                  {data.photos
                    .filter((photo) => photo.caption)
                    .map((photo) => (
                      <p
                        key={photo.storageId}
                        className="text-[0.6rem] uppercase tracking-[0.12em] text-muted-foreground/70"
                      >
                        {photo.caption}
                      </p>
                    ))}
                </div>
              )}
            </motion.section>
          )}

          {/* RSVP */}
          {data.rsvp?.enabled && (
            <motion.section
              initial={reducedMotion ? false : { opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.35 }}
              className="mt-6 w-full border border-ink/20 bg-[var(--paper-light)] p-5 sm:p-7"
            >
              {guestToken && data.guestName ? (
                <>
                  <div className="flex items-baseline justify-between gap-3 border-b border-ink/15 pb-2">
                    <p className="font-meta text-[0.5rem] uppercase tracking-[0.14em] text-ink/60">
                      Your reply
                    </p>
                    <Heart className="size-3.5 text-[var(--red)]" />
                  </div>
                  <p className="mt-2 font-display text-xl leading-snug">
                    {attending === true
                      ? "We can't wait to see you."
                      : attending === false
                        ? "You will be missed."
                        : "Will you join us?"}
                  </p>

                  <div className="mt-4 grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => void handleRsvpSubmit(true)}
                      disabled={rsvpBusy}
                      className={`h-11 border text-[0.6rem] uppercase tracking-[0.18em] transition-colors disabled:opacity-60 ${
                        attending === true
                          ? "border-foreground bg-foreground text-background"
                          : "border-border hover:border-foreground/40"
                      }`}
                    >
                      {rsvpBusy && attending === null ? (
                        <span className="inline-flex items-center gap-2">
                          <span className="size-2 animate-pulse rounded-full bg-current" />
                          Sending
                        </span>
                      ) : (
                        "Joyfully, yes"
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleRsvpSubmit(false)}
                      disabled={rsvpBusy}
                      className={`h-11 border text-[0.6rem] uppercase tracking-[0.18em] transition-colors disabled:opacity-60 ${
                        attending === false
                          ? "border-foreground bg-foreground text-background"
                          : "border-border hover:border-foreground/40"
                      }`}
                    >
                      With regret, no
                    </button>
                  </div>

                  {attending !== false && (
                    <>
                      <p className="mt-5 text-[0.6rem] uppercase tracking-[0.16em] text-muted-foreground">
                        How many of you are coming?
                      </p>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {[1, 2, 3, 4, 5].map((count) => (
                          <button
                            key={count}
                            type="button"
                            onClick={() => setAttendeeCount(count)}
                            className={`size-9 border text-[0.7rem] transition-colors ${
                              attendeeCount === count
                                ? "border-foreground bg-foreground text-background"
                                : "border-border text-muted-foreground hover:border-foreground/40"
                            }`}
                          >
                            {count}
                          </button>
                        ))}
                        <input
                          type="number"
                          min={6}
                          max={20}
                          value={attendeeCount > 5 ? attendeeCount : ""}
                          onChange={(event) =>
                            setAttendeeCount(
                              Math.min(Math.max(Number(event.target.value) || 6, 6), 20),
                            )
                          }
                          placeholder="6+"
                          aria-label="More than five attendees"
                          className="h-9 w-14 border border-border bg-transparent text-center text-[0.7rem] text-foreground outline-none placeholder:text-muted-foreground/60"
                        />
                      </div>

                      {data.rsvp.askMeal && (
                        <>
                          <p className="mt-5 text-[0.6rem] uppercase tracking-[0.16em] text-muted-foreground">
                            Meal preferences or allergies
                          </p>
                          <input
                            type="text"
                            value={meal}
                            maxLength={120}
                            onChange={(event) => setMeal(event.target.value)}
                            placeholder="e.g. one vegetarian"
                            className="mt-2 h-11 w-full border border-border bg-transparent px-3 text-[0.8rem] text-foreground outline-none placeholder:text-muted-foreground/60 focus-visible:ring-1 focus-visible:ring-foreground/30"
                          />
                          <button
                            type="button"
                            onClick={() => void handleRsvpSubmit(true)}
                            disabled={rsvpBusy}
                            className="mt-3 h-10 w-full border border-border text-[0.56rem] uppercase tracking-[0.16em] text-foreground transition-colors hover:border-foreground/40 disabled:opacity-60"
                          >
                            {attending === true ? "Update these details" : "Save this reply"}
                          </button>
                        </>
                      )}

                      {data.rsvp.askNote && (
                        <>
                          <p className="mt-4 text-[0.6rem] uppercase tracking-[0.16em] text-muted-foreground">
                            A word to the hosts
                          </p>
                          <textarea
                            value={note}
                            maxLength={400}
                            onChange={(event) => setNote(event.target.value)}
                            rows={2}
                            placeholder="We are bringing the kids, arriving a little late — can't wait!"
                            className="mt-2 w-full resize-none border border-border bg-transparent px-3 py-2 text-[0.8rem] leading-relaxed text-foreground outline-none placeholder:text-muted-foreground/60 focus-visible:ring-1 focus-visible:ring-foreground/30"
                          />
                          <button
                            type="button"
                            onClick={() => void handleRsvpSubmit(true)}
                            disabled={rsvpBusy}
                            className="mt-3 h-10 w-full border border-border text-[0.56rem] uppercase tracking-[0.16em] text-foreground transition-colors hover:border-foreground/40 disabled:opacity-60"
                          >
                            {attending === true ? "Update these details" : "Save this reply"}
                          </button>
                        </>
                      )}
                    </>
                  )}

                  {data.rsvp.deadline && (
                    <p className="mt-4 text-[0.62rem] text-muted-foreground/70">
                      Please reply before {formatEventDate(data.rsvp.deadline)}.
                    </p>
                  )}
                </>
              ) : (
                <p className="text-[0.72rem] leading-relaxed text-muted-foreground">
                  The hosts are collecting replies on personally addressed
                  invitation links.
                </p>
              )}
            </motion.section>
          )}
        </motion.div>
      </main>

      {/* Background music (never auto-plays; only when the host enabled it) */}
      {data.music?.enabled && data.music.url && (
        <button
          type="button"
          onClick={toggleMusic}
          aria-pressed={playing}
          aria-label={playing ? "Pause the invitation music" : "Play the invitation music"}
          className="fixed bottom-5 right-5 z-40 flex size-11 items-center justify-center border border-[#cdc6b3] bg-black/60 text-[#f2f1ed] transition-colors hover:border-[var(--red)] hover:bg-[var(--red)]"
        >
          {playing ? <Pause className="size-4" /> : <Music className="size-4" />}
        </button>
      )}
      {data.music?.enabled && data.music.url && (
        <audio ref={audioRef} src={data.music.url} loop preload="none" />
      )}

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
            style={
              reveal
                ? {
                    backgroundColor:
                      reveal === "arch" ? "#161616" : data.palette.background,
                    color: data.palette.background,
                  }
                : { backgroundColor: data.palette.ink, color: data.palette.background }
            }
          >
            {reveal ? (
              <RevealOpening
                layout={reveal}
                accent={data.palette.accent}
                background={data.palette.background}
                go={revealGo}
                reducedMotion={reducedMotion}
                onOpen={handleOpen}
              />
            ) : (
              <>
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
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </PageShell>
  );
}
