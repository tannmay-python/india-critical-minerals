# CLAUDE.md: India Critical Minerals, unified site

Owner: Tannmay Kumarr Baid (Takshashila Institution). This merges three of his sites into one. Read README.md for commands.

## Rules that do not bend
- Local only until the owner says otherwise. Never push or deploy. `../sources/*` are read-only clones.
- The research is the owner's: scores, reasons, project records and capability text are copied by `scripts/build-data.mjs`, never edited here. If something looks wrong, list it for him; do not fix it in the data.
- Text is kept to the minimum: no eyebrow labels, kickers, helper captions or decorative uppercase labels (`npm run check` fails on them). Visualisation is where to be ambitious, provided it is useful.
- The official India boundary handling in `src/projects/` must not change (see the project map's CLAUDE.md, section 5).
- No personal contact data; individual bidders stay "name withheld" as in the source.
- The capability map was written as an internal document. Ask the owner before anything containing it is published.

## Design
- Takshashila house style: plum #620d3c and marigold #f1a222 on cream #fffbe2; Newsreader headings, Hanken Grotesk text and figures, Space Mono for tiny tags only. Hairlines, not shadows. Tokens in `src/styles/tokens.css`, mirrored for canvas and SVG in `src/lib/colors.ts`.
- Group colours: groups 1 and 2 are the brand colours; 3 to 6 are stepped slightly from the dashboard's originals so every pair passes colour-vision checks. Stage colours are the project map's validated five.
- One idea recurs: the same marks under different lenses. The periodic table re-colours and regroups; the project marks are a map, a chain, a timeline or an auction ledger.
- Each mineral's page is the hub where the three sources meet, on its value chain.

## Before calling a change done
`npm run check`, `npm run visit`, `npx tsc --noEmit`, and look at the page in a browser at desktop and phone widths.
