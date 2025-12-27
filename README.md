# Complete Metronome

[Browser-based and feature-complete metronome](https://mojasp.github.io/CompleteMetronome/). It is feature-complete in the sense that it has all the features that i want and imagine to be useful, nothing more.
The intended audience is mobile, very low care is given to
provide an ergonomic desktop experience although it works - but the ui might
not be nice.

Features:

* Adjusttable tempo, some basic sounds, time signature.
* Click subdivision to accent or mute them.
* Subdivide the bar further if needed (8ths, triplets, etc.).
* Loudness slider to increase the volume on mobile devices with a weak speaker.
* Trainer: Increase tempo every x bars / seconds.
* Random mute: randomly mute any subdivisions to train your internal pulse.
* Accent every xth bar - This can help to check that you have not lost the form when practicing a tune.

No runtime dependencies except for capacitor for android builds; no backend.
Everything is html, css and vanilla typescript.

**Disclaimer**: The following part of this readme as well as the rest of the
codebase are heavily vibecoded. If you read further, know that you are reading
the output of a computer program: do not seek structure or meaning. I do not
advocate the use of LLM's - nothing was learned, no knowledge gained in the
developpment of this piece of software. In a way, i regret this. But I am not a web
developer, and my previous metronome app introduced pop-up ads. This one
will never have ads.

## License

This project is licensed under the GNU Affero General Public License v3.0.
See the LICENSE file for details.

## Roadmap

This is pretty much complete in terms of features. Some bugfixes may follow, potentially some small-ish QoL and UI updates. Moreover, maybe i will introduce some icons if i get around to finding a FOSS iconset for notes. Uneven subdivisions for a bar and/or swing percentages would be nice, but they are really a gimmick imo. If you have easy-to-implement requests, feel free to open an issue.

## Contributions

I am accepting contributions and bug reports, feel free to open issues or pull requests.

## Development

I used bun, but do whatever you like. To install:

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

Checklist before building & publishing an android app:

* Update the version in gradle
* Update the cache name in the service worker `sw.js`

## Available commands

- `bun run build` - Build web assets into `dist/`.
- `bun run cap:sync` - Sync web assets into the Android project.
- `bun run cap:open` - Open the Android project in Android Studio.
- `bun run typecheck` - Run TypeScript type checks without emitting files.
- `bun run watch` - Rebuild on changes.
