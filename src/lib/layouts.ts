import {
  TEMPLATE_DESIGN_FONTS,
  makeElement,
  makeId,
  defaultAnimation,
  type DesignElement,
  type DesignPage,
} from "@/lib/design";
import {
  formatEventDate,
  formatEventTime,
  type InvitationContent,
} from "@/lib/invitation";

export interface PageLayout {
  id: string;
  name: string;
  category: "Structure" | "Story" | "Details" | "Arabic" | "Stationery";
  note: string;
  /** Printed stationery carries its own physical page size, in canvas units. */
  size?: { width: number; height: number };
  build: (content: InvitationContent) => DesignPage;
}

const MM_TO_PX = 96 / 25.4;
const A6 = { width: Math.round(105 * MM_TO_PX), height: Math.round(148 * MM_TO_PX) };

/**
 * A matching insert: same papers and inks as the invitation, but a real A6
 * sheet with its own size, margin, and print-safe composition.
 */
function stationeryPage(
  name: string,
  content: InvitationContent,
  elements: DesignElement[],
  size = A6,
): DesignPage {
  return {
    id: makeId("page"),
    name,
    background: content.palette.background,
    elements,
    width: size.width,
    height: size.height,
    margin: Math.round(6 * MM_TO_PX),
    bleed: Math.round(3 * MM_TO_PX),
  };
}

const paired = (content: InvitationContent) =>
  [content.names.primary, content.names.secondary].filter(Boolean).join(" & ") ||
  "Your names";

function text(
  name: string,
  value: string,
  content: InvitationContent,
  options: Partial<DesignElement> = {},
  delay = 0,
): DesignElement {
  return makeElement("text", {
    name,
    text: value,
    font: TEMPLATE_DESIGN_FONTS[content.templateId] ?? content.fontPair,
    fontSize: 24,
    fontWeight: 400,
    letterSpacing: 0.12,
    lineHeight: 1.5,
    align: "center",
    color: content.palette.ink,
    ...options,
    animation: defaultAnimation(options.animation?.preset ?? "fadeUp", delay),
  });
}

function page(
  name: string,
  content: InvitationContent,
  elements: DesignElement[],
  background = content.palette.background,
): DesignPage {
  return {
    id: makeId("page"),
    name,
    background,
    elements,
  };
}

const dateLine = (content: InvitationContent) =>
  [formatEventDate(content.date), formatEventTime(content.time)]
    .filter(Boolean)
    .join(" · ");

