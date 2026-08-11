import type { Social } from "@/content/site";

/** One line on a member's profile card: a prompt picked from FACT_PROMPTS and
 * their answer to it. */
export type Fact = { prompt: string; answer: string };

/** The finishes a sticker can be given. `plain` is the sticker as-is; the
 * others are the reflective treatments, applied as a gradient masked to the
 * sticker's own shape (see .gp-sticker-* in globals.css) — that rule is the
 * seam where a shader-based treatment would replace the CSS one. */
export const STICKER_FINISHES = ["plain", "holo", "foil", "polychrome"] as const;
export type StickerFinish = (typeof STICKER_FINISHES)[number];

/**
 * A decorative sticker on an open profile card. Stickers are scattered down the
 * margins either side of the card — outside the body column the page is written
 * to — one per side in turn and evenly spaced down their side, so they frame the
 * card without ever covering what it says. Where exactly each one lands is
 * decided when the card opens rather than stored, so the arrangement is never
 * twice the same; only how a sticker *looks* is authored here.
 */
export type Sticker = {
  /** Image URL or Wix media id. Takes precedence over `emoji` when set. */
  img: string;
  /** Emoji glyph, used when `img` is empty. */
  emoji: string;
  /** Width as a percentage of a fixed reference (see SIZE_REF_REM), rather than
   * of the margin it sits in — those run from a sliver to a few hundred pixels
   * wide, so a sticker sized against one would change size with the viewport. */
  size: number;
  /** Rotation in degrees. */
  rotate: number;
  finish: StickerFinish;
};

/** Team members ("Meet Our Storytellers"). Photo = Wix media id (kept on CDN).
 * `socials` are per-person links, empty by default — added from the editor.
 * `emoji`, `facts` and `motto` feed the pop-up profile card; all optional —
 * empty ones are hidden from visitors and shown as editable placeholders to
 * admins. */
export type Member = {
  name: string;
  role: string;
  photo: string;
  socials: Social[];
  emoji?: string;
  /** The member's own backdrop: wiped up behind the portrait when their tile is
   * hovered, and shown behind the whole screen once their card is opened. Named
   * for the first of those, which is where it started. */
  hoverImage?: string;
  /** A few sentences on the person and what they do here. Written per member
   * in the editor — no invented copy ships as a default. */
  bio?: string;
  facts?: Fact[];
  motto?: string;
  stickers?: Sticker[];
};

/**
 * The prompt library for profile-card facts. Admins pick one per line from
 * this list in the editor, so cards can be as playful (or as buttoned-up) as
 * each person wants without anyone touching code. Prompts are stored as their
 * English text — the same convention the i18n dictionary keys on — so adding
 * one here plus a Spanish entry in content/i18n.ts is all it takes.
 */
export const FACT_PROMPTS: string[] = [
  "Superpower",
  "Fuel of choice",
  "Currently obsessed with",
  "Hidden talent",
  "First job ever",
  "Karaoke go-to",
  "Desk essential",
  "Walk-up song",
  "Comfort watch",
  "Weekend mode",
  "Pet peeve",
  "Dream project",
  "Go-to taco order",
  "Can't work without",
  "Favorite word",
  "Childhood dream job",
  "Best advice I ever got",
  "Proudest work moment",
  "Always in my camera roll",
  "Ask me about",
];

export const TEAM_HEADING = "Meet Our Storytellers";

/**
 * The Our Team lander. `background` is a single still — the office — that fills
 * the section behind everything; `images` are photographs of the team together,
 * shown over it as polaroids that fade in and out. Both are kept separate from
 * the individual member portraits so all three are managed (and cropped)
 * independently, and both are empty by default: the real photographs are
 * uploaded per site from the editor.
 */
export type TeamLander = { subtitle: string; background: string; images: string[] };

export const TEAM_LANDER: TeamLander = {
  subtitle: "The people who turn your brand into a story worth repeating.",
  background: "",
  images: [],
};

