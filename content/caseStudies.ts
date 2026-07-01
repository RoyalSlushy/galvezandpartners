/** Case-study detail pages. gallery = Wix media ids (kept on CDN). */
export type CaseStudy = { slug: string; title: string; background: string; gallery: string[] };

export const CASE_STUDIES: CaseStudy[] = [
  {
    slug: "elg-accident-attorneys",
    title: "ELG Accident Attorneys",
    background: "A full-service campaign for ELG Accident Attorneys — brand storytelling, media buying, and video production built to drive qualified case leads across the Phoenix market.",
    gallery: [
    "18e608_cb50930aedad43f88afcb87df07cad8af000.jpg",
    "18e608_ab6f541c403a4902bfaa3424f986f0d2~mv2.jpg",
    "18e608_16c28fd37f014651a58e0a2c15903496~mv2.jpeg",
    "18e608_cad6745459944f008f2e59e8d756d355~mv2.jpeg",
    "18e608_117a75739cea495e88385acb60122f7a~mv2.png",
    "18e608_8ce2edfb56554458957368d79d3da44d~mv2.jpg",
    "18e608_facf54fd899a4b2abe70143193bf37af~mv2.jpg",
    "18e608_6505923512c84005b54aeb17fc3be945~mv2.jpg",
    ],
  },
  {
    slug: "helios-education-foundation",
    title: "Helios Education Foundation",
    background: "Creative and digital work for Helios Education Foundation's Adelante Scholars, amplifying access to higher education through multicultural storytelling.",
    gallery: [
    "18e608_11243489a4584f9d807d291a49b3122cf000.jpg",
    "18e608_20b02e2f103e4f579f6afb595d9dacccf000.jpg",
    "18e608_df887311e36d4c4cbe5d9e9b8b44addff000.jpg",
    "18e608_2cce346987254e48ae7aa36c22ddb09a~mv2.png",
    "18e608_ec13ff184f0641c3986612f3919c5dc0~mv2.png",
    "18e608_a41f4864aa9e4186a9579146decb1d5c~mv2.png",
    "18e608_2a0419209a8a420ebd602abe174cd5ee~mv2.png",
    "18e608_c0cee76b887c488f9a5c5eb3318b26b2~mv2.jpg",
    ],
  },
  {
    slug: "la-bombita",
    title: "La Bombita",
    background: "Brand identity, social, and video content for La Bombita — bold, flavorful creative that captures the energy of the brand.",
    gallery: [
    "18e608_9c20a654b1a944968028f7069f7c7a6ff000.jpg",
    "18e608_1718f51b1a1346959b8d40b477a871a2~mv2.jpg",
    "18e608_ca862f20dc984819bb7ac782d5d7a7f1~mv2.jpg",
    "18e608_a0e61563134e4e86b74831fc5554df3f~mv2.jpg",
    "18e608_6dd79ab7f4cb42d8afa919bcde87faa9~mv2.jpg",
    "18e608_9271ac15fe964d5d8a3357af2df64111~mv2.jpg",
    "18e608_31d2f7ccec454035b50cfb5f70e5ec0e~mv2.jpg",
    "18e608_d51138368de4461487addac743014533~mv2.png",
    ],
  },
  {
    slug: "precision-aging-network",
    title: "Precision Aging Network",
    background: "Science-forward brand and campaign work for the Precision Aging Network, translating complex research into clear, human stories.",
    gallery: [
    "18e608_3189541c33e84c7085117bd8e6a56ea3f000.jpg",
    "18e608_735a36bb53a44bb7be0ae3625cce656e~mv2.png",
    "18e608_1cc51290035947e989ea6ce7dbaee660~mv2.png",
    "18e608_44fd26f5a0614c10af4a7925c70085e7~mv2.jpg",
    "18e608_34799e1e74cd493e853a2b5759881e04~mv2.jpg",
    "18e608_be5a4102ea5645289d4e37cec9917560~mv2.jpg",
    "18e608_0b6f993b9c454bc6b652014c098bf692~mv2.jpg",
    ],
  }
];

export const getCaseStudy = (slug: string) => CASE_STUDIES.find((c) => c.slug === slug);
