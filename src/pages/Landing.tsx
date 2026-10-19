import { BrandLink } from "@/components/brand/Wordmark";
import { InvitationCanvas } from "@/components/invitation/InvitationCanvas";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import {
  formatEventDateShort,
  occasionLabel,
  OCCASIONS,
  templateById,
  type Occasion,
  type InvitationContent,
} from "@/lib/invitation";
import { cn } from "@/lib/utils";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight, ArrowUpRight, Check, Menu, X } from "lucide-react";
import { useState, type ReactNode } from "react";
import { Link } from "react-router";

const SHOWCASE_IDS = ["the-vow", "jubilee", "laurel", "nocturne"];
const HERO_DATE_OFFSET = 128;

function sampleContent(templateId: string): InvitationContent {
  const template = templateById(templateId);
  const date = new Date();
  date.setDate(date.getDate() + HERO_DATE_OFFSET);
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

function Reveal({
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
      initial={{ opacity: 0, y: 22 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-70px" }}
      transition={{ duration: 0.75, delay, ease: [0.16, 1, 0.3, 1] }}
    >
      {children}
    </motion.div>
  );
}

export default function Landing() {
  const { isAuthenticated } = useAuth();
  const reduce = useReducedMotion();
  const [menuOpen, setMenuOpen] = useState(false);
  const [occasion, setOccasion] = useState<Occasion>("wedding");

  const studioHref = isAuthenticated ? "/dashboard" : "/auth?returnTo=/dashboard";
  const templateHref = (templateId: string) =>
    isAuthenticated
      ? `/dashboard?template=${templateId}`
      : `/auth?returnTo=${encodeURIComponent(`/dashboard?template=${templateId}`)}`;

  const occasionTemplateIds: Record<Occasion, string> = {
    wedding: "the-vow",
    engagement: "amber-hands",
    birthday: "jubilee",
    graduation: "laurel",
    other: "nocturne",
  };
  const occasionContent = sampleContent(occasionTemplateIds[occasion]);

  const nav = [
    { label: "Collection", href: "#collection" },
    { label: "Occasions", href: "#occasions" },
    { label: "The studio", href: "#studio" },
  ];

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-background">
      <div
        aria-hidden
        className="paper-grain pointer-events-none fixed inset-0 z-0 opacity-[0.035]"
      />

      <header className="relative z-40">
        <div className="mx-auto flex h-20 w-full max-w-[1440px] items-center justify-between px-5 sm:px-8 lg:px-12">
          <BrandLink />
          <nav className="hidden items-center gap-9 md:flex">
            {nav.map((item) => (
              <a
                key={item.href}
                href={item.href}
                className="eyebrow text-foreground/60 transition-colors hover:text-foreground"
              >
                {item.label}
              </a>
            ))}
          </nav>
          <div className="flex items-center gap-3">
            <Button
              asChild
              variant="ghost"
              className="hidden rounded-none px-0 text-[0.7rem] uppercase tracking-[0.22em] hover:bg-transparent sm:inline-flex"
            >
              <Link to={studioHref}>
                Enter the studio
                <ArrowUpRight className="size-3.5" />
              </Link>
            </Button>
            <Button
              asChild
              size="sm"
              className="rounded-none bg-primary px-5 text-[0.64rem] uppercase tracking-[0.22em]"
            >
              <Link to={templateHref("the-vow")}>Begin</Link>
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
          <div className="border-t border-border/70 bg-background px-5 py-5 md:hidden">
            <div className="flex flex-col gap-4">
              {nav.map((item) => (
                <a
                  key={item.href}
                  href={item.href}
                  onClick={() => setMenuOpen(false)}
                  className="eyebrow text-foreground/70"
                >
                  {item.label}
                </a>
              ))}
              <Link
                to={studioHref}
                onClick={() => setMenuOpen(false)}
                className="eyebrow text-foreground"
              >
                Enter the studio
              </Link>
            </div>
          </div>
        )}
      </header>

      <main className="relative z-10">
        {/* HERO */}
        <section className="mx-auto grid w-full max-w-[1440px] items-center gap-16 px-5 pb-20 pt-10 sm:px-8 sm:pt-16 lg:grid-cols-[1.02fr_0.98fr] lg:gap-8 lg:px-12 lg:pb-28 lg:pt-20">
          <div className="max-w-[620px]">
            <motion.p
              initial={reduce ? false : { opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7 }}
              className="eyebrow flex items-center gap-3 text-foreground/55"
            >
              <span className="h-px w-8 bg-[var(--gold)]" />
              Digital invitations · Made one by one
            </motion.p>

            <motion.h1
              initial={reduce ? false : { opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.9, delay: 0.08, ease: [0.16, 1, 0.3, 1] }}
              className="mt-7 font-display text-[clamp(3.3rem,10.5vw,7.6rem)] leading-[0.88] tracking-[-0.025em] text-foreground"
            >
              Invitations,
              <span className="mt-1 block italic text-[var(--olive)]">
                considered.
              </span>
            </motion.h1>

            <motion.p
              initial={reduce ? false : { opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.18 }}
              className="mt-8 max-w-[29rem] text-[0.95rem] leading-[1.85] text-muted-foreground"
            >
              For weddings, engagements, birthdays, graduations — and every
              occasion that deserves more than a group chat. Compose it once,
              then send each guest their own quietly personal moment.
            </motion.p>

            <motion.div
              initial={reduce ? false : { opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.28 }}
              className="mt-10 flex flex-col items-start gap-5 sm:flex-row sm:items-center"
            >
              <Button
                asChild
                size="lg"
                className="h-12 w-full rounded-none bg-primary px-8 text-[0.68rem] uppercase tracking-[0.24em] sm:w-auto"
              >
                <Link to={studioHref}>
                  Create an invitation
                  <ArrowRight className="size-4" />
                </Link>
              </Button>
              <a
                href="#collection"
                className="group inline-flex items-center gap-3 text-[0.68rem] uppercase tracking-[0.24em] text-foreground/65 transition-colors hover:text-foreground"
              >
                See the collection
                <span className="h-px w-9 bg-foreground/30 transition-all group-hover:w-12 group-hover:bg-foreground/60" />
              </a>
            </motion.div>

            <motion.p
              initial={reduce ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 1, delay: 0.5 }}
              className="mt-8 flex flex-wrap items-center gap-x-4 gap-y-2 text-[0.66rem] uppercase tracking-[0.16em] text-muted-foreground/75"
            >
              <span>Email sign-in</span>
              <span className="size-1 rounded-full bg-muted-foreground/40" />
              <span>No passwords</span>
              <span className="size-1 rounded-full bg-muted-foreground/40" />
              <span>One link, every guest</span>
            </motion.p>
          </div>

          <div className="relative mx-auto w-full max-w-[520px] lg:max-w-none">
            <div
              aria-hidden
              className="absolute left-1/2 top-[6%] h-[88%] w-[80%] -translate-x-1/2 rounded-t-full border border-[var(--olive)]/20 bg-[var(--paper-deep)]/50"
            />
            <div className="relative mx-auto flex h-[430px] max-w-[430px] items-center justify-center sm:h-[540px] lg:h-[610px]">
              <motion.div
                aria-hidden
                className="absolute left-0 top-[15%] w-[52%] max-w-[250px] rotate-[-9deg]"
                animate={reduce ? undefined : { y: [0, -8, 0] }}
                transition={{ duration: 11, repeat: Infinity, ease: "easeInOut" }}
              >
                <div className="editorial-shadow">
                  <InvitationCanvas content={sampleContent("amber-hands")} />
                </div>
              </motion.div>

              <motion.div
                className="absolute right-0 top-[4%] w-[62%] max-w-[300px] rotate-[5deg]"
                animate={reduce ? undefined : { y: [0, -13, 0] }}
                transition={{
                  duration: 9,
                  repeat: Infinity,
                  ease: "easeInOut",
                  delay: 0.6,
                }}
              >
                <div className="editorial-shadow">
                  <InvitationCanvas content={sampleContent("the-vow")} />
                </div>
              </motion.div>

              <motion.div
                className="absolute bottom-[1%] left-[6%] w-[48%] max-w-[224px] rotate-[-4deg]"
                animate={reduce ? undefined : { y: [0, -6, 0] }}
                transition={{
                  duration: 13,
                  repeat: Infinity,
                  ease: "easeInOut",
                  delay: 1.2,
                }}
              >
                <div className="editorial-shadow">
                  <InvitationCanvas content={sampleContent("jubilee")} />
                </div>
              </motion.div>

              <div className="absolute bottom-[5%] right-0 hidden max-w-[180px] border border-border/70 bg-card/90 px-4 py-3 backdrop-blur-sm sm:block">
                <p className="eyebrow text-[0.52rem] text-muted-foreground">
                  Personal guest link
                </p>
                <p className="mt-1.5 font-display text-lg italic leading-tight">
                  For Amara & Julian
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* MANIFESTO */}
        <section id="studio" className="border-y border-border/70 bg-[#f8f3e9]/60">
          <div className="mx-auto grid w-full max-w-[1440px] gap-12 px-5 py-16 sm:px-8 lg:grid-cols-[0.85fr_1.15fr] lg:gap-20 lg:px-12 lg:py-24">
            <Reveal>
              <p className="eyebrow text-foreground/50">A quieter way to invite</p>
              <h2 className="mt-6 max-w-[24rem] font-display text-[clamp(2.3rem,4.5vw,3.6rem)] leading-[1.02] tracking-[-0.02em]">
                Some moments ask for more than an{" "}
                <span className="italic text-[var(--olive)]">email.</span>
              </h2>
            </Reveal>
            <div className="grid gap-10 sm:grid-cols-3 lg:gap-8">
              {[
                {
                  title: "Composed, not templated",
                  copy: "Choose a design and make it entirely your own — type, colour, motif, and words.",
                },
                {
                  title: "Every guest, named",
                  copy: "Each invitation carries one guest's name and one private link they can keep.",
                },
                {
                  title: "A moment, not a feed",
                  copy: "A cinematic opening, elegant details, and nothing that looks like social media.",
                },
              ].map((item, index) => (
                <Reveal key={item.title} delay={index * 0.08}>
                  <p className="font-display text-2xl italic text-[var(--gold)]">
                    0{index + 1}
                  </p>
                  <div className="mt-4 h-px w-full bg-border" />
                  <h3 className="mt-5 font-display text-[1.35rem] leading-tight">
                    {item.title}
                  </h3>
                  <p className="mt-3 text-[0.83rem] leading-[1.8] text-muted-foreground">
                    {item.copy}
                  </p>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* COLLECTION */}
        <section
          id="collection"
          className="mx-auto w-full max-w-[1440px] px-5 py-20 sm:px-8 lg:px-12 lg:py-28"
        >
          <Reveal className="flex flex-col justify-between gap-6 sm:flex-row sm:items-end">
            <div>
              <p className="eyebrow text-foreground/50">The collection</p>
              <h2 className="mt-5 font-display text-[clamp(2.4rem,5vw,4.2rem)] leading-[0.98] tracking-[-0.02em]">
                Designs with a point of view.
              </h2>
            </div>
            <p className="max-w-[21rem] text-[0.84rem] leading-[1.8] text-muted-foreground">
              Eight starting points, each one a complete composition. Every
              detail remains yours to change.
            </p>
          </Reveal>

          <div className="mt-12 grid gap-x-6 gap-y-12 sm:grid-cols-2 lg:mt-16 lg:grid-cols-4">
            {SHOWCASE_IDS.map((templateId, index) => {
              const template = templateById(templateId);
              const content = sampleContent(templateId);
              return (
                <Reveal key={templateId} delay={index * 0.06}>
                  <Link
                    to={templateHref(templateId)}
                    className="group block focus-visible:outline-none"
                  >
                    <div className="relative overflow-hidden">
                      <div className="transition-transform duration-700 ease-out group-hover:scale-[1.018]">
                        <InvitationCanvas content={content} />
                      </div>
                      <span className="absolute inset-x-0 bottom-0 flex items-center justify-between bg-gradient-to-t from-black/35 to-transparent px-4 pb-3 pt-10 text-[0.6rem] uppercase tracking-[0.2em] text-white opacity-0 transition-opacity duration-500 group-hover:opacity-100">
                        Make it yours
                        <ArrowUpRight className="size-3.5" />
                      </span>
                    </div>
                    <div className="mt-4 flex items-baseline justify-between gap-3 border-t border-border/70 pt-3">
                      <span className="font-display text-xl">{template.name}</span>
                      <span className="eyebrow text-[0.55rem] text-muted-foreground">
                        {occasionLabel(template.occasion)}
                      </span>
                    </div>
                    <p className="mt-1 text-[0.72rem] text-muted-foreground/80">
                      {formatEventDateShort(content.date)}
                    </p>
                  </Link>
                </Reveal>
              );
            })}
          </div>
        </section>

        {/* OCCASIONS */}
        <section
          id="occasions"
          className="border-y border-border/70 bg-[var(--paper-deep)]/60"
        >
          <div className="mx-auto grid w-full max-w-[1440px] gap-14 px-5 py-20 sm:px-8 lg:grid-cols-2 lg:gap-24 lg:px-12 lg:py-28">
            <div>
              <Reveal>
                <p className="eyebrow text-foreground/50">For every occasion</p>
                <h2 className="mt-5 max-w-[26rem] font-display text-[clamp(2.4rem,5vw,4rem)] leading-[1] tracking-[-0.02em]">
                  One studio, every kind of celebration.
                </h2>
              </Reveal>
              <div className="mt-10 border-t border-border/80">
                {OCCASIONS.map((item, index) => {
                  const active = occasion === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setOccasion(item.id)}
                      className={cn(
                        "group flex w-full items-center justify-between border-b border-border/80 py-5 text-left transition-colors",
                        active ? "text-foreground" : "text-foreground/55 hover:text-foreground",
                      )}
                    >
                      <span className="flex items-baseline gap-4">
                        <span className="font-display text-sm italic text-[var(--gold)]">
                          0{index + 1}
                        </span>
                        <span className="font-display text-[clamp(1.5rem,2.6vw,2rem)] leading-none">
                          {item.label}
                        </span>
                      </span>
                      <ArrowRight
                        className={cn(
                          "size-4 transition-all",
                          active
                            ? "translate-x-0 opacity-100"
                            : "-translate-x-2 opacity-0 group-hover:translate-x-0 group-hover:opacity-60",
                        )}
                      />
                    </button>
                  );
                })}
              </div>
              <p className="mt-6 max-w-[24rem] text-[0.8rem] leading-[1.8] text-muted-foreground">
                Wedding vows and first birthdays. Graduation mornings and
                anniversary dinners. If it matters to you, it belongs here.
              </p>
            </div>

            <Reveal className="mx-auto w-full max-w-[400px] lg:max-w-[440px]">
              <motion.div
                key={occasion}
                initial={reduce ? false : { opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.45, ease: "easeOut" }}
                className="editorial-shadow"
              >
                <InvitationCanvas content={occasionContent} />
              </motion.div>
              <div className="mt-4 flex items-center justify-between">
                <p className="eyebrow text-[0.55rem] text-muted-foreground">
                  {templateById(occasionTemplateIds[occasion]).name}
                </p>
                <Link
                  to={templateHref(occasionTemplateIds[occasion])}
                  className="text-[0.62rem] uppercase tracking-[0.2em] text-foreground/70 underline-offset-4 hover:underline"
                >
                  Start with this design
                </Link>
              </div>
            </Reveal>
          </div>
        </section>

        {/* PERSONAL */}
        <section className="mx-auto w-full max-w-[1440px] px-5 py-20 sm:px-8 lg:px-12 lg:py-28">
          <div className="grid items-center gap-14 lg:grid-cols-[1fr_0.9fr] lg:gap-24">
            <Reveal>
              <p className="eyebrow text-foreground/50">Personally addressed</p>
              <h2 className="mt-5 max-w-[30rem] font-display text-[clamp(2.5rem,5.2vw,4.4rem)] leading-[0.98] tracking-[-0.02em]">
                Every guest should feel like the{" "}
                <span className="italic text-[var(--olive)]">only guest.</span>
              </h2>
              <p className="mt-7 max-w-[27rem] text-[0.9rem] leading-[1.9] text-muted-foreground">
                Add names to your guest list and LAMSA creates a unique link for
                each one — a private door into the same beautiful invitation.
                Their name appears as they open it.
              </p>
              <div className="mt-8 flex items-center gap-5">
                <Button
                  asChild
                  variant="outline"
                  className="h-11 rounded-none border-foreground/25 bg-transparent px-6 text-[0.64rem] uppercase tracking-[0.22em]"
                >
                  <Link to={studioHref}>
                    Try a guest list
                    <ArrowRight className="size-3.5" />
                  </Link>
                </Button>
                <span className="text-[0.66rem] uppercase tracking-[0.16em] text-muted-foreground">
                  Included, always
                </span>
              </div>
            </Reveal>

            <Reveal delay={0.1} className="relative mx-auto w-full max-w-[420px]">
              <div className="border border-border/80 bg-card/70 p-6 sm:p-8">
                <div className="flex items-center justify-between">
                  <p className="eyebrow text-[0.55rem] text-muted-foreground">
                    Guest list
                  </p>
                  <p className="eyebrow text-[0.55rem] text-muted-foreground">
                    Example · 14 named
                  </p>
                </div>
                <div className="mt-5">
                  {[
                    "Amara & Julian",
                    "The Bennett family",
                    "Noor Haddad",
                    "Sofia & Elias",
                    "Ines Moreau",
                  ].map((name, index) => (
                    <div
                      key={name}
                      className="flex items-center justify-between border-b border-border/60 py-3.5 last:border-0"
                    >
                      <span className="font-display text-lg leading-none">{name}</span>
                      <span className="flex items-center gap-2 text-[0.58rem] uppercase tracking-[0.16em] text-muted-foreground">
                        {index < 2 ? (
                          <>
                            <Check className="size-3 text-[var(--olive)]" />
                            Opened
                          </>
                        ) : (
                          "Private link"
                        )}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="absolute -bottom-5 -right-2 hidden border border-border/80 bg-background px-4 py-3 sm:block">
                <p className="eyebrow text-[0.5rem] text-muted-foreground">
                  Personal note
                </p>
                <p className="mt-1 font-display text-base italic">
                  &ldquo;For Amara, with love.&rdquo;
                </p>
              </div>
            </Reveal>
          </div>
        </section>

        {/* HOW IT WORKS */}
        <section className="border-t border-border/70">
          <div className="mx-auto w-full max-w-[1440px] px-5 py-20 sm:px-8 lg:px-12 lg:py-24">
            <Reveal>
              <p className="eyebrow text-foreground/50">The process</p>
              <h2 className="mt-5 max-w-[32rem] font-display text-[clamp(2.2rem,4.4vw,3.5rem)] leading-[1.04] tracking-[-0.02em]">
                From a name to an heirloom in three quiet steps.
              </h2>
            </Reveal>
            <div className="mt-12 grid gap-10 md:grid-cols-3 lg:mt-16">
              {[
                {
                  title: "Choose a design",
                  copy: "Begin with a template for your occasion, or make one entirely your own.",
                },
                {
                  title: "Compose the details",
                  copy: "Names, date, venue, words, type, and colour — saved as you go, previewed live.",
                },
                {
                  title: "Publish & share",
                  copy: "Publish once, then share the main link or a personal link for every guest.",
                },
              ].map((step, index) => (
                <Reveal key={step.title} delay={index * 0.08}>
                  <div className="flex items-center gap-3">
                    <span className="font-display text-4xl italic text-[var(--gold)]">
                      0{index + 1}
                    </span>
                    <span className="h-px flex-1 bg-border" />
                  </div>
                  <h3 className="mt-6 font-display text-2xl">{step.title}</h3>
                  <p className="mt-3 max-w-[19rem] text-[0.84rem] leading-[1.8] text-muted-foreground">
                    {step.copy}
                  </p>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* CLOSING */}
        <section className="px-3 pb-3 sm:px-5 sm:pb-5">
          <div className="relative overflow-hidden bg-[#26271f] text-[#f5efe2]">
            <div
              aria-hidden
              className="paper-grain absolute inset-0 opacity-[0.08] mix-blend-screen"
            />
            <div
              aria-hidden
              className="absolute -right-24 -top-24 size-[420px] rounded-full border border-[#c6b692]/15"
            />
            <div
              aria-hidden
              className="absolute -right-10 -top-10 size-[240px] rounded-full border border-[#c6b692]/15"
            />
            <div className="relative mx-auto flex w-full max-w-[1440px] flex-col gap-12 px-6 py-20 sm:px-10 lg:flex-row lg:items-end lg:justify-between lg:px-16 lg:py-28">
              <div>
                <p className="eyebrow text-[#f5efe2]/45">Begin here</p>
                <h2 className="mt-6 max-w-[38rem] font-display text-[clamp(3rem,7vw,5.6rem)] leading-[0.92] tracking-[-0.025em]">
                  Invite them
                  <span className="block italic text-[#c6b692]">beautifully.</span>
                </h2>
                <p className="mt-7 max-w-[26rem] text-[0.88rem] leading-[1.85] text-[#f5efe2]/60">
                  One studio for the moments that matter. Create your first
                  invitation in a few quiet minutes.
                </p>
              </div>
              <div className="flex flex-col items-start gap-4">
                <Button
                  asChild
                  size="lg"
                  className="h-12 rounded-none bg-[#f5efe2] px-8 text-[0.66rem] uppercase tracking-[0.24em] text-[#26271f] hover:bg-white"
                >
                  <Link to={studioHref}>
                    Enter the studio
                    <ArrowRight className="size-4" />
                  </Link>
                </Button>
                <p className="text-[0.62rem] uppercase tracking-[0.18em] text-[#f5efe2]/35">
                  Free to begin · Publish in minutes
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="relative z-10 border-t border-border/70">
        <div className="mx-auto flex w-full max-w-[1440px] flex-col gap-8 px-5 py-10 sm:px-8 md:flex-row md:items-center md:justify-between lg:px-12">
          <div className="flex flex-col gap-3">
            <BrandLink />
            <p className="text-[0.68rem] uppercase tracking-[0.16em] text-muted-foreground">
              Made for the moments that matter.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-x-7 gap-y-3 text-[0.64rem] uppercase tracking-[0.18em] text-muted-foreground">
            <a href="#collection" className="hover:text-foreground">
              Collection
            </a>
            <a href="#occasions" className="hover:text-foreground">
              Occasions
            </a>
            <Link to={studioHref} className="hover:text-foreground">
              Studio
            </Link>
            <span className="text-muted-foreground/50">© 2026 LAMSA</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
