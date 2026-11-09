"use client";

import * as React from "react";
import { Eye, EyeOff } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * A password field with a show/hide toggle.
 *
 * The input keeps its own `type="password"` default, so a caller passes
 * `type="password"` and everything else (`name`, `value`, `onChange`,
 * `autoComplete`, …) reaches the real `<input>` unchanged. Toggling only swaps
 * the rendered type — the text stays in the field and the caret is restored, so
 * a person can check what they typed without retyping it.
 *
 * The button is `type="button"`: inside a form it must never submit. It is
 * labelled for screen readers and ignores the mouse (`tabIndex={-1}` is
 * deliberately NOT set — the toggle is reachable by keyboard).
 */
const PasswordInput = React.forwardRef<
  HTMLInputElement,
  Omit<React.InputHTMLAttributes<HTMLInputElement>, "type">
>(({ className, disabled, ...props }, ref) => {
  const [visible, setVisible] = React.useState(false);

  return (
    <div className="relative">
      <input
        {...props}
        ref={ref}
        type={visible ? "text" : "password"}
        disabled={disabled}
        // Keep the text clear of the 36px button pinned inside the field.
        className={cn("pr-11", className)}
      />
      <button
        type="button"
        onClick={() => setVisible((current) => !current)}
        disabled={disabled}
        aria-label={visible ? "Hide password" : "Show password"}
        aria-pressed={visible}
        title={visible ? "Hide password" : "Show password"}
        className="absolute inset-y-0 right-0 flex w-11 items-center justify-center rounded-r-lg text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30 disabled:opacity-50"
      >
        {visible ? (
          <EyeOff className="h-4 w-4" aria-hidden="true" />
        ) : (
          <Eye className="h-4 w-4" aria-hidden="true" />
        )}
      </button>
    </div>
  );
});
PasswordInput.displayName = "PasswordInput";

export { PasswordInput };
