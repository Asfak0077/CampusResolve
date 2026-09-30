<!-- Thanks for contributing! Please fill in the sections below. -->

## What does this PR change?

<!-- One or two sentences. Link the issue it closes: "Closes #123" -->

## Type of change

- [ ] 🐛 Bug fix
- [ ] ✨ New feature
- [ ] 🔐 Security fix
- [ ] 📝 Documentation
- [ ] ♻️ Refactor / performance
- [ ] 🔧 Tooling, CI or dependencies

## How was it tested?

<!-- Exact commands and what you observed. Screenshots for UI changes. -->

```bash
npm run lint
npm run build:frontend
node backend/scripts/security-smoke-test.mjs   # with the API running
```

## Checklist

- [ ] `npm run lint` passes with zero errors
- [ ] `npm run build:frontend` succeeds
- [ ] Authorization smoke test passes (and was updated if routes changed)
- [ ] New or changed endpoints are documented in `docs/API.md`
- [ ] No secrets, credentials, personal data or build artifacts are committed
- [ ] Commits follow Conventional Commits
- [ ] UI changes include a screenshot or recording

## Notes for reviewers

<!-- Anything risky, anything you're unsure about, follow-up work. -->
