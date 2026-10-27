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
    <div key={group.label} className="portal-nav-group">
      <p
        className={`portal-nav-group-title ${groupIndex === 0 ? "is-first" : ""}`}
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

export function PortalNavigation({ roles = [] }) {
  const pathname = usePathname();
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
        className="portal-nav portal-nav-desktop hidden lg:flex"
      >
        <NavigationGroups groups={visibleGroups} pathname={pathname} />
      </nav>

      <details className="portal-mobile-navigation lg:hidden">
        <summary className="portal-mobile-navigation-trigger">
          <span className="portal-mobile-navigation-icon">
            <Menu size={17} aria-hidden="true" />
          </span>
          <span className="portal-mobile-navigation-label">
            <span>Menu pengelola</span>
            <strong>{activeItem.label}</strong>
          </span>
          <ChevronDown
            className="portal-mobile-navigation-chevron"
            size={17}
            aria-hidden="true"
          />
        </summary>
        <nav
          aria-label="Navigasi pengelola"
          className="portal-mobile-navigation-panel"
        >
          {visibleGroups.map((group) => (
            <section
              key={group.label}
              className="portal-mobile-navigation-group"
              aria-label={group.label}
            >
              <h2>{group.label}</h2>
              <div className="portal-mobile-navigation-items">
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