const TEAM_RAW: Omit<Member, "socials">[] = [
  {
    name: "Hector Galvez",
    role: "Principal",
    photo: "18e608_6ba8e6ee583a4830add9de630471b75a~mv2.png",
    emoji: "🎩",
    facts: [
      { prompt: "Superpower", answer: "Seeing the story before anyone else does" },
      { prompt: "Fuel of choice", answer: "Black coffee, no sugar" },
      { prompt: "Best advice I ever got", answer: "Listen twice, pitch once" },
      { prompt: "Hidden talent", answer: "Closes deals in two languages mid-sentence" },
    ],
    motto: "Every brand has a story worth telling.",
  },
  {
    name: "Alex Lopez",
    role: "Marketing Manager",
    photo: "18e608_eb08e960397f40c0aebceea12afe64ed~mv2.png",
    emoji: "📈",
    facts: [
      { prompt: "Superpower", answer: "Turning spreadsheets into strategy" },
      { prompt: "Fuel of choice", answer: "Cold brew by the liter" },
      { prompt: "Currently obsessed with", answer: "Campaigns that make the numbers dance" },
      { prompt: "Hidden talent", answer: "Remembers every client's birthday" },
    ],
    motto: "Good marketing is a good story on schedule.",
  },
  {
    name: "Grecia Gastelum",
    role: "Social Media Manager",
    photo: "18e608_ce4f5a00ba0b4cd1b817108fbc5f2ce8~mv2.png",
    emoji: "📱",
    facts: [
      { prompt: "Superpower", answer: "Reading the algorithm's mind" },
      { prompt: "Fuel of choice", answer: "Iced horchata latte" },
      { prompt: "Currently obsessed with", answer: "Micro-trends that peak on a Tuesday" },
      {
        prompt: "Hidden talent",
        answer: "Types a caption faster than autocorrect can ruin it",
      },
    ],
    motto: "Post it like you mean it.",
  },
  {
    name: "Viviana Galvez",
    role: "Social Media Specialist",
    photo: "18e608_fd87b90b4d444c69acac8f02078536df~mv2.png",
    emoji: "✨",
    facts: [
      { prompt: "Superpower", answer: "Making comment sections feel like family" },
      { prompt: "Fuel of choice", answer: "Matcha with extra foam" },
      { prompt: "Currently obsessed with", answer: "The perfect story sticker placement" },
      { prompt: "Hidden talent", answer: "Spots a typo from across the room" },
    ],
    motto: "Community first, content always.",
  },
  {
    name: "Adrian Chavez",
    role: "Graphic & Web Designer",
    photo: "18e608_6d88c41791ca4c6b907f8478e41f5754~mv2.png",
    emoji: "🎨",
    facts: [
      { prompt: "Superpower", answer: "Kerning injustices, corrected on sight" },
      { prompt: "Fuel of choice", answer: "Café de olla, extra cinnamon" },
      { prompt: "Pet peeve", answer: "Stretched logos" },
      { prompt: "Hidden talent", answer: "Names the font on any billboard in seconds" },
    ],
    motto: "Design is storytelling you can see.",
  },
  {
    name: "Andres Cabada",
    role: "Senior Creative Designer",
    photo: "18e608_cc1fde05197e4acb82df47999e87fdf0~mv2.png",
    emoji: "🖌️",
    facts: [
      { prompt: "Superpower", answer: "Sketching the big idea on a napkin" },
      { prompt: "Fuel of choice", answer: "Espresso, doubled" },
      {
        prompt: "Currently obsessed with",
        answer: "Color palettes hiding in old movie posters",
      },
      { prompt: "Hidden talent", answer: "Draws a perfect circle freehand" },
    ],
    motto: "Make it bold or make it again.",
  },
  {
    name: "Maddy Crouch",
    role: "Producer / Social Media",
    photo: "18e608_74214cc16bb7401e8db94b9a1dc1e30c~mv2.png",
    emoji: "🎬",
    facts: [
      { prompt: "Superpower", answer: "Herding a whole shoot with one clipboard" },
      { prompt: "Fuel of choice", answer: "Vanilla oat-milk latte" },
      { prompt: "Desk essential", answer: "A highlighter for every department" },
      { prompt: "Hidden talent", answer: "Packs a production van like a Tetris champion" },
    ],
    motto: "Plan the magic, then let it happen.",
  },
  {
    name: "Claire Fenn",
    role: "Multimedia Specialist",
    photo: "18e608_c1df8ada45e74fd8a39e95da35f50ebe~mv2.png",
    emoji: "📸",
    facts: [
      { prompt: "Superpower", answer: "Finding the golden hour at any hour" },
      { prompt: "Fuel of choice", answer: "Chai, extra spicy" },
      {
        prompt: "Always in my camera roll",
        answer: "B-roll nobody asked for but everybody loves",
      },
      { prompt: "Hidden talent", answer: "Steady hands — no gimbal required" },
    ],
    motto: "Every frame earns its place.",
  },
  {
    name: "Cesar Salas Jr",
    role: "Video Content Creator",
    photo: "18e608_254a63ef6a34473b951f8c1047768e0b~mv2.png",
    emoji: "🎥",
    facts: [
      { prompt: "Superpower", answer: "Cutting a scroll-stopper before lunch" },
      { prompt: "Fuel of choice", answer: "Agua de jamaica, ice cold" },
      { prompt: "Comfort watch", answer: "Anything with a heist in it" },
      { prompt: "Hidden talent", answer: "Quotes every line of his favorite movies" },
    ],
    motto: "If it doesn't hook in three seconds, cut again.",
  },
  {
    name: "Antonio Casian",
    role: "Digital Marketing",
    photo: "18e608_ff11150317054441944744a8e1e115bf~mv2.png",
    emoji: "🚀",
    facts: [
      { prompt: "Superpower", answer: "Squeezing ROI out of every last click" },
      { prompt: "Fuel of choice", answer: "Green tea and analytics dashboards" },
      { prompt: "Currently obsessed with", answer: "A/B tests with a plot twist" },
      { prompt: "Hidden talent", answer: "Explains attribution at a family dinner" },
    ],
    motto: "Data tells you where the story lands.",
  },
];

export const TEAM: Member[] = TEAM_RAW.map((m) => ({ ...m, socials: [] }));
