# Repository Guidelines

## Project Structure & Module Organization

This repository is currently empty aside from its Git history. As the project grows, keep a clear top-level layout. Suggested structure:

- `src/` for application source code
- `tests/` for automated tests
- `assets/` for static resources (audio samples, icons, etc.)
- `scripts/` for developer tooling and one-off utilities
- `README.md` for user-facing setup and usage instructions

If you introduce a build system, keep configuration files in the root (e.g., `package.json`, `pyproject.toml`, `Cargo.toml`).

## Build, Test, and Development Commands

No build or test commands are defined yet. When adding them, document the canonical commands in `README.md` and keep them consistent. Examples to standardize on:

- `npm run dev` for local development
- `npm test` for unit tests
- `make build` for production builds

## Coding Style & Naming Conventions

No language or formatter is defined yet. When you add code, pick a formatter/linter early (e.g., `prettier`, `eslint`, `black`, `gofmt`) and enforce it via CI. Suggested naming patterns:

- `snake_case` for file names in Python
- `kebab-case` for asset files (e.g., `click-track.wav`)
- `UpperCamelCase` for class names

## Testing Guidelines

No test framework is configured yet. When you add tests, keep them co-located in `tests/` and name them by feature, e.g., `tests/test_tempo.py` or `tests/metronome.test.ts`. Document how to run the suite and any coverage expectations.

## Commit & Pull Request Guidelines

There is no commit history yet, so no conventions are established. When you start committing, use short, imperative messages such as:

- `Add metronome tick scheduler`
- `Fix tempo drift at high BPM`

For pull requests, include:

- A concise description of the change
- Steps to test locally
- Screenshots or audio samples if UI or sound output changes

## Configuration & Security Notes

Keep secrets out of the repo. If configuration is needed, use example files like `config.example.json` and document required environment variables in `README.md`.
