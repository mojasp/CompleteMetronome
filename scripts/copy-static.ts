import { access, cp, mkdir, copyFile, readFile, writeFile } from "fs/promises";
import { join } from "path";

const root = process.cwd();
const distDir = join(root, "dist");

const files = ["index.html", "install.html", "styles.css", "manifest.webmanifest", "sw.js"];
const VERSION_TOKEN = "__APP_VERSION__";
const ANDROID_GRADLE = join(root, "android", "app", "build.gradle");

async function readAndroidVersion() {
  try {
    const gradleText = await readFile(ANDROID_GRADLE, "utf8");
    const match = gradleText.match(/versionName\s+\"([^\"]+)\"/);
    return match?.[1] ?? null;
  } catch {
    return null;
  }
}

async function fileExists(path: string) {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

async function copyFiles() {
  await mkdir(distDir, { recursive: true });
  const androidVersion = await readAndroidVersion();

  for (const file of files) {
    const src = join(root, file);
    const dest = join(distDir, file);
    if (await fileExists(src)) {
      if (file === "index.html") {
        const contents = await readFile(src, "utf8");
        const version = androidVersion ?? "unknown";
        const next = contents.replaceAll(VERSION_TOKEN, version);
        await writeFile(dest, next);
        continue;
      }
      await copyFile(src, dest);
    }
  }

  const assetsSrc = join(root, "assets");
  const assetsDest = join(distDir, "assets");
  if (await fileExists(assetsSrc)) {
    await cp(assetsSrc, assetsDest, { recursive: true });
  }
}

void copyFiles();
