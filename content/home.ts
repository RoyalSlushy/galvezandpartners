/** Homepage content, extracted from the original site. */

const WIX = "https://static.wixstatic.com/media";

export const HERO = {
  headline: "We Are Storytellers.",
  sub: "Our Stories drive customers. Our Stories get you results.",
  image: `${WIX}/18e608_eb9c9327bbfc4b828dfc63d5f2ea08caf000.jpg/v1/fill/w_1400,h_720,al_c,q_85,enc_auto/18e608_eb9c9327bbfc4b828dfc63d5f2ea08caf000.jpg`,
  ctaLabel: "Let's Connect",
  ctaHref: "/contact-us",
};

export type Service = { title: string; description: string };

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
