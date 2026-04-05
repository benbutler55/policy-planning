# Policy Planning

Policy Planning is a static editorial website about policies that governments can enact, starting with Universal Basic Income and Land Value Tax. The site is written with a UK-first lens while drawing on examples and evidence from around the world.

## What Is In This Repo

- `src/data/policies/`: authored core policy analysis
- `src/data/evidence/`: refreshable examples and evidence for each policy
- `src/data/sources/`: curated source registries used by the manual refresh command
- `src/assets/`: shared frontend assets for the generated site
- `scripts/build.js`: generates the static site into `dist/`
- `scripts/refresh-policy-evidence.js`: fetches curated sources and uses OpenAI to refresh evidence sections
- `docs/`: technical documentation kept separate from the published website
- `.github/workflows/deploy-pages.yml`: GitHub Pages deployment workflow
- `.claude/commands/policy-updater.md`: manual slash command for refreshing policy evidence

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

To refresh a single policy only:

```bash
OPENAI_API_KEY=your_key npm run refresh:evidence -- universal-basic-income
```

Optional environment variables:

- `OPENAI_MODEL`: defaults to `gpt-4.1-mini`

## Adding A New Policy

1. Add a new authored policy file in `src/data/policies/`.
2. Add a matching evidence file in `src/data/evidence/`.
3. Add a matching curated source registry in `src/data/sources/`.
4. Run `npm run build`.

The build script discovers policy files automatically and will add the new page to the index.

## Evidence Refresh

The manual refresh flow does the following:

1. Reads curated source registries for each policy.
2. Fetches the approved source pages.
3. Sends the source material to OpenAI for synthesis.
4. Updates only the evidence/examples JSON files.
5. Rebuilds the site.

The refresh script is designed to fail clearly if sources cannot be fetched or if the model response is missing structured citations.

## Slash Command

This repo includes a custom Claude slash command:

- `/policy-updater`

Use it to run the evidence refresh manually. It is intended to:

1. Refresh all policy evidence, or a single policy if given a slug.
2. Rebuild the site.
3. Review changes.
4. Commit and push the update.

## GitHub Setup

Repository: `https://github.com/benbutler55/policy-planning`

GitHub Pages is deployed from the `deploy-pages.yml` workflow using the generated `dist/` artifact.

To run the refresh locally or through the slash command, the environment should provide:

- `OPENAI_API_KEY`
- optional `OPENAI_MODEL`
