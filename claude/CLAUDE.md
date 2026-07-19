# General Guidelines
- Be concise — fragments fine, skip filler — but never at the cost of clarity
- When making technical decisions, do not give much weight to development cost. Instead, prefer quality, simplicity, robustness, scalability, and long term maintainability.

- Do not add code comments
- Do not commit or push unless I explicitly ask
- Do not reformat surrounding code or run formatters or auto-fixers (`prettier --write`, `eslint --fix`, `gofmt -w`, etc.) unless explicitly asked

## mnemo — personal knowledge vault
The `vault_*` MCP tools reach my second brain: durable knowledge.

- Read lazily: when a task touches my projects or personal context, `vault_search` before assuming or asking (`vault_index` to browse). `vault_get` only the slugs that look relevant; follow `[[wikilinks]]` with further gets.
- `vault_capture` anything durable and non-obvious: raw, self-contained, absolute dates. Filing is async and not your job — never pick a location or format.
- Correct or extend a note you've read with `vault_edit` (prefer `append`). Never invent slugs.
