# Simple Metronome

Browser-based metronome with adjustable tempo, time signatures, and subdivisions.

## Development

Install dependencies:

```sh
bun install
```

Build TypeScript:

```sh
bun run build
```

Run tests:

```sh
bun test
```

Open `index.html` in a browser after building to load `dist/app.js`.

## Scripts

- `bun run build` - Compile and minify to `dist/app.js`.
- `bun test` - Run the test suite.
- `bun run typecheck` - Run TypeScript type checks without emitting files.
- `bun run watch` - Rebuild on changes.