export const PAGE_LAYOUTS: PageLayout[] = [
  {
    id: "cover",
    name: "Invitation cover",
    category: "Structure",
    note: "Eyebrow, names, rule, and date — the opening page.",
    build: (content) =>
      page("Cover", content, [
        makeElement("motif", {
          name: "Cover ornament",
          motif: content.motif === "none" ? "sprig" : content.motif,
          x: 430,
          y: 190,
          w: 140,
          h: 140,
          color: content.palette.accent,
          opacity: 0.7,
          animation: defaultAnimation("fade", 0),
        }),
        text(
          "Eyebrow",
          content.eyebrow || "You are invited",
          content,
          {
            y: 360,
            h: 50,
            fontSize: 17,
            letterSpacing: 0.34,
            uppercase: true,
            opacity: 0.75,
          },
          100,
        ),
        text("Names", paired(content), content, {
          y: 450,
          h: 240,
          fontSize: content.names.secondary ? 76 : 92,
          letterSpacing: -0.01,
          lineHeight: 1.05,
        }, 250),
        makeElement("shape", {
          name: "Cover rule",
          shape: "line",
          x: 430,
          y: 760,
          w: 140,
          h: 1.5,
          fill: content.palette.accent,
          opacity: 0.65,
          animation: defaultAnimation("draw", 500),
        }),
        text("Date", dateLine(content), content, {
          y: 810,
          h: 45,
          fontSize: 20,
          letterSpacing: 0.2,
          uppercase: true,
        }, 650),
        text(
          "Venue",
          [content.venueName, content.venueAddress].filter(Boolean).join("\n"),
          content,
          {
            y: 880,
            h: 100,
            fontSize: 14,
            letterSpacing: 0.2,
            uppercase: true,
            opacity: 0.6,
          },
          800,
        ),
      ]),
  },
  {
    id: "hosts",
    name: "Hosts & welcome",
    category: "Story",
    note: "An introduction from the hosts or families.",
    build: (content) =>
      page("Welcome", content, [
        text("Eyebrow", "Together with their families", content, {
          y: 230,
          h: 40,
          fontSize: 15,
          letterSpacing: 0.34,
          uppercase: true,
          opacity: 0.55,
        }),
        text("Host names", paired(content), content, {
          y: 320,
          h: 200,
          fontSize: 68,
          lineHeight: 1.06,
          letterSpacing: -0.01,
        }, 120),
        makeElement("motif", {
          name: "Welcome ornament",
          motif: content.cornerMotif && content.cornerMotif !== "none" ? content.cornerMotif : "wreath",
          x: 425,
          y: 560,
          w: 150,
          h: 150,
          color: content.palette.accent,
          opacity: 0.45,
          animation: defaultAnimation("fade", 260),
        }),
        text(
          "Welcome message",
          content.message || "We would be delighted to have you with us.",
          content,
          {
            y: 770,
            h: 220,
            fontSize: 25,
            italic: true,
            letterSpacing: 0,
            lineHeight: 1.7,
            opacity: 0.85,
          },
          380,
        ),
        text("Monogram", "LAMSA", content, {
          y: 1180,
          h: 30,
          fontSize: 12,
          letterSpacing: 0.45,
          uppercase: true,
          opacity: 0.35,
        }, 700),
      ]),
  },
  {
    id: "details",
    name: "Event details",
    category: "Details",
    note: "Date, time, venue, address, and dress code as editable type.",
    build: (content) =>
      page("Details", content, [
        text("Section title", "The details", content, {
          y: 200,
          h: 80,
          fontSize: 54,
          letterSpacing: -0.01,
        }),
        makeElement("shape", {
          name: "Details rule",
          shape: "line",
          x: 460,
          y: 310,
          w: 80,
          h: 1.5,
          fill: content.palette.accent,
          opacity: 0.7,
          animation: defaultAnimation("draw", 200),
        }),
        text("Date", formatEventDate(content.date), content, {
          y: 390,
          h: 60,
          fontSize: 30,
          letterSpacing: 0.16,
          uppercase: true,
        }, 250),
        text("Time", formatEventTime(content.time), content, {
          y: 470,
          h: 45,
          fontSize: 22,
          letterSpacing: 0.12,
          opacity: 0.72,
        }, 350),
        text("Venue", content.venueName, content, {
          y: 610,
          h: 55,
          fontSize: 28,
          letterSpacing: 0.04,
        }, 500),
        text("Address", content.venueAddress, content, {
          y: 680,
          h: 80,
          fontSize: 16,
          letterSpacing: 0.16,
          uppercase: true,
          opacity: 0.6,
        }, 600),
        ...(content.dressCode
          ? [
              text("Dress code", content.dressCode, content, {
                y: 900,
                h: 110,
                fontSize: 14,
                letterSpacing: 0.22,
                uppercase: true,
                opacity: 0.6,
              }, 750),
            ]
          : []),
        text("Signature", "LAMSA", content, {
          y: 1210,
          h: 28,
          fontSize: 11,
          letterSpacing: 0.4,
          uppercase: true,
          opacity: 0.3,
        }, 900),
      ]),
  },
  {
    id: "schedule",
    name: "Timeline & schedule",
    category: "Details",
    note: "A readable schedule built from the event's own timings.",
    build: (content) => {
      const rows =
        content.schedule && content.schedule.length > 0
          ? content.schedule.slice(0, 4)
          : [
              { time: "4:00", label: "Arrival" },
              { time: "5:00", label: "Ceremony" },
              { time: "7:00", label: "Dinner" },
            ];
      const elements: DesignElement[] = [
        text("Section title", "The day", content, {
          y: 170,
          h: 90,
          fontSize: 54,
        }),
        makeElement("shape", {
          name: "Schedule rule",
          shape: "line",
          x: 460,
          y: 285,
          w: 80,
          h: 1.5,
          fill: content.palette.accent,
          opacity: 0.7,
          animation: defaultAnimation("draw", 100),
        }),
      ];
      rows.forEach((row, index) => {
        const top = 380 + index * 190;
        elements.push(
          text("Time", row.time, content, {
            x: 160,
            y: top,
            w: 190,
            h: 50,
            align: "right",
            fontSize: 24,
            letterSpacing: 0.12,
            color: content.palette.accent,
          }, 200 + index * 150),
          makeElement("shape", {
            name: "Timeline dot",
            shape: "ellipse",
            x: 386,
            y: top + 12,
            w: 10,
            h: 10,
            fill: content.palette.accent,
            animation: defaultAnimation("scaleIn", 250 + index * 150),
          }),
          text("Moment", row.label, content, {
            x: 430,
            y: top - 4,
            w: 400,
            h: 105,
            align: "left",
            fontSize: 23,
            letterSpacing: 0.02,
            lineHeight: 1.45,
          }, 250 + index * 150),
        );
      });
      elements.push(
        text("Footer", "We cannot wait to celebrate with you.", content, {
          y: 1170,
          h: 80,
          fontSize: 17,
          italic: true,
          opacity: 0.6,
        }, 1000),
      );
      return page("Schedule", content, elements);
    },
  },
  {
    id: "location",
    name: "Location & directions",
    category: "Details",
    note: "Venue, address, and a directions line.",
    build: (content) =>
      page("Location", content, [
        makeElement("motif", {
          name: "Compass",
          motif: "compass",
          x: 440,
          y: 190,
          w: 120,
          h: 120,
          color: content.palette.accent,
          opacity: 0.7,
          animation: defaultAnimation("fade", 0),
        }),
        text("Section title", "Find us", content, {
          y: 350,
          h: 80,
          fontSize: 52,
        }, 100),
        text("Venue", content.venueName, content, {
          y: 500,
          h: 70,
          fontSize: 32,
        }, 250),
        text("Address", content.venueAddress, content, {
          y: 600,
          h: 100,
          fontSize: 17,
          letterSpacing: 0.16,
          uppercase: true,
          opacity: 0.65,
        }, 400),
        makeElement("shape", {
          name: "Location rule",
          shape: "line",
          x: 430,
          y: 800,
          w: 140,
          h: 1.5,
          fill: content.palette.accent,
          opacity: 0.55,
          animation: defaultAnimation("draw", 550),
        }),
        text(
          "Directions",
          content.mapUrl
            ? "Map and directions are available on the invitation page."
            : "Directions will be shared with your reply.",
          content,
          {
            y: 870,
            h: 90,
            fontSize: 17,
            italic: true,
            opacity: 0.65,
          },
          650,
        ),
        text("Parking", "Doors open thirty minutes before the ceremony.", content, {
          y: 1040,
          h: 70,
          fontSize: 13,
          letterSpacing: 0.2,
          uppercase: true,
          opacity: 0.45,
        }, 800),
      ]),
  },
  {
    id: "gallery",
    name: "Photo gallery",
    category: "Story",
    note: "Three portrait frames ready for your own photographs.",
    build: (content) =>
      page("Gallery", content, [
        text("Section title", "Moments", content, {
          y: 140,
          h: 80,
          fontSize: 46,
        }),
        ...[0, 1, 2].map((index) =>
          makeElement("image", {
            name: `Gallery photo ${index + 1}`,
            x: 140 + index * 250,
            y: 330 + (index % 2) * 60,
            w: 220,
            h: 300,
            fit: "cover",
            color: content.palette.accent,
            animation: defaultAnimation("scaleIn", 150 + index * 130),
          }),
        ),
        text(
          "Caption",
          "Add a photograph from the photos panel; each frame is independently croppable.",
          content,
          {
            y: 810,
            h: 100,
            fontSize: 15,
            italic: true,
            opacity: 0.55,
          },
          600,
        ),
        text("Footer", "A few of our favourite days.", content, {
          y: 1150,
          h: 60,
          fontSize: 14,
          letterSpacing: 0.2,
          uppercase: true,
          opacity: 0.4,
        }, 800),
      ]),
  },
  {
    id: "quote",
    name: "Message & quotation",
    category: "Story",
    note: "A large italic message with a signature rule.",
    build: (content) =>
      page("Message", content, [
        makeElement("motif", {
          name: "Quote ornament",
          motif: "peony",
          x: 450,
          y: 190,
          w: 100,
          h: 100,
          color: content.palette.accent,
          opacity: 0.6,
          animation: defaultAnimation("fade", 0),
        }),
        text(
          "Quotation",
          content.message || "The best moments are the ones we share.",
          content,
          {
            y: 400,
            h: 380,
            fontSize: 38,
            italic: true,
            letterSpacing: 0,
            lineHeight: 1.55,
          },
          150,
        ),
        makeElement("shape", {
          name: "Signature rule",
          shape: "line",
          x: 430,
          y: 880,
          w: 140,
          h: 1.5,
          fill: content.palette.accent,
          opacity: 0.65,
          animation: defaultAnimation("draw", 550),
        }),
        text("Signature", paired(content), content, {
          y: 930,
          h: 70,
          fontSize: 26,
          italic: true,
          letterSpacing: 0.02,
        }, 700),
        text("Host note", content.hostNotes || "With love", content, {
          y: 1100,
          h: 90,
          fontSize: 15,
          letterSpacing: 0.2,
          uppercase: true,
          opacity: 0.5,
        }, 900),
      ]),
  },
  {
    id: "rsvp",
    name: "RSVP & notes",
    category: "Details",
    note: "A reply section for the page before the closing.",
    build: (content) =>
      page("RSVP", content, [
        text("Section title", "Kindly reply", content, {
          y: 260,
          h: 90,
          fontSize: 48,
        }),
        text(
          "Deadline",
          content.rsvp?.deadline
            ? `By ${content.rsvp.deadline}`
            : "We would love to know if you can join us.",
          content,
          {
            y: 430,
            h: 100,
            fontSize: 24,
            letterSpacing: 0.06,
            opacity: 0.75,
          },
          150,
        ),
        makeElement("shape", {
          name: "RSVP rule",
          shape: "line",
          x: 450,
          y: 620,
          w: 100,
          h: 1.5,
          fill: content.palette.accent,
          opacity: 0.55,
          animation: defaultAnimation("draw", 400),
        }),
        text(
          "Reply note",
          content.rsvp?.askNote
            ? "Please leave a note for the hosts with your reply."
            : "Use the reply button on this invitation to respond.",
          content,
          {
            y: 700,
            h: 160,
            fontSize: 20,
            italic: true,
            opacity: 0.65,
          },
          500,
        ),
        text("Hosts", paired(content), content, {
          y: 1050,
          h: 70,
          fontSize: 24,
          letterSpacing: 0.08,
        }, 750),
      ]),
  },
  {
    id: "closing",
    name: "Closing page",
    category: "Structure",
    note: "A quiet final page that sits before the closing experience.",
    build: (content) =>
      page("Closing", content, [
        makeElement("motif", {
          name: "Closing ornament",
          motif: "star",
          x: 460,
          y: 300,
          w: 80,
          h: 80,
          color: content.palette.accent,
          opacity: 0.6,
          animation: defaultAnimation("fade", 0),
        }),
        text("Closing line", "With love,", content, {
          y: 500,
          h: 60,
          fontSize: 28,
          italic: true,
          opacity: 0.7,
        }, 120),
        text("Names", paired(content), content, {
          y: 610,
          h: 140,
          fontSize: 58,
          lineHeight: 1.1,
        }, 300),
        text("Date", formatEventDate(content.date), content, {
          y: 800,
          h: 50,
          fontSize: 16,
          letterSpacing: 0.28,
          uppercase: true,
          opacity: 0.45,
        }, 500),
        text("Signature", "LAMSA", content, {
          y: 1140,
          h: 30,
          fontSize: 11,
          letterSpacing: 0.5,
          uppercase: true,
          opacity: 0.3,
        }, 700),
      ]),
  },
  {
    id: "arabic-cover",
    name: "Arabic cover",
    category: "Arabic",
    note: "An RTL cover with a Naskh hand and right-aligned hierarchy.",
    build: (content) =>
      page("Arabic cover", content, [
        makeElement("motif", {
          name: "Arabic ornament",
          motif: "trellis",
          x: 380,
          y: 120,
          w: 240,
          h: 240,
          color: content.palette.accent,
          opacity: 0.35,
          animation: defaultAnimation("fade", 0),
        }),
        text(
          "Arabic eyebrow",
          content.eyebrow || "بكل فرح وسرور ندعوكم",
          content,
          {
            y: 430,
            h: 70,
            align: "right",
            direction: "rtl",
            font: "amiri",
            fontSize: 24,
            letterSpacing: 0,
            opacity: 0.8,
          },
          100,
        ),
        text(
          "Arabic names",
          paired(content),
          content,
          {
            y: 520,
            h: 220,
            align: "right",
            direction: "rtl",
            font: "scheherazade-new",
            fontSize: 78,
            letterSpacing: 0,
            lineHeight: 1.2,
          },
          250,
        ),
        makeElement("shape", {
          name: "Arabic rule",
          shape: "line",
          x: 620,
          y: 810,
          w: 300,
          h: 1.5,
          fill: content.palette.accent,
          opacity: 0.6,
          animation: defaultAnimation("draw", 500),
        }),
        text("Arabic date", dateLine(content), content, {
          y: 860,
          h: 50,
          align: "right",
          direction: "rtl",
          font: "amiri",
          fontSize: 20,
          letterSpacing: 0,
          opacity: 0.65,
        }, 650),
        text("Arabic venue", [content.venueName, content.venueAddress].filter(Boolean).join("\n"), content, {
          y: 930,
          h: 110,
          align: "right",
          direction: "rtl",
          font: "amiri",
          fontSize: 17,
          letterSpacing: 0,
          opacity: 0.55,
        }, 800),
      ]),
  },
  {
    id: "rsvp-card",
    name: "RSVP card",
    category: "Stationery",
    note: "A6 reply card with accept and decline boxes, sized for print.",
    size: A6,
    build: (content) =>
      stationeryPage("RSVP card", content, [
        text("Reply eyebrow", "Kindly reply", content, {
          x: 30,
          y: 34,
          w: 337,
          h: 20,
          fontSize: 9,
          letterSpacing: 0.34,
          uppercase: true,
          opacity: 0.7,
        }, 0),
        text("Reply names", paired(content), content, {
          x: 30,
          y: 62,
          w: 337,
          h: 66,
          fontSize: 26,
          lineHeight: 1.1,
          letterSpacing: 0,
        }, 80),
        makeElement("shape", {
          name: "Reply rule",
          shape: "line",
          x: 148,
          y: 142,
          w: 100,
          h: 1,
          fill: content.palette.accent,
          opacity: 0.6,
          animation: defaultAnimation("draw", 160),
        }),
        text("Name label", "Name", content, {
          x: 40,
          y: 178,
          w: 100,
          h: 18,
          fontSize: 8,
          align: "left",
          letterSpacing: 0.24,
          uppercase: true,
          opacity: 0.55,
        }, 220),
        makeElement("shape", {
          name: "Name line",
          shape: "line",
          x: 40,
          y: 208,
          w: 317,
          h: 1,
          fill: content.palette.ink,
          opacity: 0.35,
          animation: defaultAnimation("draw", 280),
        }),
        makeElement("shape", {
          name: "Accepts box",
          shape: "rect",
          x: 52,
          y: 260,
          w: 18,
          h: 18,
          radius: 2,
          stroke: content.palette.ink,
          strokeWidth: 0.8,
          fill: "transparent",
          opacity: 0.7,
          animation: defaultAnimation("fade", 340),
        }),
        text("Accepts", "Accepts with pleasure", content, {
          x: 82,
          y: 258,
          w: 230,
          h: 24,
          fontSize: 10,
          align: "left",
          letterSpacing: 0.06,
          opacity: 0.75,
        }, 340),
        makeElement("shape", {
          name: "Declines box",
          shape: "rect",
          x: 52,
          y: 296,
          w: 18,
          h: 18,
          radius: 2,
          stroke: content.palette.ink,
          strokeWidth: 0.8,
          fill: "transparent",
          opacity: 0.7,
          animation: defaultAnimation("fade", 400),
        }),
        text("Declines", "Declines with regret", content, {
          x: 82,
          y: 294,
          w: 230,
          h: 24,
          fontSize: 10,
          align: "left",
          letterSpacing: 0.06,
          opacity: 0.75,
        }, 400),
        text("Reply by", "Kindly reply by", content, {
          x: 40,
          y: 380,
          w: 317,
          h: 18,
          fontSize: 8,
          letterSpacing: 0.24,
          uppercase: true,
          opacity: 0.5,
        }, 460),
        text("Reply date", formatEventDate(content.date), content, {
          x: 40,
          y: 402,
          w: 317,
          h: 30,
          fontSize: 12,
          letterSpacing: 0.16,
          uppercase: true,
          opacity: 0.7,
        }, 480),
        makeElement("motif", {
          name: "Reply ornament",
          motif: content.motif === "none" ? "sprig" : content.motif,
          x: 172,
          y: 478,
          w: 54,
          h: 54,
          color: content.palette.accent,
          opacity: 0.5,
          animation: defaultAnimation("fade", 540),
        }),
      ]),
  },
  {
    id: "details-card",
    name: "Details card",
    category: "Stationery",
    note: "A6 information insert for the venue, time, and reception.",
    size: A6,
    build: (content) =>
      stationeryPage("Details card", content, [
        text("Details eyebrow", "The details", content, {
          x: 30,
          y: 34,
          w: 337,
          h: 20,
          fontSize: 9,
          letterSpacing: 0.34,
          uppercase: true,
          opacity: 0.65,
        }, 0),
        text("Details names", paired(content), content, {
          x: 30,
          y: 66,
          w: 337,
          h: 64,
          fontSize: 24,
          lineHeight: 1.1,
          letterSpacing: 0,
        }, 80),
        makeElement("shape", {
          name: "Details rule",
          shape: "line",
          x: 148,
          y: 148,
          w: 100,
          h: 1,
          fill: content.palette.accent,
          opacity: 0.6,
          animation: defaultAnimation("draw", 160),
        }),
        text("Details date", dateLine(content), content, {
          x: 30,
          y: 186,
          w: 337,
          h: 26,
          fontSize: 11,
          letterSpacing: 0.22,
          uppercase: true,
          opacity: 0.8,
        }, 240),
        text("Details venue", content.venueName || "The venue", content, {
          x: 30,
          y: 234,
          w: 337,
          h: 34,
          fontSize: 15,
          letterSpacing: 0.04,
        }, 300),
        text(
          "Details address",
          content.venueAddress || "The address",
          content,
          {
            x: 30,
            y: 272,
            w: 337,
            h: 54,
            fontSize: 9.5,
            lineHeight: 1.5,
            letterSpacing: 0.12,
            uppercase: true,
            opacity: 0.55,
          },
          340,
        ),
        text("Reception", "Dinner and dancing to follow", content, {
          x: 30,
          y: 366,
          w: 337,
          h: 40,
          fontSize: 9,
          lineHeight: 1.6,
          letterSpacing: 0.18,
          uppercase: true,
          opacity: 0.55,
        }, 400),
        makeElement("motif", {
          name: "Details ornament",
          motif: content.motif === "none" ? "sprig" : content.motif,
          x: 172,
          y: 466,
          w: 54,
          h: 54,
          color: content.palette.accent,
          opacity: 0.5,
          animation: defaultAnimation("fade", 460),
        }),
      ]),
  },
];

export function pageLayoutById(id: string): PageLayout {
  return PAGE_LAYOUTS.find((layout) => layout.id === id) ?? PAGE_LAYOUTS[0];
}
