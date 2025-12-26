# Simple Metronome

Browser-based metronome with adjustable tempo, time signatures, and
subdivisions. The intended audience is mobile, very low care is given to
provide an ergonomic desktop experience although it works - but the ui might
not be nice.

Features:

* Adjusttable tempo, some basic sounds, time signature.
* Click subdivision to accent or mute them.
* Subdivide the bar further if needed (8ths, triplets, etc.).
* Loudness slider to increase the volume on mobile devices with a weak speaker.
* Trainer: Increase tempo every x bars / seconds.
* Random mute: randomly mute measures to train your internal pulse.
* Accent every xth bar - This can help to check that you have not lost the form.

No runtime dependencies except for capacitor for android builds; no backend.
Everything is html, css and vanilla typescript.

Disclaimer: The proceeding part of this readme, as well as the rest of the
codebase, are heavily vibecoded. If you read further, know that you are reading
the output of a computer program: do not seek structure or meaning. I do not
advocate the use of LLM's - nothing was learned, no knowledge gained in the
developpment of this software. In a way, i regret this. But I am not a web
developer, and my previous metronome app introduced pop-up ads. This one
does not have them.


## Development

Requires bun; you can use npm but Install dependencies:

```sh
bun install
```

Build TypeScript:

```sh
bun run build
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

## Available commands

- `bun run build` - Build web assets into `dist/`.
- `bun run cap:sync` - Sync web assets into the Android project.
- `bun run cap:open` - Open the Android project in Android Studio.
- `bun run typecheck` - Run TypeScript type checks without emitting files.
- `bun run watch` - Rebuild on changes.
