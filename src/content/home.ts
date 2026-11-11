// The home page's prose, copied verbatim from the India Critical Minerals Dashboard
// (sources/crit-minerals-dashboard/index.html, .problem-hero). scripts/check-content.mjs compares
// this file with that source so the two cannot drift apart unnoticed.

export const HEADLINE = "Nothing is critical if everything is critical.";

export const AUTHORS = [
  { name: "Tannmay Kumarr Baid", url: "https://takshashila.org.in/content/team/tannmay-kumarr-baid.html" },
  { name: "Shobhankita Reddy", url: "https://takshashila.org.in/content/team/shobhankita-reddy.html" },
];

export const INTRO: string[] = [
  `Critical mineral lists have expanded to the point that they no longer work as policy tools. India's list runs to <strong>51 elements</strong>, about two-thirds of all the elements mined for commercial use. The United States went from 35 minerals in 2018 to 60 in 2025; Russia now tracks 61, Canada 54, Australia 51, and the EU has grown from 33 to 49. If everything is a priority, then effectively nothing is. A label applied this broadly cannot tell a government with limited capital and state capacity where to act.`,
  `The root problem is that the "critical" label is treated as a single condition when it is really the result of several factors. Copper and ytterbium both carry the label, but they share little: a mineral can be hard to secure because it is geologically scarce, because its refining sits in one country, because it has no substitute, or because its price is weaponised. Each of these calls for a different response.`,
  `What we have done is take India's own list of 51 critical minerals and pull it apart. We score each mineral on <strong>ten measurable vectors</strong> against defined, reproducible criteria, one of which is <strong>India's Position</strong>: how reliant India is on imports for that mineral and how far it has moved to secure supply. The shape of each profile then sorts the 51 into <strong>six groups</strong>, where a shared profile means a shared bottleneck and a shared response. The aim is to turn India's list into clear guidance on what India should do with it.`,
];

export const LISTS_CHART = {
  title: "The lists keep swelling",
  sub: "Elements on each country's critical-minerals list, over time",
};
