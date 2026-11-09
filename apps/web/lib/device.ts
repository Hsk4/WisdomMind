"use client";

/**
 * The phone this app is running on.
 *
 * One parent account is bound to one phone. The binding is only enforced for
 * the native app: a browser has no stable device, so a web sign-in neither
 * binds nor is refused. The id is a random UUID kept in `localStorage`, which
 * survives app restarts and updates but not a reinstall — a reinstall is a
 * new phone as far as the school is concerned, and the office can unlock it.
 */

const DEVICE_ID_KEY = "lms-device-id";

type CapacitorBridge = {
  isNativePlatform?: () => boolean;
  getPlatform?: () => string;
};

function bridge(): CapacitorBridge | undefined {
  if (typeof window === "undefined") return undefined;
  return (window as unknown as { Capacitor?: CapacitorBridge }).Capacitor;
}

/** True inside the Capacitor shell (Android/iOS), false in a browser. */
export function isNativeApp(): boolean {
  const capacitor = bridge();
  return typeof capacitor?.isNativePlatform === "function"
    ? capacitor.isNativePlatform()
    : false;
}

/** A stable id for this install, created on first use. */
export function getDeviceId(): string {
  if (typeof window === "undefined") return "";
  try {
    const existing = window.localStorage.getItem(DEVICE_ID_KEY);
    if (existing) return existing;
    const id =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `dev-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    window.localStorage.setItem(DEVICE_ID_KEY, id);
    return id;
  } catch {
    // Private mode or a full quota: a per-session id still lets the parent in,
    // and the next sign-in simply looks like a new phone.
    return `dev-${Date.now()}`;
  }
}

/** A short, human label the office can recognise in the audit log. */
export function deviceLabel(): string {
  if (typeof navigator === "undefined") return "Unknown device";
  const platform = bridge()?.getPlatform?.();
  const ua = navigator.userAgent;
  const os = /Android/i.test(ua)
    ? "Android"
    : /iPhone|iPad|iPod/i.test(ua)
      ? "iOS"
      : platform
        ? platform.charAt(0).toUpperCase() + platform.slice(1)
        : "Browser";
  // `navigator.userAgentData` is not in every browser's types yet.
  const brand = (
    navigator as Navigator & {
      userAgentData?: { brands?: { brand: string }[] };
    }
  ).userAgentData?.brands?.find(
    (item) => !/Not.?A.?Brand/i.test(item.brand),
  )?.brand;
  return brand ? `${brand} on ${os}` : os;
}
