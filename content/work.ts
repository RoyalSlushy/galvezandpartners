/** Portfolio items shown on /our-works and /case-study. slug -> detail page
 * (null = no page). `description` is the short blurb shown under the active
 * card in the /our-works accordion. */
export type Work = { title: string; slug: string | null; img: string; description: string };

/** One image on the /our-works masonry gallery. `tags` is a comma-separated
 * list (kept as a plain string so it stays editable inline via the CMS);
 * the gallery splits it for the filter chips. */
export type GalleryItem = { title: string; img: string; tags: string };

export const WORK_HEADING = "our work speaks for itself";

export const WORK: Work[] = [
  { title: "ELG Accident Attorneys", slug: "elg-accident-attorneys", img: "18e608_ab6f541c403a4902bfaa3424f986f0d2~mv2.jpg", description: "A full-service campaign — brand storytelling, media buying, and video production built to drive qualified case leads across the Phoenix market." },
  { title: "La Bombita", slug: "la-bombita", img: "18e608_1a7448a728304163b7049335d76fdc62~mv2.jpg", description: "Brand identity, social, and video content — bold, flavorful creative that captures the energy of the brand." },
  { title: "Helios – Adelante Scholars", slug: "helios-education-foundation", img: "18e608_7a5b9c6e0ac449bfaf467c8090dbebce~mv2.jpeg", description: "Creative and digital work amplifying access to higher education through multicultural storytelling." },
  { title: "Precision Aging Network", slug: "precision-aging-network", img: "18e608_be5a4102ea5645289d4e37cec9917560~mv2.jpg", description: "Science-forward brand and campaign work translating complex research into clear, human stories." },
  { title: "Ken Garff Dealerships", slug: null, img: "18e608_40cdf2a8704b46beb47dc1742242db1a~mv2.jpg", description: "Dealership marketing and content built to move inventory and earn local trust across the network." },
  { title: "AZ Alzheimer's Consortium", slug: null, img: "18e608_8ce2ab9a4a67425f92ce903860b6ac35~mv2.jpg", description: "Cause-driven brand and awareness work for a statewide research consortium advancing care." },
];

export const WORK_GALLERY_HEADING = "the gallery";

/** Default gallery: the case-study imagery, tagged by client and category so
 * the filter chips have something to bite on out of the box. */
export const WORK_GALLERY: GalleryItem[] = [
  { title: "ELG Accident Attorneys 01", img: "18e608_cb50930aedad43f88afcb87df07cad8af000.jpg", tags: "elg accident attorneys, legal, campaign" },
  { title: "ELG Accident Attorneys 02", img: "18e608_ab6f541c403a4902bfaa3424f986f0d2~mv2.jpg", tags: "elg accident attorneys, legal, brand" },
  { title: "ELG Accident Attorneys 03", img: "18e608_16c28fd37f014651a58e0a2c15903496~mv2.jpeg", tags: "elg accident attorneys, legal, video" },
  { title: "ELG Accident Attorneys 04", img: "18e608_cad6745459944f008f2e59e8d756d355~mv2.jpeg", tags: "elg accident attorneys, legal, video" },
  { title: "ELG Accident Attorneys 05", img: "18e608_117a75739cea495e88385acb60122f7a~mv2.png", tags: "elg accident attorneys, legal, social" },
  { title: "ELG Accident Attorneys 06", img: "18e608_8ce2edfb56554458957368d79d3da44d~mv2.jpg", tags: "elg accident attorneys, legal, campaign" },
  { title: "Helios – Adelante Scholars 01", img: "18e608_11243489a4584f9d807d291a49b3122cf000.jpg", tags: "helios, education, campaign" },
  { title: "Helios – Adelante Scholars 02", img: "18e608_20b02e2f103e4f579f6afb595d9dacccf000.jpg", tags: "helios, education, video" },
  { title: "Helios – Adelante Scholars 03", img: "18e608_df887311e36d4c4cbe5d9e9b8b44addff000.jpg", tags: "helios, education, social" },
  { title: "Helios – Adelante Scholars 04", img: "18e608_2cce346987254e48ae7aa36c22ddb09a~mv2.png", tags: "helios, education, social" },
  { title: "Helios – Adelante Scholars 05", img: "18e608_ec13ff184f0641c3986612f3919c5dc0~mv2.png", tags: "helios, education, brand" },
  { title: "Helios – Adelante Scholars 06", img: "18e608_a41f4864aa9e4186a9579146decb1d5c~mv2.png", tags: "helios, education, campaign" },
  { title: "La Bombita 01", img: "18e608_9c20a654b1a944968028f7069f7c7a6ff000.jpg", tags: "la bombita, food & beverage, brand" },
  { title: "La Bombita 02", img: "18e608_1718f51b1a1346959b8d40b477a871a2~mv2.jpg", tags: "la bombita, food & beverage, social" },
  { title: "La Bombita 03", img: "18e608_ca862f20dc984819bb7ac782d5d7a7f1~mv2.jpg", tags: "la bombita, food & beverage, video" },
  { title: "La Bombita 04", img: "18e608_a0e61563134e4e86b74831fc5554df3f~mv2.jpg", tags: "la bombita, food & beverage, social" },
  { title: "La Bombita 05", img: "18e608_6dd79ab7f4cb42d8afa919bcde87faa9~mv2.jpg", tags: "la bombita, food & beverage, brand" },
  { title: "La Bombita 06", img: "18e608_9271ac15fe964d5d8a3357af2df64111~mv2.jpg", tags: "la bombita, food & beverage, campaign" },
  { title: "Precision Aging Network 01", img: "18e608_3189541c33e84c7085117bd8e6a56ea3f000.jpg", tags: "precision aging network, health, campaign" },
  { title: "Precision Aging Network 02", img: "18e608_735a36bb53a44bb7be0ae3625cce656e~mv2.png", tags: "precision aging network, health, brand" },
  { title: "Precision Aging Network 03", img: "18e608_1cc51290035947e989ea6ce7dbaee660~mv2.png", tags: "precision aging network, health, social" },
  { title: "Precision Aging Network 04", img: "18e608_44fd26f5a0614c10af4a7925c70085e7~mv2.jpg", tags: "precision aging network, health, video" },
  { title: "Precision Aging Network 05", img: "18e608_34799e1e74cd493e853a2b5759881e04~mv2.jpg", tags: "precision aging network, health, campaign" },
  { title: "Precision Aging Network 06", img: "18e608_0b6f993b9c454bc6b652014c098bf692~mv2.jpg", tags: "precision aging network, health, brand" },
];
