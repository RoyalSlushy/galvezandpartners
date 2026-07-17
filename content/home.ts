/** Homepage content, extracted from the original site. */

const WIX = "https://static.wixstatic.com/media";

/** A single color stop on the hero background gradient: a literal CSS color and
 * a position along the gradient axis (0–100%). Colors are literal (not theme
 * tokens) so the hero gradient is authored independently of the site theme. */
export type GradientStop = { color: string; position: number };

/** The hero section's background gradient — an angle (in degrees) plus an
 * ordered list of color stops. Edited via the hero image config's color picker
 * and applied only to the hero background; the rest of the site follows the
 * active theme. */
export type HeroGradient = { angle: number; stops: GradientStop[] };

/** Default hero gradient — mirrors the original navy→muted-blue wash so the
 * hero looks unchanged until an admin customizes it. */
export const DEFAULT_HERO_GRADIENT: HeroGradient = {
  angle: 180,
  stops: [
    { color: "#141924", position: 0 },
    { color: "#141924", position: 45 },
    { color: "#31415e", position: 100 },
  ],
};

export const HERO = {
  headline: "We Are Storytellers.",
  sub: "Our Stories drive customers. Our Stories get you results.",
  image: `${WIX}/18e608_eb9c9327bbfc4b828dfc63d5f2ea08caf000.jpg/v1/fill/w_1400,h_720,al_c,q_85,enc_auto/18e608_eb9c9327bbfc4b828dfc63d5f2ea08caf000.jpg`,
  ctaLabel: "Let's Connect",
  ctaHref: "/contact-us",
  gradient: DEFAULT_HERO_GRADIENT,
};

/** `media` is an optional decorative backdrop for the service's carousel card
 * (gif / mp4 / svg — a full URL or bare Wix media id), rendered tilted behind
 * the card text. Empty/absent means no backdrop; set from the admin editor. */
export type Service = { title: string; description: string; media?: string };

export const SERVICES: Service[] = [
  {
    title: "DIGITAL MARKETING",
    description:
      "We implement comprehensive digital strategies to increase online visibility, generate leads, and drive sales. Reach a wider audience through search engines, social media, and other online channels.",
  },
  {
    title: "SOCIAL MEDIA MANAGEMENT",
    description:
      "Your time is valuable, we manage your social media brand and presence. We design posts, engage with your audience, build brand awareness, increase followers and drive traffic.",
  },
  {
    title: "MEDIA BUYING",
    description:
      "We utilize insider experience and data-driven insights to select the most effective channels and negotiate the best rates, ensuring maximum ROI for your campaigns.",
  },
  {
    title: "VIDEO PRODUCTION",
    description:
      "We produce high-quality videos that tell your story, capture attention, and inspire action. In today’s digital age, video content is king — a highly effective way to connect with your audience and showcase your brand.",
  },
  {
    title: "GRAPHIC DESIGN",
    description:
      "Our designers are talented and forward thinking. We create visually stunning and impactful designs for all types of businesses. Whether it’s a logo, bus wrap, pamphlet or banner, we’ve got your back.",
  },
  {
    title: "BRAND STRATEGY",
    description:
      "We develop and refine your brand identity, messaging, and positioning to differentiate you from your competition.",
  },
];

export const WORKS_EYEBROW = "the works";
export const SERVICES_HEADING = "What We Can Do For YOU.";

/** Words on the velocity-reactive marquee band under the hero. */
export const MARQUEE_WORDS = [
  "storytellers",
  "estrategas",
  "creatives",
  "conectores",
  "producers",
  "soñadores",
];

/** Copy for the pinned horizontal "featured work" gallery (items come from the
 * shared work.items list, so edits propagate to /our-works too). */
export const FEATURED_WORK = {
  eyebrow: "featured work",
  heading: "Stories We've Told.",
  blurb: "Campaigns, brands and films we poured ourselves into. Scroll through a few of our favorites.",
  ctaLabel: "See All Works",
  ctaHref: "/our-works",
};

export type InstagramPost = { img: string; href: string; caption: string };

/** Instagram preview strip. Posts are CMS-managed (image + link + caption);
 * defaults reuse campaign imagery already on the Wix CDN. */
export const INSTAGRAM = {
  eyebrow: "on the gram",
  heading: "Follow the Story.",
  handle: "@galvezandpartners",
  href: "https://www.instagram.com/galvezandpartners/",
  ctaLabel: "Follow Us",
  posts: [
    {
      img: "18e608_ab6f541c403a4902bfaa3424f986f0d2~mv2.jpg",
      href: "https://www.instagram.com/galvezandpartners/",
      caption: "ELG Accident Attorneys — campaign day",
    },
    {
      img: "18e608_1a7448a728304163b7049335d76fdc62~mv2.jpg",
      href: "https://www.instagram.com/galvezandpartners/",
      caption: "La Bombita, muy caliente",
    },
    {
      img: "18e608_7a5b9c6e0ac449bfaf467c8090dbebce~mv2.jpeg",
      href: "https://www.instagram.com/galvezandpartners/",
      caption: "Adelante Scholars with Helios",
    },
    {
      img: "18e608_be5a4102ea5645289d4e37cec9917560~mv2.jpg",
      href: "https://www.instagram.com/galvezandpartners/",
      caption: "Precision Aging Network",
    },
    {
      img: "18e608_40cdf2a8704b46beb47dc1742242db1a~mv2.jpg",
      href: "https://www.instagram.com/galvezandpartners/",
      caption: "Ken Garff Dealerships",
    },
    {
      img: "18e608_8ce2ab9a4a67425f92ce903860b6ac35~mv2.jpg",
      href: "https://www.instagram.com/galvezandpartners/",
      caption: "AZ Alzheimer's Consortium",
    },
    {
      img: "18e608_16c28fd37f014651a58e0a2c15903496~mv2.jpeg",
      href: "https://www.instagram.com/galvezandpartners/",
      caption: "Behind the scenes",
    },
    {
      img: "18e608_cad6745459944f008f2e59e8d756d355~mv2.jpeg",
      href: "https://www.instagram.com/galvezandpartners/",
      caption: "On set with the crew",
    },
  ] as InstagramPost[],
};

export const MULTICULTURAL = {
  titleLines: ["the multi-cultural", "Agency doing", "big things"],
  intro:
    "Welcome to G+P Advertising, your go-to destination for all things marketing and advertising.",
  cards: [
    {
      title: "reach new Heights",
      body: "Dedicated experts delivering unparalleled business solutions for growth.",
    },
    {
      title: "built to last",
      body: "Our extensive services establish a lasting, impactful brand image.",
    },
    {
      title: "storytellers at heart",
      body: "We are passionate about delivering top-notch results for your brand's success in a competitive market.",
    },
  ],
};
