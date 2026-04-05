# Implementation Notes

## Site Model

The repository uses a small Node-based static site generator instead of hand-maintained HTML files.

- Authored policy analysis lives in `src/data/policies/`.
- Refreshable global examples and evidence live in `src/data/evidence/`.
- Curated source lists for the evidence refresh job live in `src/data/sources/`.

This split keeps the long-lived editorial judgement separate from the automatically refreshed evidence layer.

## Build Flow

`scripts/build.js`:

1. Loads site metadata.
2. Discovers all policy JSON files.
3. Loads the matching evidence JSON for each policy.
4. Renders the index page and detail pages into `dist/`.
5. Copies shared assets into `dist/assets/`.

## Refresh Flow

`scripts/refresh-policy-evidence.js`:

1. Loads the curated source registry for each policy.
2. Fetches each approved URL and extracts a plain-text excerpt.
3. Sends the combined source excerpts to OpenAI.
4. Requires a structured JSON response containing examples, analysis, and citations.
5. Rewrites only the matching evidence JSON file.

## Publishing Boundary

The public website should only contain policy analysis.

Keep the following out of the public site:

- workflow instructions
- maintenance notes
- deployment runbooks
- agent instructions
- implementation detail
