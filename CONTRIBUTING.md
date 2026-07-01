# Contributing to MapSafe

Thank you for your interest in contributing to MapSafe!

MapSafe is a community-driven platform that aims to help users make informed safety decisions by collecting and visualizing community safety reports.

## Project Goals

- Build a reliable and scalable safety mapping platform.
- Follow clean software engineering practices.
- Write maintainable, well-documented code.
- Keep the project beginner-friendly while maintaining professional standards.

---

## Development Workflow

Every new feature should follow this workflow:

1. Create or assign a GitHub Issue.
2. Move the issue to **In Progress**.
3. Create a feature branch.
4. Implement the feature.
5. Test locally.
6. Commit using meaningful commit messages.
7. Push the branch.
8. Open a Pull Request.
9. Merge into `main`.
10. Close the issue and update the Kanban board.

---

## Branch Naming

Use descriptive branch names.

Examples:

```
feature/location-api
feature/ratings-api
feature/authentication
bugfix/login-validation
docs/update-readme
```

---

## Commit Message Convention

Use Conventional Commits where possible.

Examples:

```
feat: add location API
fix: resolve health endpoint bug
docs: update README
refactor: simplify rating service
test: add unit tests for location service
```

---

## Coding Standards

- Use TypeScript.
- Write clear and descriptive comments.
- Keep functions focused on a single responsibility.
- Follow the layered architecture:
  - Routes
  - Controllers
  - Services
  - Prisma/Data Access
- Prefer readable code over clever code.
- Test new functionality before opening a Pull Request.

---

## Pull Requests

Each Pull Request should:

- Reference the related GitHub Issue.
- Include a clear description of the changes.
- Keep the scope focused on a single feature or fix.
- Pass all local tests before merging.

---

## Documentation

When introducing significant architectural decisions:

- Update the README if necessary.
- Add or update an Architecture Decision Record (ADR).
- Document any new environment variables or setup steps.

---

## Reporting Issues

When creating an issue, include:

- A clear title.
- A description of the problem or feature.
- Steps to reproduce (for bugs).
- Expected behaviour.
- Screenshots if applicable.

---

## Thank You

Every contribution, whether code, documentation, bug reports, or suggestions, helps make MapSafe better.