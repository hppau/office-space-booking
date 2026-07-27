"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useMemo } from "react";
import LocationManagementPage from "@/views/location-management/LocationManagementPage";
import SpaceManagementPage from "@/views/space-management/SpaceManagementPage";
import FloorMapManagementPage from "@/views/floor-map-management/FloorMapManagementPage";

type DesignerTab = "rooms" | "spaces" | "layout";

const tabs: Array<{
  id: DesignerTab;
  label: string;
  description: string;
  iconClassName: string;
}> = [
  {
    id: "rooms",
    label: "Rooms",
    description: "Create rooms and upload room images.",
    iconClassName: "fa-solid fa-door-open",
  },
  {
    id: "spaces",
    label: "Spaces",
    description: "Create and manage bookable spaces.",
    iconClassName: "fa-solid fa-layer-group",
  },
  {
    id: "layout",
    label: "Layout Designer",
    description: "Place spaces on each room image.",
    iconClassName: "fa-solid fa-map-location-dot",
  },
];

function isDesignerTab(value: string | null): value is DesignerTab {
  return value === "rooms" || value === "spaces" || value === "layout";
}

export default function RoomDesignerPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const selectedTab = useMemo<DesignerTab>(() => {
    const value = searchParams.get("tab");
    return isDesignerTab(value) ? value : "rooms";
  }, [searchParams]);

  const changeTab = useCallback(
    (tab: DesignerTab) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set("tab", tab);

      router.replace(`/room-designer?${params.toString()}`);
    },
    [router, searchParams]
  );

  return (
    <div className="mx-auto max-w-[1536px]">
      <section className="mb-6 overflow-hidden border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        <div className="bg-gradient-to-br from-[#c9d2bd] via-[#e8e3d3] to-[#f6efe2] px-6 py-7 dark:from-slate-950 dark:via-slate-900 dark:to-[#06070b] sm:px-8">
          <p className="text-xs font-bold uppercase tracking-[0.35em] text-[#6d7a64] dark:text-slate-400">
            HR Management
          </p>

          <h1 className="mt-3 text-4xl font-black tracking-tight text-white sm:text-5xl">
            Room Designer
          </h1>

          <p className="mt-3 max-w-3xl text-sm leading-6 text-[#5e6558] dark:text-slate-300 sm:text-base">
            Manage rooms, bookable spaces, and room layouts from one page.
          </p>
        </div>

        <div className="grid gap-2 border-t border-slate-200 p-3 dark:border-slate-800 sm:grid-cols-3">
          {tabs.map((tab) => {
            const isActive = selectedTab === tab.id;

            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => changeTab(tab.id)}
                className={`rounded-md border px-4 py-3 text-left transition ${
                  isActive
                    ? "border-[#c65f2e] bg-orange-50 text-[#a94f26] dark:border-orange-400 dark:bg-orange-500/10 dark:text-orange-200"
                    : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300 dark:hover:bg-slate-800"
                }`}
              >
                <div className="flex items-center gap-2 font-black">
                  <i className={tab.iconClassName} />
                  {tab.label}
                </div>

                <p className="mt-1 text-xs font-medium opacity-75">
                  {tab.description}
                </p>
              </button>
            );
          })}
        </div>
      </section>

      {selectedTab === "rooms" && <LocationManagementPage />}

      {selectedTab === "spaces" && <SpaceManagementPage />}

      {selectedTab === "layout" && <FloorMapManagementPage />}
    </div>
  );
}