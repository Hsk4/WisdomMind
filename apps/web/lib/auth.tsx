"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { PasswordInput } from "@/components/ui/password-input";
import { errorMessage } from "./api-client";
import { useAuth } from "./auth-context";
import { deviceLabel, getDeviceId, isNativeApp } from "./device";
import { webHomeFor } from "./role-home";
import { readStoredUser, type StoredUser } from "./session";

/**
 * Local authentication: a bearer JWT in `localStorage`, the API as the only
 * authority on role and status, and the account's `home` deciding where it
 * lands. Nothing here trusts a stored role — the profile is always re-read
 * from `/me` after sign-in and on every panel load.
 */

export type { StoredUser } from "./session";

export const DEV_API_URL = "http://localhost:4000/api/v1";

export function apiBaseUrl() {
  return process.env.NEXT_PUBLIC_API_URL || DEV_API_URL;
}

/** @deprecated Import from `@/lib/auth-context`. */
export { AuthProvider, useAuth } from "./auth-context";

export function UserButton() {
  const { signOut } = useAuth();
  const user = readStoredUser();
  const initials =
    (user?.name ?? "User")
      .split(" ")
      .map((part: string) => part[0])
      .filter(Boolean)
      .slice(0, 2)
      .join("")
      .toUpperCase() || "A";

  return (
    <button
      type="button"
      onClick={() => {
        // The provider clears the session and navigates. Pages reload their own
        // data on mount, so nothing from this account can leak to the next.
        signOut();
      }}
      className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground"
      aria-label="Sign out"
      title={
        user?.email ? `${user.name ?? "User"} • ${user.email}` : "Sign out"
      }
    >
      {initials}
    </button>
  );
}

type AuthPayload = {
  ok?: boolean;
  error?: string;
  /** `DEVICE_LOCKED` when a parent signs in on a second phone. */
  code?: string;
  data?: { token?: string; user?: StoredUser; home?: string };
};

/** The shortest reason the API accepts for moving a parent to a new phone. */
const MIN_DEVICE_REASON = 10;



