"use client";

import { useMemo } from "react";
import { usePathname } from "next/navigation";
import {
  Activity,
  BarChart3,
  BookOpenCheck,
  Building2,
  ChevronDown,
  ClipboardCheck,
  Database,
  History,
  LayoutDashboard,
  Menu,
  Network,
  Settings,
  Users,
} from "lucide-react";
import { NavigationLink } from "@/components/ui/navigation-link";

const ALL_DATA_ROLES = [
  "super_admin",
  "data_admin",
  "admin_opd",
  "reviewer",
  "editor",
  "viewer",
  "auditor",
];
const REVIEW_ROLES = ["super_admin", "data_admin", "admin_opd", "reviewer"];
const GOVERNANCE_ROLES = [
  "super_admin",
  "data_admin",
  "admin_opd",
  "reviewer",
  "editor",
  "auditor",
];
const AUDIT_ROLES = [
  "super_admin",
  "data_admin",
  "admin_opd",
  "reviewer",
  "auditor",
];

const groups = [
  {
    label: "Alur data",
    items: [
      {
        href: "/portal",
        label: "Ringkasan",
        icon: "LayoutDashboard",
        exact: true,
      },
      {
        href: "/portal/dataset",
        label: "Dataset",
        icon: "Database",
        roles: ALL_DATA_ROLES,
      },
      {
        href: "/portal/review",
        label: "Pemeriksaan data",
        icon: "ClipboardCheck",
        roles: REVIEW_ROLES,
      },
      {
        href: "/portal/statistik",
        label: "Indikator statistik",
        icon: "BarChart3",
        roles: ALL_DATA_ROLES,
      },
    ],
  },
  {
    label: "Tata kelola",
    items: [
      {
        href: "/portal/organisasi",
        label: "Organisasi",
        icon: "Building2",
        roles: ALL_DATA_ROLES,
      },
      {
        href: "/portal/pengguna",
        label: "Pengguna & akses",
        icon: "Users",
        roles: ["super_admin", "data_admin", "auditor"],
      },
      {
        href: "/portal/standar",
        label: "Standar & referensi",
        icon: "BookOpenCheck",
        roles: GOVERNANCE_ROLES,
      },
    ],
  },
  {
    label: "Interoperabilitas",
    items: [
      {
        href: "/portal/integrasi",
        label: "Integrasi SDI",
        icon: "Network",
        roles: GOVERNANCE_ROLES,
      },
      {
        href: "/portal/kualitas",
        label: "Kualitas data",
        icon: "Activity",
        roles: GOVERNANCE_ROLES,
      },
    ],
  },
  {
    label: "Pemantauan",
    items: [
      {
        href: "/portal/riwayat",
        label: "Riwayat perubahan",
        icon: "History",
        roles: AUDIT_ROLES,
      },
    ],
  },
  {
    label: "Akun",
    items: [
      { href: "/portal/pengaturan", label: "Pengaturan", icon: "Settings" },
    ],
  },
];

const icons = {
  LayoutDashboard,
  Database,
  ClipboardCheck,
  BarChart3,
  Building2,
  Users,
  BookOpenCheck,
  Network,
  Activity,
  History,
  Settings,
};

function isActive(pathname, item) {
  return item.exact
    ? pathname === item.href
    : pathname === item.href || pathname.startsWith(`${item.href}/`);
}

function NavigationGroups({ groups: visibleGroups, pathname }) {
  return visibleGroups.map((group, groupIndex) => (
    <div key={group.label} className="flex min-w-0 flex-col gap-0.5">
      <p
        className={`mx-2 mb-1 mt-2 border-t border-[#e8eef3] pt-3 text-[10px] font-bold uppercase leading-[1.4] tracking-[0.12em] text-[#748697] ${groupIndex === 0 ? "mt-0 border-0 pt-0" : ""}`}
      >
        {group.label}
      </p>
      {group.items.map((item) => {
        const Icon = icons[item.icon];
        return (
          <NavigationLink
            key={item.href}
            href={item.href}
            active={isActive(pathname, item)}
            variant="portal"
            icon={Icon}
            iconSize={17}
          >
            {item.label}
          </NavigationLink>
        );
      })}
    </div>
  ));
}

