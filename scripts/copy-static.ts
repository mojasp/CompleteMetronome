import { access, cp, mkdir, copyFile } from "fs/promises";
import { join } from "path";

const root = process.cwd();
const distDir = join(root, "dist");

const files = ["index.html", "styles.css", "manifest.webmanifest", "sw.js"];

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

  for (const file of files) {
    const src = join(root, file);
    const dest = join(distDir, file);
    if (await fileExists(src)) {
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
