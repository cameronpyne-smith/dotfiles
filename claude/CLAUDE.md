# General Guidelines
- Be concise — fragments fine, skip filler — but never at the cost of clarity
- When making technical decisions, do not give much weight to development cost. Instead, prefer quality, simplicity, robustness, scalability, and long term maintainability.
- Do not add code comments
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

## ordo — personal todo daemon
The `todo_*` MCP tools are my task list. mnemo remembers, ordo orders.

- Anything I say I need to do is a `todo_add`, not a note. Pass the whole sentence as the title and leave the other fields alone: the daemon reads it with a local model and fills in due date, difficulty, recurrence and priority itself. Set a field only when you know something the sentence does not say.
- `todo_list` before answering anything about what to do next, and re-read it rather than remembering it — fields fill in asynchronously. Reprioritising, planning a week and "what should I focus on" are yours: read the list, then `todo_set`. Editing priority is welcome; inference only ever fills fields that are still empty.
- When a task comes out of a note, `todo_link` it to that slug — the note is the thinking, the tasks are what is in flight from it. `todo_related` finds the note when you do not know the slug. ordo only reads mnemo; nothing here changes a note.
