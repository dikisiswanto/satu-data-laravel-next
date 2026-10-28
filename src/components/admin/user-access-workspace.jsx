"use client";

import { useState } from "react";
import { UserPlus, ShieldCheck } from "lucide-react";
import { InviteUserForm } from "@/components/admin/invite-user-form";
import { MembershipForm } from "@/components/admin/membership-form";

const ACCESS_MODES = [
  {
    key: "invite",
    shortTitle: "Undang akun baru",
    description:
      "Masukkan nama dan email, lalu pilih peran serta organisasi. Petunjuk aktivasi dikirim melalui email.",
    icon: UserPlus,
  },
  {
    key: "membership",
    shortTitle: "Akun terdaftar",
    description: "Masukkan email akun aktif, lalu pilih peran dan organisasi.",
    icon: ShieldCheck,
  },
];

export function UserAccessWorkspace({ organizations }) {
  const [activeMode, setActiveMode] = useState("invite");

  function selectMode(nextMode) {
    if (nextMode === activeMode) return;
    const panel = document.getElementById(`user-access-panel-${activeMode}`);
    const form = panel?.querySelector("form");
    const hasUnsavedInput = form?.dataset.userModified === "true";
    if (
      hasUnsavedInput &&
      !window.confirm(
        "Ada perubahan yang belum disimpan. Ganti alur dan buang perubahan ini?",
      )
    ) {
      return;
    }
    setActiveMode(nextMode);
  }

  return (
    <section
      className="w-full space-y-3"
      aria-labelledby="user-access-actions-title"
    >
      <div>
        <h2
          id="user-access-actions-title"
          className="text-base font-semibold text-ink"
        >
          Tambah pengguna
        </h2>
        <p className="mt-1 text-sm leading-6 text-muted">
          Undang akun baru, atau tambahkan peran untuk akun yang sudah
          terdaftar.
        </p>
      </div>
      <div
        role="group"
        aria-label="Pilih alur pengelolaan akses"
        className="grid w-full grid-cols-1 gap-2 rounded-xl border border-[#dbe5eb] bg-[#f6f9fb] p-2 sm:grid-cols-2"
      >
        {ACCESS_MODES.map((mode) => {
          const Icon = mode.icon;
          const selected = activeMode === mode.key;
          return (
            <button
              key={mode.key}
              id={`user-access-tab-${mode.key}`}
              type="button"
              aria-pressed={selected}
              aria-controls={`user-access-panel-${mode.key}`}
              onClick={() => selectMode(mode.key)}
              className={`flex min-h-11 items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${
                selected
                  ? "bg-white text-primary shadow-sm ring-1 ring-[#cbdce7]"
                  : "text-muted hover:bg-white/70 hover:text-ink"
              }`}
            >
              <Icon size={17} aria-hidden="true" />
              <span>{mode.shortTitle}</span>
            </button>
          );
        })}
      </div>
      {ACCESS_MODES.map((mode) => {
        const selected = activeMode === mode.key;
        return (
          <div
            key={mode.key}
            id={`user-access-panel-${mode.key}`}
            aria-labelledby={`user-access-tab-${mode.key}`}
            hidden={!selected}
            className="min-w-0 outline-offset-4"
          >
            {selected ? (
              <>
                <p className="mb-3 text-sm leading-6 text-muted">
                  {mode.description}
                </p>
                {mode.key === "invite" ? (
                  <InviteUserForm organizations={organizations} />
                ) : (
                  <MembershipForm organizations={organizations} />
                )}
              </>
            ) : null}
          </div>
        );
      })}
    </section>
  );
}
