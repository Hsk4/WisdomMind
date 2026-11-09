"use client";

import { useRef, useState } from "react";
import type { SiteSettingsResponse } from "@lms/shared";
import { ImagePlus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Notice } from "@/components/ui/nila";
import { api, errorMessage } from "@/lib/api-client";
import { useSiteSettings } from "@/lib/site-settings";

/** The API's cap on the data URL, in bytes of string. */
const MAX_FAVICON_BYTES = 150 * 1024;
const FAVICON_SIZE = 64;

/**
 * Resize an image to a 64×64 PNG on a canvas.
 *
 * The API accepts up to 150 KB, but a phone photo is several megabytes and a
 * favicon is drawn at 16–32 px. Doing the resize here means the upload is a
 * few kilobytes and the tab icon is sharp at every size.
 */
async function toFaviconDataUrl(file: File): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const canvas = document.createElement("canvas");
  canvas.width = FAVICON_SIZE;
  canvas.height = FAVICON_SIZE;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("This browser cannot resize images.");
  // Fit inside the square without stretching; transparent padding is fine.
  const scale = Math.min(
    FAVICON_SIZE / bitmap.width,
    FAVICON_SIZE / bitmap.height,
  );
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);
  context.drawImage(
    bitmap,
    Math.round((FAVICON_SIZE - width) / 2),
    Math.round((FAVICON_SIZE - height) / 2),
    width,
    height,
  );
  bitmap.close();
  return canvas.toDataURL("image/png");
}

/**
 * The School card: name, tagline, contact details and favicon.
 *
 * Super admin only — the API refuses the write for anyone else, and the page
 * does not render the card for them either. Saving applies the response to
 * `SiteSettingsProvider` immediately, so the sidebar and the tab title change
 * without a reload.
 */
export function SchoolSettingsForm() {
  const { settings, apply } = useSiteSettings();
  const [values, setValues] = useState({
    schoolName: settings.schoolName,
    tagline: settings.tagline ?? "",
    supportEmail: settings.supportEmail ?? "",
    phone: settings.phone ?? "",
    address: settings.address ?? "",
  });
  const [favicon, setFavicon] = useState<string | null>(settings.favicon);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const set = (key: keyof typeof values) => (value: string) => {
    setValues((current) => ({ ...current, [key]: value }));
    setSaved(false);
  };

  const onFile = async (file: File | undefined) => {
    if (!file) return;
    setError(null);
    try {
      const dataUrl = await toFaviconDataUrl(file);
      if (dataUrl.length > MAX_FAVICON_BYTES) {
        setError(
          "That image is too large even after resizing. Try a simpler one.",
        );
        return;
      }
      setFavicon(dataUrl);
      setSaved(false);
    } catch (caught) {
      setError(errorMessage(caught, "Could not read that image."));
    }
  };

  const save = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setPending(true);
    setError(null);
    setSaved(false);
    try {
      const next = await api.patch<SiteSettingsResponse>(
        "/admin/site-settings",
        {
          schoolName: values.schoolName.trim(),
          tagline: values.tagline.trim() || null,
          supportEmail: values.supportEmail.trim() || null,
          phone: values.phone.trim() || null,
          address: values.address.trim() || null,
          favicon,
        },
      );
      apply(next);
      setSaved(true);
    } catch (caught) {
      setError(errorMessage(caught, "Could not save the settings."));
    } finally {
      setPending(false);
    }
  };

  return (
    <form className="mt-4 space-y-4" onSubmit={save}>
      <div>
        <label className="label" htmlFor="school-name">
          School name
        </label>
        <Input
          id="school-name"
          value={values.schoolName}
          onChange={(event) => set("schoolName")(event.target.value)}
          maxLength={80}
          required
        />
        <p className="mt-1 text-xs text-muted-foreground">
          Shown on the sign-in page, the sidebar and the browser tab.
        </p>
      </div>

      <div>
        <label className="label" htmlFor="school-tagline">
          Tagline
        </label>
        <Input
          id="school-tagline"
          value={values.tagline}
          onChange={(event) => set("tagline")(event.target.value)}
          maxLength={160}
          placeholder="One school. Everyone in the loop."
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="school-email">
            Support email
          </label>
          <Input
            id="school-email"
            type="email"
            value={values.supportEmail}
            onChange={(event) => set("supportEmail")(event.target.value)}
            placeholder="office@school.edu"
          />
        </div>
        <div>
          <label className="label" htmlFor="school-phone">
            Phone
          </label>
          <Input
            id="school-phone"
            value={values.phone}
            onChange={(event) => set("phone")(event.target.value)}
            maxLength={32}
            placeholder="+92 300 0000000"
          />
        </div>
      </div>

      <div>
        <label className="label" htmlFor="school-address">
          Address
        </label>
        <textarea
          id="school-address"
          className="textarea"
          value={values.address}
          onChange={(event) => set("address")(event.target.value)}
          maxLength={300}
          rows={2}
        />
      </div>

      <div>
        <span className="label">Favicon</span>
        <div className="flex flex-wrap items-center gap-3">
          <span className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-lg border border-border bg-secondary">
            {favicon ? (
              // A data URL, not a remote image: `next/image` cannot optimise it.
              // eslint-disable-next-line @next/next/no-img-element
              <img src={favicon} alt="Current favicon" className="h-8 w-8" />
            ) : (
              <ImagePlus className="h-5 w-5 text-muted-foreground" />
            )}
          </span>
          <input
            ref={fileRef}
            type="file"
            accept="image/png,image/jpeg,image/webp,image/x-icon,image/vnd.microsoft.icon"
            className="hidden"
            onChange={(event) => void onFile(event.target.files?.[0])}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => fileRef.current?.click()}
          >
            Choose image
          </Button>
          {favicon ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                setFavicon(null);
                setSaved(false);
              }}
            >
              <Trash2 />
              Remove
            </Button>
          ) : null}
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          Resized to 64×64 PNG here, so any image works. PNG, JPG, WebP or ICO.
        </p>
      </div>

      {error ? <Notice tone="error">{error}</Notice> : null}

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? "Saving..." : "Save school settings"}
        </Button>
        {saved ? (
          <span className="text-sm font-medium text-status-green">Saved</span>
        ) : null}
      </div>
    </form>
  );
}
