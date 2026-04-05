Refresh the policy evidence layer for this repository.

Arguments:
- Optional policy slug such as `universal-basic-income` or `land-value-tax`
- If no argument is provided, refresh all policy evidence files

Execution rules:
1. Check the current git status first and do not revert unrelated changes.
2. Verify that `OPENAI_API_KEY` is available in the environment before running the refresh. If it is missing, stop and tell the user what is needed.
3. Run `npm run refresh:evidence -- $ARGUMENTS` when arguments are present, otherwise run `npm run refresh:evidence`.
4. Run `npm run build` after the refresh completes.
5. Review the changed evidence files and confirm that only the refreshable evidence layer changed unless the user asked for broader edits.
6. Do not rewrite files under `src/data/policies/` unless the user explicitly asks for changes to the authored policy analysis.
7. Commit the completed refresh and push it to the configured remote.

Output expectations:
- Summarise which policy files were refreshed.
- Note any source fetch failures or citation-validation failures.
- Report the commit hash and push result.
