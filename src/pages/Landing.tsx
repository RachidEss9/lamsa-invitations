import { BrandLink, Wordmark } from "@/components/brand/Wordmark";
import { InvitationCanvas } from "@/components/invitation/InvitationCanvas";
import { Button } from "@/components/ui/button";
import {
  fontPairById,
  formatEventDateShort,
  occasionLabel,
  OCCASIONS,
  templateById,
  type InvitationContent,
} from "@/lib/invitation";
import { cn } from "@/lib/utils";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowDownRight, ArrowRight, ArrowUpRight, Menu, X } from "lucide-react";
import { useMemo, useState, type ReactNode } from "react";
import { Link } from "react-router";

const COLLECTION_IDS = [
  "the-seal",
  "the-arch",
  "the-vow",
  "adeline",
  "jubilee",
  "laurel",
  "nocturne",
  "the-ribbon",
] as const;

const STUDIO_HREF = "/dashboard";

function sampleContent(templateId: string, offsetDays = 96): InvitationContent {
  const template = templateById(templateId);
  const date = new Date();
  date.setDate(date.getDate() + offsetDays);
  return {
    title: `${template.name} invitation`,
    occasion: template.occasion,
    templateId: template.id,
    names: {
      primary: template.sample.primary,
      secondary: template.sample.secondary,
    },
    eyebrow: template.sample.eyebrow,
    message: template.sample.message,
    date: date.toISOString().slice(0, 10),
    time: "17:00",
    venueName: template.sample.venueName,
    venueAddress: template.sample.venueAddress,
    palette: template.palette,
    fontPair: template.fontPair,
    layout: template.layout,
    motif: template.motif,
    animations: true,
  };
}

const templateHref = (templateId: string) =>
  `${STUDIO_HREF}?template=${templateId}`;

function Rise({
  children,
  delay = 0,
  className,
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
}) {
  const reduce = useReducedMotion();
  if (reduce) return <div className={className}>{children}</div>;
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.7, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}

function SectionLabel({
  index,
  children,
  className,
}: {
  index: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex items-baseline gap-3", className)}>
      <span className="folio text-[var(--red)]">{index}</span>
      <span className="h-px w-6 bg-ink/30" />
      <span className="eyebrow text-muted-foreground">{children}</span>
    </div>
  );
}

