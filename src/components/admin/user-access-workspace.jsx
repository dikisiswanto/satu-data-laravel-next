"use client";

import { useState } from "react";
import { UserPlus, ShieldCheck } from "lucide-react";
import { InviteUserForm } from "@/components/admin/invite-user-form";
import { MembershipForm } from "@/components/admin/membership-form";

const ACCESS_MODES = [
  {
    key: "invite",
    shortTitle: "Pengguna baru",
    description:
      "Gunakan jika orang tersebut belum memiliki akun. Anda akan mengisi identitas, peran, dan organisasi dalam satu langkah.",
    icon: UserPlus,
  },
  {
    key: "membership",
    shortTitle: "Akun sudah ada",
    description:
      "Gunakan untuk memberi akun yang sudah ada peran tambahan atau akses ke organisasi lain.",
    icon: ShieldCheck,
  },
];

export function UserAccessWorkspace({ organizations }) {
  const [activeMode, setActiveMode] = useState("invite");

  function selectMode(nextMode) {
    if (nextMode === activeMode) return;
    const panel = document.getElementById(`user-access-panel-${activeMode}`);
    const form = panel?.querySelector("form");
    if (form) {
      const hasUnsavedInput = [...new FormData(form).entries()].some(
        ([name, value]) =>
          !["role", "is_active"].includes(name) &&
          typeof value === "string" &&
          value.trim() !== "",
      );
      if (
        hasUnsavedInput &&
        !window.confirm(
          "Formulir ini berisi isian yang belum disimpan. Ganti alur dan buang isian tersebut?",
        )
      ) {
        return;
      }
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
          Tambahkan pengguna atau akses
        </h2>
        <p className="mt-1 text-sm leading-6 text-muted">
          Pilih berdasarkan kondisi akun. Pengguna baru cukup diundang sekali;
          akun yang sudah ada dapat diberi akses tambahan.
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
