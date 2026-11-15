/**
 * The school's lockup — the arch, the open book and "WISDOM / MIND ACADEMY" —
 * as drawn in `brand-kit/logo/wma-lockup.svg` (a vector redraw of
 * `newlogo.jpg`). The same file is used for the favicon, the PWA icon, the
 * Android launcher and the native splash, so the identity cannot drift between
 * the site and the app.
 *
 * The wordmark is part of the artwork, not live text: at 30px the stacked
 * lines would be unreadable if they were HTML. `size` is the width in px and
 * the height follows the 4:3 source, so the header, the footer and the splash
 * all pass one number.
 *
 * The artwork fills the viewBox edge to edge and the tile *is* the viewBox, so
 * nothing here may scale it below `minSize`. Below that the two wordmark lines
 * turn to mush, which is why `BrandLogoMark` exists: headers that used to show
 * a 30px arch now show the whole lockup at its smallest legible size instead.
 */
export function BrandLogo({
  size = 240,
  minSize = 88,
  tone = "light",
  className = "",
  title,
}: {
  /** Rendered width in px. Height is 0.75 × this, and it never shrinks below `minSize`. */
  size?: number;
  /** Smallest legible width; the artwork below this is unreadable, not just small. */
  minSize?: number;
  /** `light` draws the cream tile for navy; `dark` draws the white artwork. */
  tone?: "light" | "dark";
  className?: string;
  /** Only pass a title when the logo is not already inside a labelled link. */
  title?: string;
}) {
  const width = Math.max(size, minSize);
  return (
    <svg
      viewBox="0 0 640 480"
      width={width}
      height={width * 0.75}
      role={title ? "img" : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
      className={className}
      style={{ maxWidth: "100%", height: "auto" }}
    >
      {tone === "light" ? (
        <rect width="640" height="480" fill="#FFFFFF" />
      ) : null}

      <path
        d="M146 392 V250 C146 176 206 122 280 74 C354 122 414 176 414 250 V392"
        fill="none"
        stroke={tone === "light" ? "#0E2B52" : "#FFFFFF"}
        strokeWidth="22"
      />
      <path
        d="M182 384 V254 C182 192 228 148 280 112 C332 148 378 192 378 254 V384"
        fill="none"
        stroke="#D4AF6A"
        strokeWidth="6"
      />

      {/* Open book, back cover first so the pages sit on top. */}
      <path d="M280 268 L400 292 L400 358 L280 334 Z" fill="#F2F2F0" />
      <path d="M280 274 L394 297 L394 306 L280 283 Z" fill="#D4AF6A" fillOpacity="0.55" />
      <path d="M280 291 L394 314 L394 323 L280 300 Z" fill="#D4AF6A" fillOpacity="0.55" />
      <path d="M280 308 L394 331 L394 340 L280 317 Z" fill="#D4AF6A" fillOpacity="0.55" />
      <path d="M160 292 L280 268 L400 292 L400 358 L280 334 L160 358 Z" fill="#0E2B52" />
      <path d="M186 277 L280 258 L374 277 L374 287 L280 268 L186 287 Z" fill="#D4AF6A" />
      <path
        d="M280 268 L280 334"
        stroke="#D4AF6A"
        strokeWidth="10"
        strokeLinecap="round"
      />

      <rect x="196" y="398" width="168" height="4" fill="#D4AF6A" />
      <rect x="212" y="470" width="136" height="4" fill="#D4AF6A" />

      <g fontFamily="Georgia, 'Times New Roman', serif" textAnchor="middle">
        <text
          x="280"
          y="436"
          fontSize="48"
          fill={tone === "light" ? "#0E2B52" : "#FFFFFF"}
          textLength="196"
          lengthAdjust="spacingAndGlyphs"
        >
          WISDOM
        </text>
        <text
          x="280"
          y="462"
          fontSize="16"
          fill="#D4AF6A"
          textLength="188"
          lengthAdjust="spacingAndGlyphs"
        >
          MIND ACADEMY
        </text>
      </g>
    </svg>
  );
}

/** Square mark for the tab, the header and the splash: the arch and book only. */
export function BrandLogoMark({
  size = 32,
  className = "",
}: {
  size?: number;
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 256 256"
      width={size}
      height={size}
      aria-hidden="true"
      className={className}
    >
      <rect width="256" height="256" rx="56" fill="#0E2B52" />
      <g transform="translate(-58 -27) scale(0.62)">
        <path
          d="M146 392 V250 C146 176 206 122 280 74 C354 122 414 176 414 250 V392"
          fill="#FFFFFF"
          stroke="#F6F1E7"
          strokeWidth="22"
        />
        <path
          d="M182 384 V254 C182 192 228 148 280 112 C332 148 378 192 378 254 V384"
          fill="none"
          stroke="#D4AF6A"
          strokeWidth="7"
        />
        <path d="M280 268 L400 292 L400 358 L280 334 Z" fill="#F2F2F0" />
        <path d="M280 274 L394 297 L394 306 L280 283 Z" fill="#D4AF6A" fillOpacity="0.55" />
        <path d="M280 291 L394 314 L394 323 L280 300 Z" fill="#D4AF6A" fillOpacity="0.55" />
        <path d="M280 308 L394 331 L394 340 L280 317 Z" fill="#D4AF6A" fillOpacity="0.55" />
        <path
          d="M160 292 L280 268 L400 292 L400 358 L280 334 L160 358 Z"
          fill="#0E2B52"
        />
        <path d="M186 277 L280 258 L374 277 L374 287 L280 268 L186 287 Z" fill="#D4AF6A" />
        <path d="M280 268 L280 334" stroke="#D4AF6A" strokeWidth="10" strokeLinecap="round" />
        <rect x="196" y="398" width="168" height="5" fill="#D4AF6A" />
      </g>
    </svg>
  );
}
