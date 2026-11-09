"use client";

import { PageHeader, Card } from "@/components/ui/nila";
import { ThemePicker } from "@/components/shell/theme-picker";
import { useAuth } from "@/lib/auth-context";
import { SchoolSettingsForm } from "./school-settings-form";

/**
 * Console settings.
 *
 * Appearance is per browser and available to every admin. The School card is
 * the super admin's: the name, contact details and favicon every parent sees.
 * The API refuses that write for an ordinary admin, so hiding the card is
 * presentation, not the gate.
 */
export default function AdminSettingsPage() {
  const { user } = useAuth();
  const isSuperAdmin = user?.role === "super_admin";

  return (
    <>
      <PageHeader
        title="Settings"
        description={
          isSuperAdmin
            ? "The school's identity, and console preferences for this browser."
            : "Console preferences for this browser."
        }
      />

      <div className="grid max-w-3xl gap-6">
        {isSuperAdmin ? (
          <Card className="p-5 sm:p-6">
            <h2 className="text-base font-semibold tracking-tight text-foreground">
              School
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              The name and details shown to students, parents and teachers.
            </p>
            <SchoolSettingsForm />
          </Card>
        ) : null}

        <Card className="p-5 sm:p-6">
          <h2 className="text-base font-semibold tracking-tight text-foreground">
            Appearance
          </h2>
          <p className="mt-1 mb-4 text-sm text-muted-foreground">
            Light and dark use the same tokens, so every panel switches
            together.
          </p>
          <ThemePicker />
        </Card>

        <Card className="p-5 sm:p-6">
          <h2 className="text-base font-semibold tracking-tight text-foreground">
            Session
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Sign out from the account menu in the header. Role and status
            changes are made by an admin on the Users page.
          </p>
        </Card>
      </div>
    </>
  );
}
