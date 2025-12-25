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

Open `dist/index.html` in a browser after building.

## Android (Capacitor)

First-time setup (already done in this repo):

```sh
bunx cap add android
```

Build + sync web assets:

```sh
bun run build
bun run cap:sync
```

The Android project ignores generated web assets, so run the commands above whenever you change the web app.

Open the native project:

```sh
bun run cap:open
```

Update the app ID/name in `capacitor.config.ts` before publishing.

## Scripts

- `bun run build` - Build web assets into `dist/`.
- `bun run cap:sync` - Sync web assets into the Android project.
- `bun run cap:open` - Open the Android project in Android Studio.
- `bun test` - Run the test suite.
- `bun run typecheck` - Run TypeScript type checks without emitting files.
- `bun run watch` - Rebuild on changes.
