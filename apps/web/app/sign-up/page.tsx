"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { SignUp, type SignUpRole } from "@/lib/auth";

/**
 * Local-only sign-up page for the production demo.
 *
 * `?role=teacher` opens the teacher wording. Both doors used to land here
 * indistinguishable, so a teacher reached an application form with no sign
 * they had chosen teaching at all.
 */
function Body() {
  const params = useSearchParams();
  const role: SignUpRole =
    params.get("role") === "teacher" ? "teacher" : "student";

  return (
    /*
     * `main`, like every other page: a screen reader lands on a landmark, and
     * a skip link has something to skip to. It was the only page without one.
     */
    <main className="flex min-h-screen items-center justify-center bg-surface px-4">
      <SignUp signInUrl="/sign-in" fallbackRedirectUrl="/" role={role} />
    </main>
  );
}

export default function SignUpPage() {
  // `useSearchParams` needs a Suspense boundary in the static (mobile) export.
  return (
    <Suspense fallback={null}>
      <Body />
    </Suspense>
  );
}
