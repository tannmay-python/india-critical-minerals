// Prose from the India Critical Minerals Dashboard's groups and methodology pages, verbatim
// (sources/crit-minerals-dashboard: index.html and renderGroups() / renderCriteria() in app.js;
// dendrogram.html; group-profiles.html). scripts/check-content.mjs compares it with those files.

export const GROUPS_INTRO = "We have bucketed the minerals into six groupings based on common characteristics.";

export const WHY_DISTINCT: string[] = [
  `The six groups are reasonably distinct on three grounds.`,
  `<strong>First, is the binding constraint volume or vulnerability,</strong> whether a mineral matters because of how much is consumed or because of how exposed its supply is. Group 1 answers volume. Every other group answers vulnerability, and consists of minerals consumed in far smaller quantities.`,
  `<strong>Second, where the supply-chain constraint sits.</strong> For Group 6 it sits nowhere in particular; the vulnerability is diffuse. For Groups 2, 3, 4 and 5 it sits at the refining stage, but for different reasons: in Group 2 the reserves are concentrated too; in Group 3 the reserves are concentrated but recycling provides an escape; in Groups 4 and 5 the reserves are not the problem at all.`,
  `<strong>Third, whether the constraint is currently active.</strong> Groups 4 and 5 are both abundant-reserve, refining-monopoly minerals, but Group 5's demand is large and rising and its chokepoint is widening, while Group 4's demand is small and flat and its monopoly sits unexercised. Group 2's monopoly, by contrast, is being used right now.`,
];

export const GROUPING_METHOD: { title: string; text: string }[] = [
  { title: "Inputs", text: `Each mineral is represented by its fifteen scores: the two sub-scores of each two-part vector and the single score of each of the other five. Composite roll-ups are not used as inputs, since they would double-count their constituents. Because the vectors are measured on different scales, each was standardised before distances were computed, so that no vector influences the grouping merely by having a wider range.` },
  { title: "Clustering", text: `We sorted the minerals into groups based on how similar their profiles were. Instead of guessing how many groups we needed upfront, we used agglomerative hierarchical clustering with Ward's linkage, a method that builds a "family tree" of the minerals step by step. It naturally pairs up the most similar minerals first, creating neat, well-balanced groups, and lets us read the data from both a big-picture and a fine-grained view.` },
  { title: "How many groups", text: `The clustering tree was examined at cuts from three to nine groups. <strong>Stability:</strong> the six-group solution is robust, the same groups persist when the tree is cut at five, six and seven, with only edge members reassigned. <strong>Interpretability:</strong> at six groups, every cluster corresponds to a profile that can be described in supply-chain terms.` },
  { title: "A few manual tweaks", text: `The statistical output was treated as a prior rather than a verdict. A group brings together minerals that call for the same response from India, so where a mineral sat near a boundary its placement was settled on that basis: scandium, for example, sits with the rising-demand processing group rather than with the other rare earths, and promethium is treated as an outlier.` },
];

export const TREE_TEXT = {
  how: `A dendrogram is a family tree for data. Every mineral starts alone at the bottom. The two most similar are joined first, then the next two, and so on, until everything sits under a single root. The height at which two things join is how different they were when they merged: join low, and they were near-identical; join high, and the link is a stretch.`,
  read: `Read the finished tree from the bottom up. Coloured sub-trees are minerals of one group merging cheaply among themselves, because their profiles rhyme. Grey links join minerals from different groups; the highest of them are the expensive joins, where unlike groups are forced together only because the tree must eventually have one root.`,
  promethium: `Promethium is the giveaway. It hangs off on its own long stem and joins a branch only late in the build, at nearly half the tree's full height, a sign that it does not really belong with the commercial minerals at all.`,
};

export const PROFILE_TEXT = `This table gives each group's average score on all fourteen sub-scores. For each sub-score, we average the minerals in the group. The highest value in a row is shaded in that group's colour, so you can see which group leads on it.`;
export const PROFILE_NOTE = `These are averages, so they can fall between the 1-5 or 1-10 band scores. We never add them up.`;

export const METHOD_INTRO = "We study India's 51 critical minerals across ten vectors. There is no single composite score.";
export const METHOD_NOTE: string[] = [
  `Eight of the ten vectors are tied to published quantitative thresholds: tonnes, CAGR bands, market-share percentages, HHI bands, reserve-years, secondary-supply shares, and price-movement percentages. The two qualitative vectors, extraction complexity and strategic posture, are anchored to observable facts (for example, whether a solvent-extraction cascade is required, or whether an offtake has been signed).`,
  `We are open to feedback on how to make this better.`,
];
export const NO_COMPOSITE = `<strong>No single composite score.</strong> Copper, germanium and cerium can add up to the same total, yet their profiles look nothing alike. A single composite score is not helpful: it strips the analysis of exactly this nuance.`;
export const NO_COMPOSITE_MINERALS = ["Copper", "Germanium", "Cerium"];
export const SCORE_SOURCES = "Sources: Indian Minerals Yearbook (IBM), USGS Mineral Commodity Summaries 2026, IEA, and company and government releases. Last updated October 2026.";

/** The explainer on rare-earth-free motors moved to its own domain; the group text still carries the old address. */
export const fixLinks = (html: string): string => html.replace("https://tannmay-python.github.io/pmsm-alternatives-visualizations/", "https://insidethemotor.takshashila.org.in/");
