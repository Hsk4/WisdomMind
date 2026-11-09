"use client";

import * as React from "react";
import { Menu, MoreHorizontal } from "lucide-react";

import {
  SidebarNav,
  type SidebarNavProps,
} from "@/components/shell/sidebar-nav";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

/**
 * Hamburger + slide-over sidebar, used by the panels with grouped nav.
 *
 * `trigger="more"` draws the "More" tab of the phone tab bar instead of a
 * hamburger: the tab bar has five slots and the fifth opens this sheet, so
 * every destination is still one tap away without a second navigation row.
 */
export function MobileNavSheet({
  trigger = "menu",
  ...props
}: Omit<SidebarNavProps, "onNavigate"> & { trigger?: "menu" | "more" }) {
  const [open, setOpen] = React.useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        {trigger === "more" ? (
          <button
            type="button"
            className="fastly-tab"
            aria-label="More sections"
          >
            <MoreHorizontal size={19} strokeWidth={1.7} aria-hidden="true" />
            <span>More</span>
          </button>
        ) : (
          <Button
            variant="ghost"
            size="icon"
            className="h-11 w-11 border-[1.5px] border-on-navy-line text-white hover:bg-white/10 hover:text-white lg:hidden"
            aria-label="Open navigation menu"
          >
            <Menu className="h-5 w-5" />
          </Button>
        )}
      </SheetTrigger>
      <SheetContent side="left" className="w-[280px] p-0 sm:max-w-[300px]">
        <SheetHeader className="sr-only">
          <SheetTitle>Navigation</SheetTitle>
          <SheetDescription>Panel navigation</SheetDescription>
        </SheetHeader>
        <SidebarNav
          {...props}
          onNavigate={() => setOpen(false)}
          className="border-r-0"
        />
      </SheetContent>
    </Sheet>
  );
}
