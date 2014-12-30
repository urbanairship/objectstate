# Submitting Issues

Before submitting a new issue, please search the [existing issues][issues].

When submitting bug reports, please include as many details as you can. A good
bug report should include:

- Why the behavior you're seeing qualifies as a bug
- Detailed steps to reproduce the bug, in as minimal of a test case as possible 
- What steps you've taken toward resolving the bug
- Information about the environment in which you're seeing the bug (nodejs,
  browserify) and which browsers if it's a browser-specific bug.

# Creating Pull Requests

- Make minimal changes. PRs should be per-feature or per-issue
- Squash commits to a single commit before submitting your PR.
- Follow the existing coding style
- Do not break existing tests
- Write tests for features you add, or bugs you fix
- When submitting your PR, be sure to describe what your PR does, why, and what
  open issues it addresses, if any
- Do not bump the `package.json` version; the maintainers will determine when
  to bump versions and release

Workflow for creating a pull request:

1. Fork this repository
2. Create a branch in your new fork for the feature/fix you are working on
3. _Write some code, tests_
4. Submit a PR from your fork's branch
5. The maintainers will provide feedback, or accept your PR
6. Rebase your branch off the current master, and squash commits
7. Force-push to your fork's branch, and let the maintainer's know that it's
   ready for merge

# Licensing

All contributions are covered under the Apache License, Version 2.0. See
[LICENSE][license] for details.

[license]: ./LICENSE
[issues]: https://github.com/urbanairship/objectstate/issues/
