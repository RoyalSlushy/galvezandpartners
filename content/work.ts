/** Portfolio items shown on /our-works and /case-study. slug -> detail page (null = no page). */
export type Work = { title: string; slug: string | null; img: string };

export const WORK_HEADING = "our work speaks for itself";

export const WORK: Work[] = [
  { title: "ELG Accident Attorneys", slug: "elg-accident-attorneys", img: "18e608_ab6f541c403a4902bfaa3424f986f0d2~mv2.jpg" },
  { title: "La Bombita", slug: "la-bombita", img: "18e608_1a7448a728304163b7049335d76fdc62~mv2.jpg" },
  { title: "Helios – Adelante Scholars", slug: "helios-education-foundation", img: "18e608_7a5b9c6e0ac449bfaf467c8090dbebce~mv2.jpeg" },
  { title: "Precision Aging Network", slug: "precision-aging-network", img: "18e608_be5a4102ea5645289d4e37cec9917560~mv2.jpg" },
  { title: "Ken Garff Dealerships", slug: null, img: "18e608_40cdf2a8704b46beb47dc1742242db1a~mv2.jpg" },
  { title: "AZ Alzheimer's Consortium", slug: null, img: "18e608_8ce2ab9a4a67425f92ce903860b6ac35~mv2.jpg" },
];
