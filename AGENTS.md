# Habit Tracker Agent Rules

- Follow the current Phase specification before generic conventions.
- Preserve the existing architecture unless structural change is explicitly requested.
- Do not introduce dependencies without a concrete requirement.
- Keep domain logic pure and outside React components.
- Never persist derived state when another source of truth already exists.
- Treat localStorage as untrusted external data.
- Preserve backward-compatible migrations.
- TypeScript strict: no `any`, `@ts-ignore`, or casts used only to silence errors.
- Effects must synchronize with external systems and be safe under React StrictMode.
- Add tests for domain changes and regression bugs.
- Do not implement future phases early.
- Avoid unrelated refactors.
- Before finishing, run:
  - `npm test`
  - `npm run lint`
  - `npm run build`
  - `git diff --check`
- At the end, report changed files, tests, decisions, and risks for the next Phase.

For broader React engineering guidance, see:
`docs/engineering-guidance/react-guidelines.md`