function AuthForm({
  title,
  subtitle,
  submitLabel,
  busyLabel,
  fields,
  endpoint,
  nextStepHref,
  footer,
  framed = false,
}: {
  title: string;
  subtitle: string;
  submitLabel: string;
  busyLabel: string;
  /** Draw the card frame. Off when the page already supplies a sheet. */
  framed?: boolean;
  fields: {
    name: string;
    label: string;
    type: string;
    autoComplete: string;
    placeholder: string;
    extra?: Record<string, unknown>;
  }[];
  endpoint: "sign-in" | "sign-up";
  /** Sign-up only: forward the chosen role to `/pending`. */
  nextStepHref?: string;
  footer: ReactNode;
}) {
  const router = useRouter();
  const { completeSignIn } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  /*
   * A parent account is bound to one phone. When the API refuses a second
   * phone it answers `DEVICE_LOCKED`; the form then asks why, and resubmits
   * with the reason. The other phone is signed out by that switch.
   */
  const [deviceLocked, setDeviceLocked] = useState(false);
  const [deviceReason, setDeviceReason] = useState("");
  // Controlled fields: a failed submission must not wipe what was typed.
  const [values, setValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(fields.map((field) => [field.name, ""])),
  );

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (pending) return;
    setError(null);

    const body: Record<string, unknown> = Object.fromEntries(
      Object.entries(values).map(([key, value]) => [
        key,
        key === "email" ? value.trim().toLowerCase() : value,
      ]),
    );

    /*
     * Only the native app has a stable device. A browser sign-in neither binds
     * nor is refused, so the web is never locked out by this rule.
     */
    if (endpoint === "sign-in" && isNativeApp()) {
      body.deviceId = getDeviceId();
      body.deviceLabel = deviceLabel();
      if (deviceLocked && deviceReason.trim()) {
        body.deviceChangeReason = deviceReason.trim();
      }
    }

    setPending(true);
    try {
      /*
       * Raw `fetch`, not `apiFetch`: a failed sign-in is not an expired
       * session, and `apiFetch` would clear the session and redirect on a 401.
       */
      const response = await fetch(`${apiBaseUrl()}/auth/${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      let payload: AuthPayload | null = null;
      try {
        payload = (await response.json()) as AuthPayload;
      } catch {
        payload = null;
      }

      if (payload?.code === "DEVICE_LOCKED") {
        setDeviceLocked(true);
        setError(null);
        setPending(false);
        return;
      }

      if (!response.ok || !payload?.ok || !payload.data?.token) {
        throw new Error(
          payload?.error ?? `Unable to ${submitLabel.toLowerCase()}`,
        );
      }

      // Stores the token, then loads `/me` (which decides the destination).
      const me = await completeSignIn(
        payload.data.token,
        payload.data.user ?? null,
      );
      // `webHomeFor` sends a parent to the link page instead of the empty
      // children dashboard; every other role keeps the API's `home`.
      const home = webHomeFor(me.home);
      router.replace(
        nextStepHref && home.startsWith("/pending")
          ? `${home}?next=${encodeURIComponent(nextStepHref)}`
          : home,
      );
    } catch (caught) {
      setError(errorMessage(caught, `Unable to ${submitLabel.toLowerCase()}`));
    } finally {
      setPending(false);
    }
  };

  return (
    /*
     * The form never draws its own card. `/sign-up` (centred on grey) is the one
     * place that needs a frame, because it has no page sheet around it; the
     * sign-in page already puts this form inside `fastly-sheet`, and a bordered
     * card inside a bordered sheet read as a box drawn in a box. `framed`
     * lets that one caller ask for the frame without the other getting it.
     */
    <div
      className={`w-full max-w-md ${framed ? "rounded-2xl border border-border bg-card p-6 shadow-sm" : ""}`}
    >
      <h1 className="text-2xl font-semibold tracking-tight text-foreground">
        {title}
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">{subtitle}</p>

      <form className="mt-6 space-y-4" onSubmit={onSubmit} noValidate>
        {fields.map((field) => {
          /*
           * Every role signs in and signs up through this one form, so a
           * password field gets the show/hide toggle once, here.
           */
          const shared = {
            name: field.name,
            autoComplete: field.autoComplete,
            placeholder: field.placeholder,
            required: true,
            value: values[field.name] ?? "",
            onChange: (event: React.ChangeEvent<HTMLInputElement>) =>
              setValues((current) => ({
                ...current,
                [field.name]: event.target.value,
              })),
            "aria-invalid": error ? true : undefined,
            /* 16px on mobile: iOS zooms the page on a smaller focused field. */
            className:
              "w-full rounded-lg border border-border bg-background px-3 py-3 text-base outline-none ring-0 placeholder:text-muted-foreground sm:py-2.5 sm:text-sm",
            ...field.extra,
          } as const;

          return (
            <label key={field.name} className="block text-sm text-foreground">
              <span className="mb-1.5 block">{field.label}</span>
              {field.type === "password" ? (
                <PasswordInput {...shared} />
              ) : (
                <input {...shared} type={field.type} />
              )}
            </label>
          );
        })}

        {deviceLocked ? (
          <div className="space-y-2 rounded-lg border border-status-amber bg-status-amber-soft px-3 py-3 text-sm text-status-amber">
            <p className="font-medium">
              This account is already on another phone.
            </p>
            <p>
              Why are you switching? The other phone will be signed out when
              you continue.
            </p>
            <textarea
              value={deviceReason}
              onChange={(event) => setDeviceReason(event.target.value)}
              rows={3}
              maxLength={300}
              placeholder="For example: I lost my old phone"
              aria-label="Why are you switching phones?"
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none"
            />
            <p className="text-xs">
              {deviceReason.trim().length < MIN_DEVICE_REASON
                ? `At least ${MIN_DEVICE_REASON} characters.`
                : "Ready."}
            </p>
          </div>
        ) : null}

        {error ? (
          <p
            role="alert"
            className="rounded-lg border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm text-destructive"
          >
            {error}
          </p>
        ) : null}

        <Button
          type="submit"
          size="xl"
          disabled={
            pending ||
            (deviceLocked && deviceReason.trim().length < MIN_DEVICE_REASON)
          }
          className="w-full"
        >
          {pending
            ? busyLabel
            : deviceLocked
              ? "Use this phone"
              : submitLabel}
        </Button>
      </form>

      {footer}
    </div>
  );
}

export function SignIn({
  signUpUrl = "/sign-up",
  notice,
}: {
  signUpUrl?: string;
  /** A server-side message already known on load, e.g. an expired session. */
  notice?: string | null;
  /** Kept for call-site compatibility; the API's `home` always wins. */
  fallbackRedirectUrl?: string;
}) {
  return (
    <>
      {notice ? (
        <p
          role="status"
          className="mb-3 rounded-lg border border-border bg-muted px-3 py-2 text-sm text-muted-foreground"
        >
          {notice}
        </p>
      ) : null}
      <AuthForm
        title="Sign in to your workspace"
        subtitle="Use your school account to continue."
        submitLabel="Continue"
        busyLabel="Signing in..."
        endpoint="sign-in"
        fields={[
          {
            name: "email",
            label: "Email",
            type: "email",
            autoComplete: "username",
            placeholder: "you@school.edu",
          },
          {
            name: "password",
            label: "Password",
            type: "password",
            autoComplete: "current-password",
            placeholder: "Enter your password",
          },
        ]}
        footer={
          <div className="mt-4 space-y-2 text-center text-sm">
            <Link
              href="/forgot-password/"
              className="font-medium text-primary hover:underline"
            >
              Forgot password?
            </Link>
            {signUpUrl ? (
              <p className="text-muted-foreground">
                Need a new account?{" "}
                <Link href={signUpUrl} className="font-medium text-primary">
                  Create one
                </Link>
              </p>
            ) : null}
          </div>
        }
      />
    </>
  );
}

/** The roles an account can ask for at sign-up. Students use the plain form. */
export type SignUpRole = "student" | "teacher" | "parent";

export function SignUp({
  signInUrl = "/sign-in",
  role = "student",
}: {
  signInUrl?: string;
  fallbackRedirectUrl?: string;
  /**
   * Which application the new account is for. It only chooses the wording and
   * where the account lands next (the `/request` form); the API still decides
   * what the account may do, and an admin still approves the role.
   */
  role?: SignUpRole;
}) {
  const wording =
    role === "teacher"
      ? {
          title: "Create your teacher account",
          subtitle:
            "Next you will fill in a short teaching application. An admin reviews it before your classes open.",
        }
      : role === "parent"
        ? {
            title: "Create your parent account",
            subtitle:
              "Next you will tell us who your child is. An admin reviews it before your dashboard opens.",
          }
        : {
            title: "Create your school account",
            subtitle:
              "Your role is confirmed by the school office after you request access.",
          };

  return (
    <AuthForm
      title={wording.title}
      subtitle={wording.subtitle}
      submitLabel="Create account"
      busyLabel="Creating account..."
      endpoint="sign-up"
      /* `/sign-up` centres this on a bare grey page, so it needs the frame. */
      framed
      /*
       * A brand-new role-less account lands on `/pending` (the API's `home`).
       * Carrying the chosen door through tells that page which application the
       * person meant to fill in, instead of making them pick again.
       */
      nextStepHref={
        role === "teacher"
          ? "/request?role=teacher"
          : role === "parent"
            ? "/request?role=parent"
            : undefined
      }
      fields={[
        {
          name: "name",
          label: "Full name",
          type: "text",
          autoComplete: "name",
          placeholder: "Your name",
        },
        {
          name: "email",
          label: "Email",
          type: "email",
          autoComplete: "email",
          placeholder: "you@school.edu",
        },
        {
          name: "password",
          label: "Password",
          type: "password",
          autoComplete: "new-password",
          placeholder: "At least 12 characters",
          extra: { minLength: 12, maxLength: 128 },
        },
      ]}
      footer={
        <p className="mt-4 text-center text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link href={signInUrl} className="font-medium text-primary">
            Sign in
          </Link>
        </p>
      }
    />
  );
}
