/**
 * Internationalization dictionary. Translations are keyed by their English
 * source string, so any English copy — whether it comes from these content
 * files or from a CMS override — is translated by a simple lookup with the
 * source string as the fallback. Add a locale by adding a keyed map here.
 */

export type Locale = "en" | "es";

export const LOCALES: { code: Locale; label: string; short: string; flag: string }[] = [
  { code: "en", label: "English", short: "ENG", flag: "🇺🇸" },
  { code: "es", label: "Español", short: "ESP", flag: "🇲🇽" },
];

/** English source string → Spanish translation. */
const ES: Record<string, string> = {
  // --- Navigation / chrome ---
  Home: "Inicio",
  "Our Work": "Nuestro Trabajo",
  "Our Team": "Nuestro Equipo",
  "Our Partners": "Nuestros Socios",
  More: "Más",
  "Connect With Us": "Conéctate Con Nosotros",
  Connect: "Conéctate",
  "Let's Connect": "Conectemos",
  "Ready?": "¿List@s?",
  "We Work Our Ads Off.": "Le echamos ganas a tus anuncios.",

  // --- Home hero ---
  "We Are Storytellers.": "Somos Narradores.",
  "Our Stories drive customers. Our Stories get you results.":
    "Nuestras historias atraen clientes. Nuestras historias dan resultados.",

  // --- Services: titles ---
  "DIGITAL MARKETING": "MARKETING DIGITAL",
  "SOCIAL MEDIA MANAGEMENT": "GESTIÓN DE REDES SOCIALES",
  "MEDIA BUYING": "COMPRA DE MEDIOS",
  "VIDEO PRODUCTION": "PRODUCCIÓN DE VIDEO",
  "GRAPHIC DESIGN": "DISEÑO GRÁFICO",
  "BRAND STRATEGY": "ESTRATEGIA DE MARCA",

  // --- Services: descriptions ---
  "We implement comprehensive digital strategies to increase online visibility, generate leads, and drive sales. Reach a wider audience through search engines, social media, and other online channels.":
    "Implementamos estrategias digitales integrales para aumentar la visibilidad en línea, generar prospectos e impulsar las ventas. Llega a una audiencia más amplia a través de buscadores, redes sociales y otros canales digitales.",
  "Your time is valuable, we manage your social media brand and presence. We design posts, engage with your audience, build brand awareness, increase followers and drive traffic.":
    "Tu tiempo es valioso; gestionamos tu marca y presencia en redes sociales. Diseñamos publicaciones, interactuamos con tu audiencia, construimos reconocimiento de marca, aumentamos seguidores y atraemos tráfico.",
  "We utilize insider experience and data-driven insights to select the most effective channels and negotiate the best rates, ensuring maximum ROI for your campaigns.":
    "Aprovechamos experiencia interna e información basada en datos para elegir los canales más efectivos y negociar las mejores tarifas, asegurando el máximo retorno de inversión en tus campañas.",
  "We produce high-quality videos that tell your story, capture attention, and inspire action. In today’s digital age, video content is king — a highly effective way to connect with your audience and showcase your brand.":
    "Producimos videos de alta calidad que cuentan tu historia, captan la atención e inspiran a la acción. En la era digital, el video es el rey: una forma muy efectiva de conectar con tu audiencia y mostrar tu marca.",
  "Our designers are talented and forward thinking. We create visually stunning and impactful designs for all types of businesses. Whether it’s a logo, bus wrap, pamphlet or banner, we’ve got your back.":
    "Nuestros diseñadores son talentosos y visionarios. Creamos diseños visualmente impactantes para todo tipo de negocios. Ya sea un logotipo, rotulación de autobús, folleto o banner, te respaldamos.",
  "We develop and refine your brand identity, messaging, and positioning to differentiate you from your competition.":
    "Desarrollamos y refinamos la identidad, el mensaje y el posicionamiento de tu marca para diferenciarte de tu competencia.",
};

const TABLES: Record<Locale, Record<string, string>> = { en: {}, es: ES };

/** Translate an English source string into `locale`, falling back to the source. */
export function translate(locale: Locale, source: string): string {
  if (locale === "en") return source;
  return TABLES[locale]?.[source] ?? source;
}
