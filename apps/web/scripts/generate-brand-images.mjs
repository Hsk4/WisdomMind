/**
 * Render every bitmap size the site and the app need from the brand masters.
 *
 * Masters:
 *   newlogo.jpg                     the school's artwork (repository root): cap,
 *                                   brain and book. Source of the tab icon and
 *                                   the home-screen icon.
 *   brand-kit/logo/wma-mark.svg     square app mark  (PWA, launcher)
 *   brand-kit/logo/wma-lockup.svg   arch + wordmark  (Open Graph card)
 *   brand-kit/logo/wma-splash.svg   lockup on navy   (native splash)
 *
 * Writes:
 *   apps/web/app/icon.svg, icon.png, apple-icon.png, opengraph-image.png,
 *   favicon.ico
 *   apps/web/public/brand/logo/wma-*.{svg,png}   (served copies, logo.png for emails)
 *   apps/web/public/icons/*                      (web app manifest icons)
 *   brand-kit/png/*, brand-kit/capacitor-assets/*
 *
 * Uses `sharp`, which Next already ships. Re-run after any change to the
 * masters: `node scripts/generate-brand-images.mjs` (npm run brand:images).
 */
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const here = path.dirname(fileURLToPath(import.meta.url));
const webRoot = path.resolve(here, "..");
const repoRoot = path.resolve(webRoot, "../..");
const brand = path.join(repoRoot, "brand-kit");
const appDir = path.join(webRoot, "app");
const publicBrand = path.join(webRoot, "public/brand/logo");

const SOURCE_LOGO = path.join(repoRoot, "newlogo.jpg");
const MARK = path.join(brand, "logo/wma-mark.svg");
const LOCKUP = path.join(brand, "logo/wma-lockup.svg");
const SPLASH = path.join(brand, "logo/wma-splash.svg");

/** sharp lives in the hoisted store in this monorepo; fall back to a plain resolve. */
function loadSharp() {
  const candidates = [
    path.join(repoRoot, "node_modules/.bun/node_modules/sharp"),
    "sharp",
  ];
  for (const candidate of candidates) {
    try {
      return require(candidate);
    } catch {
      // try the next one
    }
  }
  throw new Error("sharp is not installed; cannot render brand images");
}

const sharp = loadSharp();

/**
 * Rasterise an SVG into an exact box. `contain` keeps the aspect ratio and
 * `background` fills the letterbox (navy for the OG card, transparent for the
 * icons, so dark mode does not paint a white square).
 */
function render(source, width, height = width, { background } = {}) {
  return sharp(source, { density: 384 })
    .resize(width, height, { fit: "contain", position: "centre", background })
    .png();
}

async function png(source, dest, width, height = width, options) {
  await fs.mkdir(path.dirname(dest), { recursive: true });
  await render(source, width, height, options).toFile(dest);
  return `${path.relative(repoRoot, dest)} (${width}×${height})`;
}

/**
 * Square tab icon from `newlogo.jpg`, built once and resized from 1024px.
 *
 * `newlogo.jpg` holds the emblem (cap, brain, book) above the words WISDOM /
 * MIND ACADEMY. Only the emblem goes in the tile: the wordmark is unreadable at
 * 16px, and the emblem is nearly square where the full page is 4:3. The page is
 * trimmed to its ink first, so the JPEG's own margins do not decide the scale.
 */
async function makeIconMaster() {
  const inked = await sharp(
    await sharp(SOURCE_LOGO, { sequentialRead: true }).png().toBuffer(),
  )
    .flatten({ background: "#FFFFFF" })
    .trim({ threshold: 12 })
    .toBuffer({ resolveWithObject: true });
  const { width, height } = inked.info;
  const grey = await sharp(inked.data).greyscale().raw().toBuffer();
  const darkInRow = (y) => {
    let dark = 0;
    for (let x = 0; x < width; x += 1) {
      if (grey[y * width + x] < 200) dark += 1;
    }
    return dark / width;
  };

  /*
   * Cut above the first wordmark line: walk down until a long quiet band opens
   * (the gap under "MIND ACADEMY"), then step back to the last row that still
   * had ink. 20 rows at this size is roughly the letter gap, not a hairline.
   */
  let cut = height;
  let quiet = 0;
  for (let y = Math.round(height * 0.4); y < height; y += 1) {
    quiet = darkInRow(y) < 0.004 ? quiet + 1 : 0;
    if (quiet > 20) {
      cut = y - quiet - 1;
      break;
    }
  }

  const emblem = await sharp(
    await sharp(inked.data)
      .extract({ left: 0, top: 0, width, height: cut })
      .png()
      .toBuffer(),
  )
    .trim({ threshold: 12 })
    .resize(940, 940, { fit: "inside" })
    .png()
    .toBuffer();

  return sharp({
    create: { width: 1024, height: 1024, channels: 3, background: "#FFFFFF" },
  })
    .composite([{ input: emblem, gravity: "centre" }])
    .png()
    .toBuffer();
}

/**
 * Minimal 32-bit ICO writer: a PNG inside an .ico is valid from Windows Vista
 * on, which is everything that reads favicon.ico today.
 */
