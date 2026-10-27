"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight, Home } from "lucide-react";

const labels = {
  dataset: "Dataset",
  statistik: "Indikator statistik",
  organisasi: "Organisasi",
  pengguna: "Pengguna & akses",
  review: "Pemeriksaan data",
  standar: "Standar & referensi",
  integrasi: "Integrasi SDI",
  kualitas: "Kualitas data",
  riwayat: "Riwayat perubahan",
  pengaturan: "Pengaturan",
  publikasi: "Publikasi",
  edit: "Ubah",
  observasi: "Observasi",
};

function segmentLabel(segment, index, segments) {
  if (segment === "new") return "Buat dataset";
  if (segment === "baru") {
    if (segments[index - 1] === "statistik") return "Indikator baru";
    if (segments[index - 1] === "organisasi") return "Tambah organisasi";
    return "Buat baru";
  }
  if (segment === "edit") {
    if (segments[index - 2] === "dataset") return "Ubah dataset";
    if (segments[index - 2] === "organisasi") return "Ubah organisasi";
    if (segments[index - 2] === "statistik") return "Ubah indikator";
    return "Ubah data";
  }
  if (segment === "observasi") return "Observasi indikator";
  if (labels[segment]) return labels[segment];
  const parent = segments[index - 1];
  const parentLabel = labels[parent] || "data";
  if (parent === "dataset") return "Detail dataset";
  if (parent === "organisasi") return "Detail organisasi";
  if (parent === "statistik") return "Detail indikator";
  if (parent === "integrasi") return "Detail integrasi";
  return `Detail ${parentLabel.toLocaleLowerCase("id-ID")}`;
}

export function PortalBreadcrumbs() {
  const pathname = usePathname() || "/portal";
  const segments = pathname.split("/").filter(Boolean);
  if (segments.length <= 1 || segments[0] !== "portal") return null;

  const items = [];
  let href = "/portal";
  for (let index = 1; index < segments.length; index += 1) {
    const segment = segments[index];
    href += `/${segment}`;
    items.push({ label: segmentLabel(segment, index, segments), href });
  }

  return (
    <nav aria-label="Jejak navigasi" className="portal-breadcrumbs">
      <Link
        href="/portal"
        className="portal-breadcrumb-home"
        aria-label="Beranda pengelola"
      >
        <Home size={13} aria-hidden="true" />
        <span>Portal</span>
      </Link>
      {items.map((item, index) => {
        const current = index === items.length - 1;
        return (
          <span className="portal-breadcrumb-item" key={item.href}>
            <ChevronRight size={13} aria-hidden="true" />
            {current ? (
              <span aria-current="page">{item.label}</span>
            ) : (
              <Link href={item.href}>{item.label}</Link>
            )}
          </span>
        );
      })}
    </nav>
  );
}
