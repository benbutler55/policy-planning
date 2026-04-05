# Policy Planning

Policy Planning is a static editorial website about policies that governments can enact, starting with Universal Basic Income and Land Value Tax. The site is written with a UK-first lens while drawing on examples and evidence from around the world.

## What Is In This Repo

- `src/data/policies/`: authored core policy analysis
- `src/data/evidence/`: refreshable examples and evidence for each policy
- `src/data/sources/`: curated source registries used by the weekly refresh workflow
- `src/assets/`: shared frontend assets for the generated site
- `scripts/build.js`: generates the static site into `dist/`
- `scripts/refresh-policy-evidence.js`: fetches curated sources and uses OpenAI to refresh evidence sections
- `docs/`: technical documentation kept separate from the published website
- `.github/workflows/deploy-pages.yml`: GitHub Pages deployment workflow
- `.github/workflows/refresh-evidence.yml`: scheduled weekly evidence refresh workflow

## Published Site Boundary

Only generated content in `dist/` is published to GitHub Pages. Technical documentation and implementation notes remain in the repository and are not part of the public website.

## Local Development

Requirements:

- Node.js 20+

Commands:

```bash
npm run build
```

This generates the website into `dist/`.

To run the evidence refresh locally:

```bash
OPENAI_API_KEY=your_key npm run refresh:evidence
```

Optional environment variables:

- `OPENAI_MODEL`: defaults to `gpt-4.1-mini`

## Adding A New Policy

1. Add a new authored policy file in `src/data/policies/`.
2. Add a matching evidence file in `src/data/evidence/`.
3. Add a matching curated source registry in `src/data/sources/`.
4. Run `npm run build`.

The build script discovers policy files automatically and will add the new page to the index.

## Evidence Refresh Workflow

The weekly workflow does the following:

1. Reads curated source registries for each policy.
2. Fetches the approved source pages.
3. Sends the source material to OpenAI for synthesis.
4. Updates only the evidence/examples JSON files.
5. Rebuilds the site.
6. Commits and pushes refreshed evidence back to `main`.

The workflow is designed to fail clearly if sources cannot be fetched or if the model response is missing structured citations.

## GitHub Setup

Repository: `https://github.com/benbutler55/policy-planning`

Required repository secret:

- `OPENAI_API_KEY`

Optional repository variable or secret:

- `OPENAI_MODEL`

GitHub Pages is deployed from the `deploy-pages.yml` workflow using the generated `dist/` artifact.