async function ico(pngBuffers, dest) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // type: icon
  header.writeUInt16LE(pngBuffers.length, 4);

  const entries = [];
  let offset = 6 + 16 * pngBuffers.length;
  for (const { size, buffer } of pngBuffers) {
    const entry = Buffer.alloc(16);
    entry.writeUInt8(size >= 256 ? 0 : size, 0); // width
    entry.writeUInt8(size >= 256 ? 0 : size, 1); // height
    entry.writeUInt8(0, 2); // palette
    entry.writeUInt8(0, 3); // reserved
    entry.writeUInt16LE(1, 4); // colour planes
    entry.writeUInt16LE(32, 6); // bits per pixel
    entry.writeUInt32LE(buffer.length, 8);
    entry.writeUInt32LE(offset, 12);
    offset += buffer.length;
    entries.push(entry);
  }

  await fs.writeFile(
    dest,
    Buffer.concat([header, ...entries, ...pngBuffers.map((b) => b.buffer)]),
  );
  return path.relative(repoRoot, dest);
}

async function main() {
  for (const file of [SOURCE_LOGO, MARK, LOCKUP, SPLASH]) await fs.access(file);

  await fs.mkdir(publicBrand, { recursive: true });
  await fs.mkdir(path.join(webRoot, "public/icons"), { recursive: true });
  await fs.mkdir(path.join(brand, "png"), { recursive: true });
  await fs.mkdir(path.join(brand, "capacitor-assets"), { recursive: true });
  await fs.mkdir(path.join(appDir), { recursive: true });

  const written = [];

  /* ------------------------------------------------------------ masters */

  await fs.copyFile(MARK, path.join(appDir, "icon.svg"));
  await fs.copyFile(MARK, path.join(publicBrand, "wma-mark.svg"));
  await fs.copyFile(LOCKUP, path.join(publicBrand, "wma-lockup.svg"));
  await fs.copyFile(LOCKUP, path.join(brand, "png/wma-lockup.svg"));
  written.push(
    "app/icon.svg",
    ...["wma-mark.svg", "wma-lockup.svg"].map((n) => `public/brand/logo/${n}`),
  );

  /* ------------------------------------------------------------ browser */

  /* The tab icon, its PNG fallback and the home-screen icon, from the JPEG. */
  const iconMaster = await makeIconMaster();
  const iconAt = (size) =>
    sharp(iconMaster).resize(size, size, { kernel: "lanczos3" }).png();
  const iconPng = async (dest, size) => {
    await fs.mkdir(path.dirname(dest), { recursive: true });
    await iconAt(size).toFile(dest);
    return `${path.relative(repoRoot, dest)} (${size}×${size})`;
  };

  written.push(await iconPng(path.join(appDir, "icon.png"), 512));
  written.push(await iconPng(path.join(appDir, "apple-icon.png"), 180));
  written.push(await iconPng(path.join(publicBrand, "wma-apple-touch.png"), 180));
  written.push(await iconPng(path.join(publicBrand, "wma-logo.png"), 512));

  const icoBuffers = [];
  for (const size of [16, 32, 48]) {
    icoBuffers.push({ size, buffer: await iconAt(size).toBuffer() });
  }
  written.push(await ico(icoBuffers, path.join(appDir, "favicon.ico")));
  written.push(await iconPng(path.join(brand, "png/favicon-32.png"), 32));
  written.push(await iconPng(path.join(brand, "png/favicon-48.png"), 48));

  /* --------------------------------------------------------------- PWA */

  written.push(await iconPng(path.join(webRoot, "public/icons/icon-192.png"), 192));
  written.push(await iconPng(path.join(webRoot, "public/icons/icon-512.png"), 512));
  /* Maskable artwork is already inset well inside the launcher's safe circle. */
  written.push(await iconPng(path.join(webRoot, "public/icons/maskable-512.png"), 512));

  /* ----------------------------------------------------- social preview */

  written.push(
    await png(LOCKUP, path.join(appDir, "opengraph-image.png"), 1200, 630, {
      background: "#0E2B52",
    }),
  );

  /* ------------------------------------------------------------ brand kit */

  written.push(await png(MARK, path.join(brand, "png/wma-icon-1024.png"), 1024));
  written.push(await iconPng(path.join(brand, "png/pwa-192.png"), 192));
  written.push(await iconPng(path.join(brand, "png/pwa-512.png"), 512));
  written.push(await iconPng(path.join(brand, "png/apple-touch-180.png"), 180));
  written.push(
    await png(LOCKUP, path.join(brand, "png/og-wma-1200x630.png"), 1200, 630, {
      background: "#0E2B52",
    }),
  );

  /* ------------------------------------------------ capacitor (native) */

  written.push(
    await iconPng(path.join(brand, "capacitor-assets/icon-only.png"), 1024),
  );
  written.push(
    await iconPng(path.join(brand, "capacitor-assets/icon-foreground.png"), 1024),
  );
  written.push(
    await iconPng(path.join(brand, "capacitor-assets/icon-background.png"), 1024),
  );
  written.push(
    await png(
      SPLASH,
      path.join(brand, "capacitor-assets/splash.png"),
      2732,
      2732,
    ),
  );
  written.push(
    await png(
      SPLASH,
      path.join(brand, "capacitor-assets/splash-dark.png"),
      2732,
      2732,
    ),
  );

  console.log(`[brand-images] wrote ${written.length} files`);
  for (const line of written) console.log(`  ${line}`);
}

main().catch((error) => {
  console.error(`[brand-images] ${error.message}`);
  process.exit(1);
});