export default function Landing() {
  const reduce = useReducedMotion();
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeId, setActiveId] = useState<string>("the-seal");

  const activeTemplate = templateById(activeId);
  const activeContent = useMemo(() => sampleContent(activeId), [activeId]);
  const heroContent = useMemo(() => sampleContent("the-arch", 128), []);
  const heroTemplate = templateById("the-arch");

  const ticker = [
    "One link per guest",
    "RSVP replies in the studio",
    "Print-ready proofs",
    "Arabic & right-to-left",
    "Eight designs, endlessly editable",
    "No passwords — a six-digit PIN",
  ];

  const nav = [
    { label: "Collection", href: "#collection" },
    { label: "Method", href: "#method" },
    { label: "Guests", href: "#guests" },
  ];

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-background">
      <div
        aria-hidden
        className="paper-grain pointer-events-none fixed inset-0 z-0 opacity-[0.03]"
      />

      {/* Top strip: a printed folio line, then the masthead. */}
      <div className="relative z-40 border-b border-ink/15 bg-[var(--paper-deep)]/60">
        <div className="mx-auto flex w-full max-w-[1480px] items-center justify-between gap-4 px-5 py-2 font-meta text-[0.54rem] uppercase tracking-[0.16em] text-ink/68 sm:px-8 lg:px-12">
          <span>Atelier LAMSA</span>
          <span className="hidden sm:inline">
            Invitations, composed and addressed by hand
          </span>
          <span className="tabular-nums">Est. 2026 · Tangier</span>
        </div>
      </div>

      <header className="sticky top-0 z-40 border-b border-ink/10 bg-background/85 backdrop-blur-xl">
        <div className="mx-auto flex h-[76px] w-full max-w-[1480px] items-center justify-between px-5 sm:px-8 lg:px-12">
          <BrandLink />
          <nav className="hidden items-center gap-8 md:flex">
            {nav.map((item) => (
              <a
                key={item.href}
                href={item.href}
                className="text-[0.7rem] text-ink/65 transition-colors hover:text-ink"
              >
                {item.label}
              </a>
            ))}
          </nav>
          <div className="flex items-center gap-3">
            <Link
              to={STUDIO_HREF}
              className="hidden text-[0.66rem] uppercase tracking-[0.14em] text-ink/70 underline-offset-[6px] transition-colors hover:text-ink hover:underline sm:inline"
            >
              Enter the studio
            </Link>
            <Button asChild size="sm" className="h-9 px-4">
              <Link to={STUDIO_HREF}>Start an invitation</Link>
            </Button>
            <button
              type="button"
              aria-label={menuOpen ? "Close menu" : "Open menu"}
              onClick={() => setMenuOpen((open) => !open)}
              className="flex size-9 items-center justify-center text-foreground md:hidden"
            >
              {menuOpen ? <X className="size-5" /> : <Menu className="size-5" />}
            </button>
          </div>
        </div>
        {menuOpen && (
          <div className="border-t border-ink/15 bg-background px-5 py-5 md:hidden">
            <div className="flex flex-col divide-y divide-ink/10">
              {nav.map((item) => (
                <a
                  key={item.href}
                  href={item.href}
                  onClick={() => setMenuOpen(false)}
                  className="py-3 text-sm text-ink/75"
                >
                  {item.label}
                </a>
              ))}
              <Link
                to={STUDIO_HREF}
                onClick={() => setMenuOpen(false)}
                className="py-3 text-sm text-ink"
              >
                Enter the studio
              </Link>
            </div>
          </div>
        )}
      </header>

      <main className="relative z-10">
        {/* ---------------------------------------------------------------- */}
        {/* Hero: the argument on the left, the specimen board on the right.  */}
        {/* ---------------------------------------------------------------- */}
        <section className="mx-auto grid w-full max-w-[1480px] gap-14 px-5 pb-16 pt-12 sm:px-8 sm:pt-16 lg:grid-cols-[1.06fr_0.94fr] lg:gap-16 lg:px-12 lg:pb-24 lg:pt-20">
          <div className="max-w-[640px]">
            <motion.div
              initial={reduce ? false : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="flex items-center gap-3"
            >
              <span className="flex size-6 items-center justify-center bg-[var(--red)] font-meta text-[0.55rem] text-[#f2f1ed]">
                01
              </span>
              <span className="eyebrow text-ink/68">
                Invitations for the moments that get a date
              </span>
            </motion.div>

            <motion.h1
              initial={reduce ? false : { opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.05, ease: [0.22, 1, 0.36, 1] }}
              className="mt-8 font-display text-[clamp(3.4rem,7.6vw,6.4rem)] leading-[0.88] tracking-[-0.015em]"
            >
              An invitation
              <br />
              is not a{" "}
              <span className="relative inline-block">
                <span className="relative z-10">notification.</span>
                <span
                  aria-hidden
                  className="absolute inset-x-0 bottom-[0.1em] z-0 h-[0.09em] bg-[var(--red)]"
                />
              </span>
            </motion.h1>

            <motion.p
              initial={reduce ? false : { opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.16 }}
              className="mt-8 max-w-[30rem] text-[0.98rem] leading-[1.75] text-ink/70"
            >
              LAMSA is an atelier for the invitations that deserve more than a
              group chat. Compose it once — names, venue, words, type — then send
              each guest their own quiet link. No app to install. No account for
              them to make.
            </motion.p>

            <motion.div
              initial={reduce ? false : { opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.24 }}
              className="mt-9 flex flex-col items-stretch gap-3 sm:flex-row sm:items-center"
            >
              <Button asChild size="lg" className="h-12 px-7">
                <Link to={STUDIO_HREF}>
                  Compose an invitation
                  <ArrowRight className="size-4" />
                </Link>
              </Button>
              <a
                href="#collection"
                className="group inline-flex h-12 items-center justify-center gap-2 border border-ink/25 px-6 text-[0.66rem] uppercase tracking-[0.14em] text-ink/80 transition-colors hover:border-ink hover:text-ink"
              >
                See the collection
                <ArrowDownRight className="size-4 transition-transform group-hover:translate-y-0.5" />
              </a>
            </motion.div>

            <motion.div
              initial={reduce ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.8, delay: 0.4 }}
              className="mt-10 flex flex-wrap items-center gap-x-6 gap-y-2 border-t border-ink/15 pt-4 font-meta text-[0.56rem] uppercase tracking-[0.12em] text-ink/64"
            >
              <span>Verified email once</span>
              <span className="size-[3px] bg-[var(--red)]" />
              <span>Six-digit PIN after that</span>
              <span className="size-[3px] bg-[var(--red)]" />
              <span>Free to compose</span>
            </motion.div>
          </div>

          {/* Specimen board */}
          <motion.div
            initial={reduce ? false : { opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
            className="relative mx-auto w-full max-w-[560px] lg:mx-0 lg:max-w-none"
          >
            <div className="flex items-baseline justify-between border-b border-ink/25 pb-2 font-meta text-[0.54rem] uppercase tracking-[0.12em] text-ink/68">
              <span>Specimen no. 02</span>
              <span className="hidden sm:inline">{heroTemplate.name}</span>
              <span>3 : 4</span>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-[minmax(0,1fr)_132px]">
              <div className="proof p-4 sm:p-5">
                <div className="editorial-shadow">
                  <InvitationCanvas content={heroContent} />
                </div>
              </div>

              <div className="flex flex-col gap-3">
                <div className="border border-ink/25 bg-[var(--paper-light)] p-3">
                  <p className="font-meta text-[0.5rem] uppercase tracking-[0.14em] text-ink/60">
                    Guest link
                  </p>
                  <p className="mt-2 font-display text-[1.15rem] leading-tight">
                    For Amara &amp; Julian
                  </p>
                  <p className="mt-2 truncate font-meta text-[0.5rem] text-ink/60">
                    lamsa.studio/i/arch/9f2c
                  </p>
                  <div className="mt-3 h-px w-full bg-ink/15" />
                  <p className="mt-2 flex items-center gap-1.5 font-meta text-[0.5rem] uppercase tracking-[0.1em] text-[var(--olive)]">
                    <span className="size-1.5 rounded-full bg-[var(--olive)]" />
                    Opened once
                  </p>
                </div>

                <div className="hidden flex-1 flex-col justify-between border border-ink/25 bg-[var(--red)] p-3 text-[#f2f1ed] sm:flex">
                  <p className="font-meta text-[0.5rem] uppercase tracking-[0.14em] text-[#f2f1ed]/70">
                    The reveal
                  </p>
                  <p className="mt-2 font-display text-[1.35rem] leading-[1.05]">
                    A seal,
                    <br />
                    a touch,
                    <br />
                    then the card.
                  </p>
                  <p className="mt-3 font-meta text-[0.5rem] uppercase tracking-[0.1em] text-[#f2f1ed]/60">
                    3s · one gesture
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-3 flex flex-wrap items-center justify-between gap-2 font-meta text-[0.52rem] uppercase tracking-[0.12em] text-ink/64">
              <span>Shown at 100%</span>
              <span>{fontPairById(heroContent.fontPair).note}</span>
              <span>{occasionLabel(heroContent.occasion)}</span>
              <span className="text-[var(--red)]">Proof, not a mockup</span>
            </div>
          </motion.div>
        </section>

        {/* Ticker */}
        <div className="overflow-hidden border-y border-ink/20 bg-[var(--ink)] py-3 text-[#f2f1ed]">
          <div className="lamsa-ticker flex w-max items-center">
            {[0, 1].map((copy) => (
              <div
                key={copy}
                aria-hidden={copy === 1}
                className="flex shrink-0 items-center"
              >
                {ticker.map((item) => (
                  <span
                    key={`${copy}-${item}`}
                    className="flex items-center gap-6 whitespace-nowrap px-6 font-meta text-[0.6rem] uppercase tracking-[0.14em]"
                  >
                    {item}
                    <span className="text-[var(--red)]">✳</span>
                  </span>
                ))}
              </div>
            ))}
          </div>
        </div>

        {/* ---------------------------------------------------------------- */}
        {/* Collection: a type-foundry index, not a card wall.                */}
        {/* ---------------------------------------------------------------- */}
        <section
          id="collection"
          className="mx-auto w-full max-w-[1480px] px-5 py-20 sm:px-8 lg:px-12 lg:py-28"
        >
          <div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-end">
            <Rise>
              <SectionLabel index="02">The collection</SectionLabel>
              <h2 className="mt-6 max-w-[26rem] font-display text-[clamp(2.6rem,5.4vw,4.4rem)] leading-[0.94] tracking-[-0.015em]">
                Eight designs.
                <br />
                Every one editable
                <br />
                to the last comma.
              </h2>
            </Rise>
            <Rise delay={0.08} className="lg:pb-2">
              <p className="max-w-[30rem] text-[0.92rem] leading-[1.8] text-ink/65 lg:ml-auto">
                Each design is a complete composition — palette, typeface, motif,
                and opening gesture. Change any of it. Nothing is locked, and
                nothing looks like everyone else&rsquo;s.
              </p>
            </Rise>
          </div>

          <div className="mt-12 grid gap-10 border-t border-ink/20 pt-4 lg:mt-16 lg:grid-cols-[1.02fr_0.98fr] lg:gap-16">
            {/* index */}
            <div>
              <div className="hidden grid-cols-[2.5rem_1fr_7rem_5rem] gap-3 pb-2 font-meta text-[0.5rem] uppercase tracking-[0.14em] text-ink/56 sm:grid">
                <span>No.</span>
                <span>Design</span>
                <span>Occasion</span>
                <span className="text-right">Type</span>
              </div>
              <ul className="border-t border-ink/12">
                {COLLECTION_IDS.map((templateId, index) => {
                  const template = templateById(templateId);
                  const active = activeId === templateId;
                  return (
                    <li key={templateId}>
                      <button
                        type="button"
                        onMouseEnter={() => setActiveId(templateId)}
                        onFocus={() => setActiveId(templateId)}
                        onClick={() => setActiveId(templateId)}
                        aria-pressed={active}
                        className={cn(
                          "group grid w-full grid-cols-[2.5rem_1fr_auto] items-center gap-3 border-b border-ink/12 py-4 text-left transition-colors sm:grid-cols-[2.5rem_1fr_7rem_5rem]",
                          active
                            ? "bg-[var(--paper-light)]"
                            : "hover:bg-[var(--paper-light)]/60",
                        )}
                      >
                        <span
                          className={cn(
                            "font-meta text-[0.6rem] tabular-nums",
                            active ? "text-[var(--red)]" : "text-ink/52",
                          )}
                        >
                          {String(index + 1).padStart(2, "0")}
                        </span>
                        <span className="flex min-w-0 items-baseline gap-2">
                          <span className="truncate font-display text-[1.45rem] leading-tight">
                            {template.name}
                          </span>
                          <span
                            className={cn(
                              "shrink-0 text-[0.6rem] text-[var(--red)] transition-opacity",
                              active ? "opacity-100" : "opacity-0",
                            )}
                            aria-hidden
                          >
                            ✳
                          </span>
                        </span>
                        <span className="hidden text-[0.68rem] text-ink/68 sm:block">
                          {occasionLabel(template.occasion)}
                        </span>
                        <span className="hidden text-right font-meta text-[0.52rem] uppercase tracking-[0.1em] text-ink/56 sm:block">
                          {fontPairById(template.fontPair).note.split(" ")[0]}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
              <p className="mt-5 max-w-[26rem] text-[0.78rem] leading-relaxed text-ink/64">
                Hover a design to see it on the board. Every design also exists in
                Arabic, set right-to-left in Amiri.
              </p>
            </div>

            {/* board */}
            <div className="order-first lg:order-none">
              <div className="lg:sticky lg:top-8">
                <div className="flex items-baseline justify-between border-b border-ink/25 pb-2 font-meta text-[0.52rem] uppercase tracking-[0.12em] text-ink/64">
                  <span>On the board</span>
                  <span>{activeTemplate.name}</span>
                </div>
                <div className="proof mt-4 p-5 sm:p-7">
                  <motion.div
                    key={activeId}
                    initial={reduce ? false : { opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.35 }}
                    className="editorial-shadow mx-auto max-w-[400px]"
                  >
                    <InvitationCanvas content={activeContent} />
                  </motion.div>
                </div>
                <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <p className="font-display text-2xl leading-none">
                      {activeTemplate.name}
                    </p>
                    <p className="mt-2 max-w-[22rem] text-[0.8rem] leading-relaxed text-ink/68">
                      {activeTemplate.description}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-3">
                    <div className="text-right font-meta text-[0.52rem] uppercase leading-relaxed tracking-[0.1em] text-ink/60">
                      <p>{occasionLabel(activeTemplate.occasion)}</p>
                      <p>{formatEventDateShort(activeContent.date)}</p>
                      <p>{fontPairById(activeTemplate.fontPair).note}</p>
                    </div>
                    <Link
                      to={templateHref(activeId)}
                      className="inline-flex items-center gap-2 border-b border-ink/40 pb-1 text-[0.64rem] uppercase tracking-[0.14em] text-ink transition-colors hover:border-[var(--red)] hover:text-[var(--red)]"
                    >
                      Compose with this design
                      <ArrowUpRight className="size-3.5" />
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ---------------------------------------------------------------- */}
        {/* Method: numbered ledger, no feature cards.                        */}
        {/* ---------------------------------------------------------------- */}
        <section
          id="method"
          className="border-y border-ink/20 bg-[var(--paper-deep)]/55"
        >
          <div className="mx-auto w-full max-w-[1480px] px-5 py-20 sm:px-8 lg:px-12 lg:py-28">
            <div className="grid gap-10 lg:grid-cols-[0.72fr_1.28fr] lg:gap-20">
              <Rise>
                <SectionLabel index="03">The method</SectionLabel>
                <h2 className="mt-6 max-w-[22rem] font-display text-[clamp(2.5rem,4.8vw,3.9rem)] leading-[0.95] tracking-[-0.015em]">
                  Three sittings,
                  <br />
                  then it&rsquo;s
                  <br />
                  sent.
                </h2>
                <p className="mt-6 max-w-[21rem] text-[0.88rem] leading-[1.8] text-ink/72">
                  No dashboards to learn, no setup wizard. The studio is one page
                  per invitation, and it saves as you write.
                </p>
              </Rise>

              <div>
                {[
                  {
                    title: "Choose a design",
                    copy: "Start from the collection, or from your occasion. The palette, type, motif, and opening gesture are all changeable later.",
                    meta: "≈ 1 minute",
                  },
                  {
                    title: "Compose the details",
                    copy: "Names, date, venue, schedule, dress code, photographs, a note to your guests. A live proof sits beside you the whole time.",
                    meta: "≈ 15 minutes",
                  },
                  {
                    title: "Address it, then publish",
                    copy: "Paste your guest list and LAMSA writes a personal link for each name. Publish once; replies land back in the studio.",
                    meta: "≈ 5 minutes",
                  },
                ].map((step, index) => (
                  <Rise key={step.title} delay={index * 0.06}>
                    <div className="grid grid-cols-[2.75rem_1fr] gap-4 border-t border-ink/20 py-7 first:border-t-0 first:pt-0 sm:grid-cols-[3.5rem_1fr_7rem] sm:gap-6">
                      <span className="font-display text-[2rem] leading-none text-[var(--red)]">
                        {String(index + 1).padStart(2, "0")}
                      </span>
                      <div>
                        <h3 className="font-display text-[1.6rem] leading-tight">
                          {step.title}
                        </h3>
                        <p className="mt-2 max-w-[30rem] text-[0.86rem] leading-[1.75] text-ink/72">
                          {step.copy}
                        </p>
                      </div>
                      <span className="col-start-2 font-meta text-[0.52rem] uppercase tracking-[0.12em] text-ink/56 sm:col-start-3 sm:text-right">
                        {step.meta}
                      </span>
                    </div>
                  </Rise>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ---------------------------------------------------------------- */}
        {/* Guests: a real guest ledger, addressed by name.                   */}
        {/* ---------------------------------------------------------------- */}
        <section
          id="guests"
          className="mx-auto w-full max-w-[1480px] px-5 py-20 sm:px-8 lg:px-12 lg:py-28"
        >
          <div className="grid items-center gap-12 lg:grid-cols-[1.05fr_0.95fr] lg:gap-20">
            <Rise>
              <SectionLabel index="04">Addressed by name</SectionLabel>
              <h2 className="mt-6 max-w-[34rem] font-display text-[clamp(2.6rem,5.2vw,4.3rem)] leading-[0.93] tracking-[-0.015em]">
                One invitation.
                <br />
                <span className="text-[var(--red)]">Fourteen names</span> on the
                envelope.
              </h2>
              <p className="mt-7 max-w-[29rem] text-[0.92rem] leading-[1.8] text-ink/65">
                Add your guests once and every one of them receives a private door
                into the same invitation. Their name is on it when it opens. You
                can see who has looked, who has replied, and who needs a gentle
                reminder — without a spreadsheet.
              </p>
              <div className="mt-8 flex flex-wrap items-center gap-x-8 gap-y-3">
                <Link
                  to={STUDIO_HREF}
                  className="inline-flex items-center gap-2 border-b border-ink pb-1 text-[0.66rem] uppercase tracking-[0.14em] transition-colors hover:border-[var(--red)] hover:text-[var(--red)]"
                >
                  Open a guest list
                  <ArrowRight className="size-3.5" />
                </Link>
                <span className="font-meta text-[0.54rem] uppercase tracking-[0.12em] text-ink/56">
                  Included · no extra cost
                </span>
              </div>
            </Rise>

            <Rise delay={0.08}>
              <div className="border border-ink/25 bg-[var(--paper-light)] p-5 press sm:p-7">
                <div className="flex items-baseline justify-between border-b border-ink/20 pb-3">
                  <p className="font-meta text-[0.54rem] uppercase tracking-[0.14em] text-ink/60">
                    Guest ledger
                  </p>
                  <p className="font-meta text-[0.54rem] uppercase tracking-[0.14em] text-ink/60">
                    A &amp; J · 09.05
                  </p>
                </div>
                <ul className="divide-y divide-ink/10">
                  {[
                    ["Amara & Julian", "Replied · yes", "2"],
                    ["The Bennett family", "Opened", "4"],
                    ["Noor Haddad", "Replied · yes", "1"],
                    ["Sofia & Elias", "Not yet opened", "2"],
                    ["Ines Moreau", "Replied · yes", "2"],
                    ["The Haddad cousins", "Not yet opened", "5"],
                  ].map(([name, status, seats], index) => (
                    <li
                      key={name}
                      className="grid grid-cols-[1.5rem_1fr_auto] items-center gap-3 py-3"
                    >
                      <span className="font-meta text-[0.55rem] text-ink/48">
                        {String(index + 1).padStart(2, "0")}
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate font-display text-[1.15rem] leading-tight">
                          {name}
                        </span>
                        <span className="mt-0.5 block font-meta text-[0.48rem] uppercase tracking-[0.1em] text-ink/60">
                          {status}
                        </span>
                      </span>
                      <span className="font-meta text-[0.55rem] text-ink/64">
                        {seats} <span className="text-ink/48">seats</span>
                      </span>
                    </li>
                  ))}
                </ul>
                <div className="mt-4 flex items-center justify-between border-t border-ink/20 pt-3 font-meta text-[0.52rem] uppercase tracking-[0.12em]">
                  <span className="text-ink/60">3 replies · 14 seats</span>
                  <span className="text-[var(--olive)]">Live</span>
                </div>
              </div>
            </Rise>
          </div>
        </section>

        {/* ---------------------------------------------------------------- */}
        {/* Occasions: a plain line of alternatives.                         */}
        {/* ---------------------------------------------------------------- */}
        <section className="border-t border-ink/20">
          <div className="mx-auto flex w-full max-w-[1480px] flex-wrap items-center gap-x-6 gap-y-3 px-5 py-7 font-meta text-[0.56rem] uppercase tracking-[0.14em] text-ink/64 sm:px-8 lg:px-12">
            <span className="text-ink/52">Built for</span>
            {OCCASIONS.filter((item) => item.id !== "other").map((item) => (
              <span key={item.id} className="flex items-center gap-6">
                <Link
                  to={STUDIO_HREF}
                  className="transition-colors hover:text-[var(--red)]"
                >
                  {item.label}
                </Link>
                <span className="text-ink/20">·</span>
              </span>
            ))}
            <Link
              to={STUDIO_HREF}
              className="text-[var(--red)] transition-opacity hover:opacity-70"
            >
              and everything else
            </Link>
          </div>
        </section>

        {/* ---------------------------------------------------------------- */}
        {/* Closing                                                          */}
        {/* ---------------------------------------------------------------- */}
        <section className="relative overflow-hidden bg-[var(--ink)] text-[#f2f1ed]">
          <div
            aria-hidden
            className="paper-grain absolute inset-0 opacity-[0.05] mix-blend-screen"
          />
          <div
            aria-hidden
            className="absolute inset-x-0 top-0 h-px bg-[#f2f1ed]/15"
          />
          <div className="relative mx-auto grid w-full max-w-[1480px] gap-12 px-5 py-20 sm:px-8 lg:grid-cols-[1.2fr_0.8fr] lg:items-end lg:px-12 lg:py-28">
            <div>
              <div className="flex items-center gap-3">
                <span className="font-meta text-[0.58rem] text-[var(--red)]">
                  05
                </span>
                <span className="h-px w-6 bg-[#f2f1ed]/30" />
                <span className="eyebrow text-[#f2f1ed]/50">
                  The first one is free
                </span>
              </div>
              <h2 className="mt-7 max-w-[42rem] font-display text-[clamp(3rem,6.6vw,5.6rem)] leading-[0.88] tracking-[-0.02em]">
                Send something
                <br />
                worth keeping.
              </h2>
              <p className="mt-7 max-w-[26rem] text-[0.9rem] leading-[1.8] text-[#f2f1ed]/60">
                Compose it tonight. The proof is live, the PIN is yours, and the
                link is ready when you are.
              </p>
            </div>
            <div className="flex flex-col items-start gap-5 lg:items-end">
              <Button
                asChild
                size="lg"
                className="h-12 border-[#f2f1ed] bg-[#f2f1ed] px-7 text-[var(--ink)] hover:border-white hover:bg-white hover:text-[var(--ink)]"
              >
                <Link to={STUDIO_HREF}>
                  Enter the studio
                  <ArrowRight className="size-4" />
                </Link>
              </Button>
              <div className="flex flex-col gap-2 font-meta text-[0.54rem] uppercase leading-relaxed tracking-[0.12em] text-[#f2f1ed]/40 lg:text-right">
                <span>Email verified once</span>
                <span>No card to begin</span>
                <span>Your work is private to your PIN</span>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="relative z-10 bg-[var(--ink)] text-[#f2f1ed]">
        <div className="mx-auto w-full max-w-[1480px] border-t border-[#f2f1ed]/12 px-5 py-10 sm:px-8 lg:px-12">
          <div className="flex flex-col gap-8 md:flex-row md:items-start md:justify-between">
            <div>
              <Wordmark tone="paper" className="h-[24px]" />
              <p className="mt-3 max-w-[18rem] text-[0.74rem] leading-relaxed text-[#f2f1ed]/45">
                An invitation atelier. Composed in Tangier, opened wherever your
                guests are.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-x-12 gap-y-3 text-[0.7rem] text-[#f2f1ed]/60 sm:grid-cols-3">
              <a href="#collection" className="hover:text-[#f2f1ed]">
                Collection
              </a>
              <a href="#method" className="hover:text-[#f2f1ed]">
                Method
              </a>
              <a href="#guests" className="hover:text-[#f2f1ed]">
                Guest list
              </a>
              <Link to={STUDIO_HREF} className="hover:text-[#f2f1ed]">
                Studio
              </Link>
              <Link to={STUDIO_HREF} className="hover:text-[#f2f1ed]">
                Start
              </Link>
              <span className="text-[#f2f1ed]/30">© 2026 LAMSA</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
