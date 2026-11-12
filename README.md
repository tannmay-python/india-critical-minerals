# India Critical Minerals (unified, local build)

One site from three sources: the scoring dashboard (51 minerals, ten vectors, six groups), the project map (422 sourced records) and the capability map (26 minerals, 18 capabilities, 10 technology guides). Takshashila Institution. Not deployed; nothing here is pushed anywhere.

## Run it

```sh
npm install
npm run data     # reads ../sources/* and writes public/data (the sources are never modified)
npm run dev      # http://127.0.0.1:5190
```

`npm run data` needs the project map's own data build to have run once in `../sources/india-critical-minerals-map` (`python3 -m venv .venv && .venv/bin/pip install -r requirements.txt && .venv/bin/python -I scripts/build-data.py`).

## Check it

```sh
npm run check    # data parity with the sources, prose parity, copy lint
npm run visit    # opens every kind of page at desktop and phone widths; reports errors and overflow
npm run build    # type-check and production build into dist/
```

## Where things are

- `scripts/build-data.mjs` joins the three sources on mineral name. Scores, reasons, records and capability text are copied, never retyped.
- `src/content/` holds the authors' prose, verbatim; `npm run check` compares it with the source files.
- `src/pages/` one file per page; `src/components/` the visual pieces (periodic table with lenses, radar, value chain, project marks, capability network, clustering tree).
- `src/projects/mapview.ts` and `basemap.ts` are the project map's own modules with paths changed, so the official India boundary handling is unchanged.
- Old links keep working: `#mineral/<Name>`, `#/e/<id>`, `#/p/<id>`, `#/strategy/<slug>`, `#/chemistry/<slug>` (see `src/lib/router.ts`).
