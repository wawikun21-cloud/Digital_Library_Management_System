import { useState } from "react";
import { Settings } from "lucide-react";
import { HeroSlidesManager } from "../../portal";

function StudentPortalTab() {
  return (
    <div className="flex flex-col gap-6">
      <HeroSlidesManager />
      <p className="rounded-xl border px-4 py-3 text-[12.5px]"
        style={{ background: "var(--bg-surface)", borderColor: "var(--border)", color: "var(--text-secondary)" }}>
        The E-Books and Courses sections of the portal always show the 6 most recently published items.
        Publish or unpublish them from Manage Lexora Books and Courses.
      </p>
    </div>
  );
}

const TABS = [{ id: "student-portal", label: "Student Portal", Component: StudentPortalTab }];

export default function SettingsPage({ defaultTab = "student-portal" }) {
  const [active, setActive] = useState(defaultTab);
  const ActiveTab = TABS.find((tab) => tab.id === active)?.Component ?? StudentPortalTab;

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-5">
      <div>
        <h1 className="flex items-center gap-2.5 text-[22px] font-bold" style={{ color: "var(--text-primary)" }}>
          <Settings size={22} style={{ color: "var(--accent-amber)" }} />
          Settings
        </h1>
        <p className="mt-0.5 text-[13px]" style={{ color: "var(--text-secondary)" }}>
          Manage what students see in the portal.
        </p>
      </div>

      <div role="tablist" aria-label="Settings sections" className="flex gap-1 border-b" style={{ borderColor: "var(--border)" }}>
        {TABS.map((tab) => (
          <button
            key={tab.id}
            role="tab"
            type="button"
            aria-selected={tab.id === active}
            onClick={() => setActive(tab.id)}
            className="-mb-px border-b-2 px-4 py-2 text-[13px] font-semibold"
            style={{
              borderColor: tab.id === active ? "var(--accent-amber)" : "transparent",
              color: tab.id === active ? "var(--text-primary)" : "var(--text-muted)",
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div role="tabpanel"><ActiveTab /></div>
    </div>
  );
}
