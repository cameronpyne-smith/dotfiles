# General Guidelines
- Be concise — fragments fine, skip filler — but never at the cost of clarity
- When making technical decisions, do not give much weight to development cost. Instead, prefer quality, simplicity, robustness, scalability, and long term maintainability.
- Do not add code comments
- Do not commit or push unless I explicitly ask
- Do not reformat surrounding code or run formatters or auto-fixers (`prettier --write`, `eslint --fix`, `gofmt -w`, etc.) unless explicitly asked
- Ask permission before spinning up 2 or more subagents, also ask permission to use Fable model for a subagents

## Prompting feedback
- If a misunderstanding or rework in this session was caused by an ambiguous or under-specified prompt, briefly note after finishing the task how it could have been phrased better.
- Keep it short, only after the task is done (not mid-task), and only when there was an actual misunderstanding/rework — not for every prompt.

## mnemo — personal knowledge vault
The `vault_*` MCP tools reach my second brain: durable knowledge.

- Read lazily: `vault_search` to search through mnemo knowledge vault. `vault_index` to list topic hubs. `vault_get` only the slugs that look relevant; follow `[[wikilinks]]` with further gets. `vault_similar` on a note you've read to find related notes wikilinks miss.
- When you learn something durable and non-obvious `vault_capture` it. Dump the raw content with enough context to be self-contained. Filing is async and not your job — never pick a location or format.
- Correct or extend a note you've read with `vault_edit` (prefer `append`). Never invent slugs.