function NavigationLoadingState() {
  const groups = [4, 3, 2, 1, 1];
  return (
    <>
      <nav
        aria-label="Navigasi pengelola sedang dimuat"
        aria-hidden="true"
        className="hidden flex-col gap-3 lg:flex"
      >
        {groups.map((itemCount, groupIndex) => (
          <div key={groupIndex} className="flex flex-col gap-1">
            <div
              className={`mx-2 mb-1 mt-2 h-3 w-20 rounded-sm bg-[#edf1f3] ${groupIndex === 0 ? "mt-0" : "border-t border-[#e8eef3] pt-3"}`}
            />
            {Array.from({ length: itemCount }, (_, itemIndex) => (
              <div
                key={itemIndex}
                className="flex min-h-10 items-center gap-2.5 rounded-lg px-3 py-2"
              >
                <span className="size-[17px] shrink-0 rounded bg-[#edf1f3]" />
                <span
                  className={`h-3 rounded-sm bg-[#edf1f3] ${itemIndex % 2 ? "w-24" : "w-32"}`}
                />
              </div>
            ))}
          </div>
        ))}
      </nav>
      <div
        aria-label="Navigasi pengelola sedang dimuat"
        aria-busy="true"
        className="flex h-[54px] items-center gap-2.5 rounded-lg border border-[#e4ebf0] bg-white px-2.5 lg:hidden"
      >
        <span className="size-[34px] shrink-0 rounded-lg bg-[#edf1f3]" />
        <span className="h-3 w-28 rounded-sm bg-[#edf1f3]" />
      </div>
    </>
  );
}

export function PortalNavigation({ roles = [], loading = false }) {
  const pathname = usePathname();
  if (loading) return <NavigationLoadingState />;
  const normalizedRoles = useMemo(() => new Set(roles), [roles]);
  const visibleGroups = useMemo(
    () =>
      groups
        .map((group) => ({
          ...group,
          items: group.items.filter(
            (item) =>
              !item.roles ||
              item.roles.some((role) => normalizedRoles.has(role)),
          ),
        }))
        .filter((group) => group.items.length > 0),
    [normalizedRoles],
  );
  const activeItem = useMemo(
    () =>
      visibleGroups
        .flatMap((group) => group.items)
        .find((item) => isActive(pathname, item)) ||
      visibleGroups[0]?.items[0] ||
      groups[0].items[0],
    [pathname, visibleGroups],
  );

  return (
    <>
      <nav
        aria-label="Navigasi pengelola"
        className="portal-nav-desktop hidden flex-col gap-3 lg:flex"
      >
        <NavigationGroups groups={visibleGroups} pathname={pathname} />
      </nav>

      <details className="portal-mobile-navigation group block overflow-hidden rounded-lg border border-[#e4ebf0] bg-white lg:hidden">
        <summary className="flex min-h-[54px] cursor-pointer list-none items-center gap-2.5 px-2.5 py-2 [&::-webkit-details-marker]:hidden">
          <span className="flex size-[34px] shrink-0 items-center justify-center rounded-lg border border-[#dce8f1] bg-[#f3f7fa] text-[#285d82]">
            <Menu size={17} aria-hidden="true" />
          </span>
          <span className="flex min-w-0 flex-1 flex-col gap-px">
            <span className="text-[10px] font-bold uppercase leading-[1.35] tracking-[0.08em] text-[#718394]">
              Menu pengelola
            </span>
            <strong className="truncate text-[13px] font-semibold text-[#17384f]">
              {activeItem.label}
            </strong>
          </span>
          <ChevronDown
            className="shrink-0 text-[#61788a] transition-transform group-open:rotate-180"
            size={17}
            aria-hidden="true"
          />
        </summary>
        <nav
          aria-label="Navigasi pengelola"
          className="portal-mobile-navigation-panel grid gap-3 border-t border-[#e8eef3] bg-[#fbfcfd] px-2.5 pb-3 pt-1"
        >
          {visibleGroups.map((group) => (
            <section
              key={group.label}
              className="min-w-0"
              aria-label={group.label}
            >
              <h2 className="mb-1.5 mt-2 px-0.5 text-[10px] font-bold uppercase tracking-[0.11em] text-[#738697]">
                {group.label}
              </h2>
              <div className="grid grid-cols-2 gap-1.5 max-[639px]:grid-cols-1">
                {group.items.map((item) => {
                  const Icon = icons[item.icon];
                  return (
                    <NavigationLink
                      key={item.href}
                      href={item.href}
                      active={isActive(pathname, item)}
                      variant="portal"
                      icon={Icon}
                      iconSize={17}
                    >
                      {item.label}
                    </NavigationLink>
                  );
                })}
              </div>
            </section>
          ))}
        </nav>
      </details>
    </>
  );
}
