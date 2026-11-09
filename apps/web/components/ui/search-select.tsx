"use client";

import * as React from "react";
import { Check, ChevronDown, Search, X } from "lucide-react";

import { cn } from "@/lib/utils";

export type SearchSelectOption = { value: string; label: string };

interface SearchSelectProps {
  /** Form field name. A hidden input carries the value, so `FormData` works. */
  name: string;
  options: SearchSelectOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  /** Shown as the first, empty option (e.g. "Choose a course"). */
  emptyLabel?: string;
  /** Allow clearing back to the empty value. */
  clearable?: boolean;
  disabled?: boolean;
  required?: boolean;
  id?: string;
  className?: string;
  /** How many matches to show at once. */
  maxResults?: number;
}

/**
 * A select with a search box, for lists too long to scan.
 *
 * A native `<select>` with 300 courses is unusable on a phone, and a plain
 * text input cannot carry an id. This keeps the form contract — a hidden
 * `<input name>` holds the chosen value, so it works inside `ActionForm` and
 * any `new FormData(form)` — while the visible control is a button that opens
 * a filterable list.
 */
export function SearchSelect({
  name,
  options,
  value,
  onChange,
  placeholder = "Search...",
  emptyLabel,
  clearable = false,
  disabled = false,
  required = false,
  id,
  className,
  maxResults = 50,
}: SearchSelectProps) {
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const [active, setActive] = React.useState(0);
  const rootRef = React.useRef<HTMLDivElement>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);

  const selected = options.find((option) => option.value === value) ?? null;

  const matches = React.useMemo(() => {
    const needle = query.trim().toLowerCase();
    const found = needle
      ? options.filter((option) => option.label.toLowerCase().includes(needle))
      : options;
    return found.slice(0, maxResults);
  }, [options, query, maxResults]);

  // Close on an outside click, like a native select.
  React.useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [open]);

  /*
   * Opening resets the query and the highlight in the same event that opens
   * the list, so the first render of the popover is already clean — no effect
   * that sets state, and no flash of the previous search.
   */
  const toggle = () => {
    if (open) {
      setOpen(false);
      return;
    }
    setQuery("");
    setActive(0);
    setOpen(true);
    // Focus after the list has rendered.
    window.setTimeout(() => inputRef.current?.focus(), 0);
  };

  const choose = (next: string) => {
    onChange(next);
    setOpen(false);
  };

  const onKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActive((current) => Math.min(current + 1, matches.length - 1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActive((current) => Math.max(current - 1, 0));
    } else if (event.key === "Enter") {
      event.preventDefault();
      const option = matches[active];
      if (option) choose(option.value);
    } else if (event.key === "Escape") {
      event.preventDefault();
      setOpen(false);
    }
  };

  return (
    <div ref={rootRef} className={cn("relative", className)}>
      <input type="hidden" name={name} value={value} />
      {/* A hidden input is not validated by the browser; this one is. */}
      {required ? (
        <input
          tabIndex={-1}
          aria-hidden="true"
          required
          value={value}
          onChange={() => {}}
          className="pointer-events-none absolute h-0 w-0 opacity-0"
        />
      ) : null}

      <button
        type="button"
        id={id}
        disabled={disabled}
        onClick={toggle}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="input flex w-full items-center justify-between gap-2 text-left disabled:cursor-not-allowed disabled:opacity-50"
      >
        <span className={cn("truncate", !selected && "text-muted-foreground")}>
          {selected ? selected.label : (emptyLabel ?? placeholder)}
        </span>
        <span className="flex shrink-0 items-center gap-1">
          {clearable && selected ? (
            <span
              role="button"
              tabIndex={-1}
              aria-label="Clear"
              className="rounded p-0.5 text-muted-foreground hover:text-foreground"
              onClick={(event) => {
                event.stopPropagation();
                choose("");
              }}
            >
              <X className="h-3.5 w-3.5" />
            </span>
          ) : null}
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        </span>
      </button>

      {open ? (
        /*
         * `max-w-[calc(100vw-2rem)]` keeps the list inside a phone screen when
         * the control sits near the right edge of a narrow form.
         */
        <div className="absolute z-40 mt-1 w-full min-w-[220px] max-w-[calc(100vw-2rem)] overflow-hidden rounded-lg border border-border bg-card shadow-lg">
          <div className="relative border-b border-border p-2">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <input
              ref={inputRef}
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setActive(0);
              }}
              onKeyDown={onKeyDown}
              placeholder={placeholder}
              aria-label={placeholder}
              className="h-10 w-full rounded-md border border-border bg-background pl-7 pr-2 text-base outline-none focus:border-primary sm:h-8 sm:text-sm"
            />
          </div>
          <ul role="listbox" className="max-h-60 overflow-y-auto p-1">
            {clearable ? (
              <li>
                <button
                  type="button"
                  role="option"
                  aria-selected={!value}
                  onClick={() => choose("")}
                  className="flex min-h-11 w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm text-muted-foreground hover:bg-secondary sm:min-h-0"
                >
                  {emptyLabel ?? "None"}
                </button>
              </li>
            ) : null}
            {matches.length === 0 ? (
              <li className="px-2 py-3 text-center text-sm text-muted-foreground">
                No match
              </li>
            ) : (
              matches.map((option, index) => (
                <li key={option.value}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={option.value === value}
                    onMouseEnter={() => setActive(index)}
                    onClick={() => choose(option.value)}
                    className={cn(
                      "flex min-h-11 w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm sm:min-h-0",
                      index === active ? "bg-secondary" : "",
                      option.value === value ? "font-medium text-primary" : "",
                    )}
                  >
                    <Check
                      className={cn(
                        "h-3.5 w-3.5 shrink-0",
                        option.value === value ? "opacity-100" : "opacity-0",
                      )}
                    />
                    <span className="min-w-0 truncate">{option.label}</span>
                  </button>
                </li>
              ))
            )}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
