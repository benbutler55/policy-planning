# AGENTS

## Repo Summary

This repository contains a generated static website about government policy analysis.

- The published website is built into `dist/` from source content in `src/`.
- The public site is for policy analysis only.
- Technical implementation notes, workflow details, and maintenance documentation must stay outside the published website in `docs/`, workflow files, scripts, and other repository-only locations.

## Required Agent Rules

1. Always commit completed changes to git.
2. Always push committed changes to the configured remote.
3. Keep `README.md` up to date whenever the repo structure, workflows, or usage changes.
4. Keep technical documentation completely separate from the published website.
5. Do not place engineering notes, maintenance instructions, or operational details in the generated policy pages.
6. Preserve citation traceability for any automated evidence refresh.
7. The scheduled refresh should update evidence and examples only, not silently rewrite the authored core analysis without explicit instruction.
