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

  // --- Footer / chrome ---
  "Get in Touch": "Contáctanos",
  Menu: "Menú",
  "Follow Us": "Síguenos",
  "Open menu": "Abrir menú",
  "Change language": "Cambiar idioma",

  // --- Services grid ---
  "the works": "el trabajo",
  "What We Can Do For YOU.": "Lo Que Podemos Hacer Por TI.",
  "View More": "Ver Más",
  "Our services": "Nuestros servicios",
  "Galvez & Partners storytelling": "Narrativa de Galvez & Partners",

  // --- Marquee band (English words only; the Spanish ones fall through) ---
  storytellers: "narradores",
  creatives: "creativos",
  producers: "productores",

  // --- Featured work ---
  "featured work": "trabajo destacado",
  "Stories We've Told.": "Historias Que Hemos Contado.",
  "Campaigns, brands and films we poured ourselves into. Scroll through a few of our favorites.":
    "Campañas, marcas y películas en las que nos volcamos. Desliza para ver algunas de nuestras favoritas.",
  "See All Works": "Ver Todo el Trabajo",
  "there's": "hay",
  more: "más",
  "Every story on one page.": "Cada historia en una sola página.",

  // --- Instagram ---
  "on the gram": "en el gram",
  "Follow the Story.": "Sigue la Historia.",
  "Behind the scenes": "Detrás de cámaras",
  "On set with the crew": "En el set con el equipo",
  "ELG Accident Attorneys — campaign day": "ELG Accident Attorneys — día de campaña",
  "Adelante Scholars with Helios": "Adelante Scholars con Helios",
  "Instagram post": "Publicación de Instagram",
  "Open Instagram post": "Abrir publicación de Instagram",

  // --- Multicultural manifesto ---
  "the multi-cultural": "la agencia multicultural",
  "Agency doing": "que hace",
  "big things": "grandes cosas",
  "Welcome to G+P Advertising, your go-to destination for all things marketing and advertising.":
    "Bienvenido a G+P Advertising, tu destino ideal para todo lo relacionado con marketing y publicidad.",
  "reach new Heights": "alcanza nuevas alturas",
  "Dedicated experts delivering unparalleled business solutions for growth.":
    "Expertos dedicados que ofrecen soluciones empresariales inigualables para el crecimiento.",
  "built to last": "hecho para durar",
  "Our extensive services establish a lasting, impactful brand image.":
    "Nuestros amplios servicios establecen una imagen de marca duradera e impactante.",
  "storytellers at heart": "narradores de corazón",
  "We are passionate about delivering top-notch results for your brand's success in a competitive market.":
    "Nos apasiona ofrecer resultados de primera para el éxito de tu marca en un mercado competitivo.",

  // --- Team: heading + roles (names are left untranslated) ---
  "Meet Our Storytellers": "Conoce a Nuestros Narradores",
  "What we are": "Lo que somos",
  Principal: "Director",
  "Marketing Manager": "Gerente de Marketing",
  "Social Media Manager": "Gerente de Redes Sociales",
  "Social Media Specialist": "Especialista en Redes Sociales",
  "Graphic & Web Designer": "Diseñador Gráfico y Web",
  "Senior Creative Designer": "Diseñador Creativo Senior",
  "Producer / Social Media": "Productor / Redes Sociales",
  "Multimedia Specialist": "Especialista en Multimedia",
  "Video Content Creator": "Creador de Contenido de Video",
  "Digital Marketing": "Marketing Digital",

  // --- Team profile cards: chrome + field labels ---
  "Meet me": "Conóceme",
  Close: "Cerrar",
  Superpower: "Superpoder",
  "Fuel of choice": "Combustible de cabecera",
  "Currently obsessed with": "Obsesión del momento",
  "Hidden talent": "Talento oculto",

  // --- Team profile cards: default values (admin-edited values fall through
  //     untranslated, same as roles) ---
  "Seeing the story before anyone else does": "Ve la historia antes que nadie",
  "Black coffee, no sugar": "Café negro, sin azúcar",
  "Brands with something to say": "Marcas con algo que decir",
  "Closes deals in two languages mid-sentence":
    "Cierra tratos en dos idiomas a media frase",
  "Every brand has a story worth telling.":
    "Toda marca tiene una historia que vale la pena contar.",
  "Turning spreadsheets into strategy": "Convierte hojas de cálculo en estrategia",
  "Cold brew by the liter": "Cold brew por litro",
  "Campaigns that make the numbers dance": "Campañas que hacen bailar los números",
  "Remembers every client's birthday": "Recuerda el cumpleaños de cada cliente",
  "Good marketing is a good story on schedule.":
    "El buen marketing es una buena historia a tiempo.",
  "Reading the algorithm's mind": "Le lee la mente al algoritmo",
  "Iced horchata latte": "Latte de horchata con hielo",
  "Micro-trends that peak on a Tuesday": "Microtendencias que explotan un martes",
  "Types a caption faster than autocorrect can ruin it":
    "Escribe un pie de foto más rápido de lo que el autocorrector lo arruina",
  "Post it like you mean it.": "Publícalo con toda la intención.",
  "Making comment sections feel like family":
    "Hace que los comentarios se sientan como familia",
  "Matcha with extra foam": "Matcha con espuma extra",
  "The perfect story sticker placement": "El sticker perfecto en la story",
  "Spots a typo from across the room": "Detecta un error de dedo desde lejos",
  "Community first, content always.": "Primero la comunidad, siempre el contenido.",
  "Kerning injustices, corrected on sight":
    "Corrige injusticias de kerning a primera vista",
  "Café de olla, extra cinnamon": "Café de olla, con canela extra",
  "Grids nobody notices but everybody feels":
    "Retículas que nadie nota pero todos sienten",
  "Names the font on any billboard in seconds":
    "Nombra la fuente de cualquier espectacular en segundos",
  "Design is storytelling you can see.": "El diseño es una historia que se ve.",
  "Sketching the big idea on a napkin": "Boceta la gran idea en una servilleta",
  "Espresso, doubled": "Espresso, doble",
  "Color palettes hiding in old movie posters":
    "Paletas de color escondidas en carteles de cine viejos",
  "Draws a perfect circle freehand": "Dibuja un círculo perfecto a mano alzada",
  "Make it bold or make it again.": "Hazlo audaz o hazlo de nuevo.",
  "Herding a whole shoot with one clipboard":
    "Dirige todo un rodaje con una sola tabla de apuntes",
  "Vanilla oat-milk latte": "Latte de avena con vainilla",
  "Call sheets that actually run on time":
    "Planes de rodaje que de verdad salen a tiempo",
  "Packs a production van like a Tetris champion":
    "Carga la van de producción como campeona de Tetris",
  "Plan the magic, then let it happen.": "Planea la magia y deja que suceda.",
  "Finding the golden hour at any hour": "Encuentra la hora dorada a cualquier hora",
  "Chai, extra spicy": "Chai, extra especiado",
  "B-roll nobody asked for but everybody loves":
    "B-roll que nadie pidió pero todos aman",
  "Steady hands — no gimbal required": "Pulso firme, sin necesidad de gimbal",
  "Every frame earns its place.": "Cada cuadro se gana su lugar.",
  "Cutting a scroll-stopper before lunch":
    "Edita un video que detiene el scroll antes de comer",
  "Agua de jamaica, ice cold": "Agua de jamaica, bien fría",
  "Transitions smoother than the song's drop":
    "Transiciones más suaves que el drop de la canción",
  "Quotes every line of his favorite movies":
    "Cita cada línea de sus películas favoritas",
  "If it doesn't hook in three seconds, cut again.":
    "Si no engancha en tres segundos, edita otra vez.",
  "Squeezing ROI out of every last click": "Le exprime ROI hasta al último clic",
  "Green tea and analytics dashboards": "Té verde y tableros de analítica",
  "A/B tests with a plot twist": "Pruebas A/B con giro inesperado",
  "Explains attribution at a family dinner":
    "Explica la atribución en la cena familiar",
  "Data tells you where the story lands.": "Los datos te dicen dónde aterriza la historia.",

  // --- Work index ---
  "our work speaks for itself": "nuestro trabajo habla por sí mismo",

  // --- Work showcase / gallery (Our Works page) ---
  "the gallery": "la galería",
  gallery: "galería",
  overview: "resumen",
  "Map to our office": "Mapa a nuestra oficina",
  "get directions": "cómo llegar",
  "Every frame on one wall — sort it, filter it, tag it.":
    "Cada imagen en un solo muro: ordénala, fíltrala, etiquétala.",
  explore: "explorar",
  "Search the gallery": "Busca en la galería",
  "search the wall…": "busca en el muro…",
  sort: "ordenar",
  "curated order": "orden curado",
  "recently added": "añadido recientemente",
  "title a → z": "título a → z",
  "title z → a": "título z → a",
  any: "cualquiera",
  all: "todas",
  clear: "limpiar",
  "nothing on the wall": "no hay nada en el muro",
  "No images match that search and tag combination.":
    "Ninguna imagen coincide con esa búsqueda y combinación de etiquetas.",
  "clear filters": "limpiar filtros",

  // --- Partners ---
  "our partners": "nuestros socios",
  "Where exceptional results are made.": "Donde se logran resultados excepcionales.",
  "We partner with ambitious brands to tell stories that move people and drive results.":
    "Nos asociamos con marcas ambiciosas para contar historias que conmueven a las personas y generan resultados.",

  // --- Contact page ---
  "Contact us": "Contáctanos",
  "Tell us about your brand and what you want to achieve. We'll take it from there.":
    "Cuéntanos sobre tu marca y lo que quieres lograr. Nosotros nos encargamos del resto.",

  // --- Contact form ---
  "Please add your email and a message.": "Por favor añade tu correo y un mensaje.",
  "Something went wrong. Please try again.": "Algo salió mal. Por favor inténtalo de nuevo.",
  "Thank you!": "¡Gracias!",
  "We received your message and will be in touch soon.":
    "Recibimos tu mensaje y nos pondremos en contacto pronto.",
  "Send another message": "Enviar otro mensaje",
  "First name": "Nombre",
  "Last name": "Apellido",
  Email: "Correo electrónico",
  "Email *": "Correo electrónico *",
  Message: "Mensaje",
  "Message *": "Mensaje *",
  "Sending...": "Enviando...",
  Submit: "Enviar",

  // --- Case study ---
  Background: "Contexto",
  "A full-service campaign for ELG Accident Attorneys — brand storytelling, media buying, and video production built to drive qualified case leads across the Phoenix market.":
    "Una campaña integral para ELG Accident Attorneys: narrativa de marca, compra de medios y producción de video diseñada para generar prospectos de casos calificados en todo el mercado de Phoenix.",
  "Creative and digital work for Helios Education Foundation's Adelante Scholars, amplifying access to higher education through multicultural storytelling.":
    "Trabajo creativo y digital para Adelante Scholars de Helios Education Foundation, ampliando el acceso a la educación superior a través de narrativas multiculturales.",
  "Brand identity, social, and video content for La Bombita — bold, flavorful creative that captures the energy of the brand.":
    "Identidad de marca, redes sociales y contenido de video para La Bombita: creatividad audaz y llena de sabor que captura la energía de la marca.",
  "Science-forward brand and campaign work for the Precision Aging Network, translating complex research into clear, human stories.":
    "Trabajo de marca y campaña con enfoque científico para Precision Aging Network, traduciendo investigaciones complejas en historias claras y humanas.",
};

const TABLES: Record<Locale, Record<string, string>> = { en: {}, es: ES };

/** Translate an English source string into `locale`, falling back to the source. */
export function translate(locale: Locale, source: string): string {
  if (locale === "en") return source;
  return TABLES[locale]?.[source] ?? source;
}
