import type { Social } from "@/content/site";

/** Team members ("Meet Our Storytellers"). Photo = Wix media id (kept on CDN).
 * `socials` are per-person links, empty by default — added from the editor.
 * The quirky card fields (emoji, superpower, fuel, obsession, hiddenTalent,
 * motto) feed the pop-up profile card; all optional — empty ones are hidden
 * from visitors and shown as editable placeholders to admins. */
export type Member = {
  name: string;
  role: string;
  photo: string;
  socials: Social[];
  emoji?: string;
  superpower?: string;
  fuel?: string;
  obsession?: string;
  hiddenTalent?: string;
  motto?: string;
};

export const TEAM_HEADING = "Meet Our Storytellers";

const TEAM_RAW: Omit<Member, "socials">[] = [
  {
    name: "Hector Galvez",
    role: "Principal",
    photo: "18e608_6ba8e6ee583a4830add9de630471b75a~mv2.png",
    emoji: "🎩",
    superpower: "Seeing the story before anyone else does",
    fuel: "Black coffee, no sugar",
    obsession: "Brands with something to say",
    hiddenTalent: "Closes deals in two languages mid-sentence",
    motto: "Every brand has a story worth telling.",
  },
  {
    name: "Alex Lopez",
    role: "Marketing Manager",
    photo: "18e608_eb08e960397f40c0aebceea12afe64ed~mv2.png",
    emoji: "📈",
    superpower: "Turning spreadsheets into strategy",
    fuel: "Cold brew by the liter",
    obsession: "Campaigns that make the numbers dance",
    hiddenTalent: "Remembers every client's birthday",
    motto: "Good marketing is a good story on schedule.",
  },
  {
    name: "Grecia Gastelum",
    role: "Social Media Manager",
    photo: "18e608_ce4f5a00ba0b4cd1b817108fbc5f2ce8~mv2.png",
    emoji: "📱",
    superpower: "Reading the algorithm's mind",
    fuel: "Iced horchata latte",
    obsession: "Micro-trends that peak on a Tuesday",
    hiddenTalent: "Types a caption faster than autocorrect can ruin it",
    motto: "Post it like you mean it.",
  },
  {
    name: "Viviana Galvez",
    role: "Social Media Specialist",
    photo: "18e608_fd87b90b4d444c69acac8f02078536df~mv2.png",
    emoji: "✨",
    superpower: "Making comment sections feel like family",
    fuel: "Matcha with extra foam",
    obsession: "The perfect story sticker placement",
    hiddenTalent: "Spots a typo from across the room",
    motto: "Community first, content always.",
  },
  {
    name: "Adrian Chavez",
    role: "Graphic & Web Designer",
    photo: "18e608_6d88c41791ca4c6b907f8478e41f5754~mv2.png",
    emoji: "🎨",
    superpower: "Kerning injustices, corrected on sight",
    fuel: "Café de olla, extra cinnamon",
    obsession: "Grids nobody notices but everybody feels",
    hiddenTalent: "Names the font on any billboard in seconds",
    motto: "Design is storytelling you can see.",
  },
  {
    name: "Andres Cabada",
    role: "Senior Creative Designer",
    photo: "18e608_cc1fde05197e4acb82df47999e87fdf0~mv2.png",
    emoji: "🖌️",
    superpower: "Sketching the big idea on a napkin",
    fuel: "Espresso, doubled",
    obsession: "Color palettes hiding in old movie posters",
    hiddenTalent: "Draws a perfect circle freehand",
    motto: "Make it bold or make it again.",
  },
  {
    name: "Maddy Crouch",
    role: "Producer / Social Media",
    photo: "18e608_74214cc16bb7401e8db94b9a1dc1e30c~mv2.png",
    emoji: "🎬",
    superpower: "Herding a whole shoot with one clipboard",
    fuel: "Vanilla oat-milk latte",
    obsession: "Call sheets that actually run on time",
    hiddenTalent: "Packs a production van like a Tetris champion",
    motto: "Plan the magic, then let it happen.",
  },
  {
    name: "Claire Fenn",
    role: "Multimedia Specialist",
    photo: "18e608_c1df8ada45e74fd8a39e95da35f50ebe~mv2.png",
    emoji: "📸",
    superpower: "Finding the golden hour at any hour",
    fuel: "Chai, extra spicy",
    obsession: "B-roll nobody asked for but everybody loves",
    hiddenTalent: "Steady hands — no gimbal required",
    motto: "Every frame earns its place.",
  },
  {
    name: "Cesar Salas Jr",
    role: "Video Content Creator",
    photo: "18e608_254a63ef6a34473b951f8c1047768e0b~mv2.png",
    emoji: "🎥",
    superpower: "Cutting a scroll-stopper before lunch",
    fuel: "Agua de jamaica, ice cold",
    obsession: "Transitions smoother than the song's drop",
    hiddenTalent: "Quotes every line of his favorite movies",
    motto: "If it doesn't hook in three seconds, cut again.",
  },
  {
    name: "Antonio Casian",
    role: "Digital Marketing",
    photo: "18e608_ff11150317054441944744a8e1e115bf~mv2.png",
    emoji: "🚀",
    superpower: "Squeezing ROI out of every last click",
    fuel: "Green tea and analytics dashboards",
    obsession: "A/B tests with a plot twist",
    hiddenTalent: "Explains attribution at a family dinner",
    motto: "Data tells you where the story lands.",
  },
];

export const TEAM: Member[] = TEAM_RAW.map((m) => ({ ...m, socials: [] }));
