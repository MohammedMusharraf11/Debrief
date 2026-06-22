"use client";

import { ShieldCheck, UserRound } from "lucide-react";
import { useEffect, useState } from "react";
import { cx } from "@/lib/utils";

export const ROLES = {
  field: "field",
  manager: "manager",
};

export function getStoredRole() {
  if (typeof window === "undefined") return ROLES.field;
  return localStorage.getItem("debrief.role") || ROLES.field;
}

export default function RoleSwitcher({ compact = false }) {
  const [role, setRole] = useState(ROLES.field);

  useEffect(() => {
    setRole(getStoredRole());
    function onRoleChange(event) {
      setRole(event.detail || getStoredRole());
    }
    window.addEventListener("debrief-role-change", onRoleChange);
    return () => window.removeEventListener("debrief-role-change", onRoleChange);
  }, []);

  function update(nextRole) {
    if (nextRole === role) return;
    setRole(nextRole);
    localStorage.setItem("debrief.role", nextRole);
    window.dispatchEvent(new CustomEvent("debrief-role-change", { detail: nextRole }));
  }

  return (
    <div className={cx("grid grid-cols-2 rounded-lg bg-slate-100 p-1", compact ? "w-full" : "w-full max-w-56")}>
      <button
        type="button"
        onClick={() => update(ROLES.field)}
        className={cx(
          "inline-flex min-h-9 items-center justify-center gap-1 rounded-md px-1 text-[10px] font-black transition min-[360px]:gap-1.5 min-[360px]:px-2 min-[360px]:text-[11px] min-[380px]:gap-2 min-[380px]:px-3 min-[380px]:text-xs",
          role === ROLES.field ? "bg-white text-teal-800 shadow-sm" : "text-slate-500"
        )}
      >
        <UserRound className="h-3 w-3 min-[360px]:h-3.5 min-[360px]:w-3.5 min-[380px]:h-4 min-[380px]:w-4" />
        Field
      </button>
      <button
        type="button"
        onClick={() => update(ROLES.manager)}
        className={cx(
          "inline-flex min-h-9 items-center justify-center gap-1 rounded-md px-1 text-[10px] font-black transition min-[360px]:gap-1.5 min-[360px]:px-2 min-[360px]:text-[11px] min-[380px]:gap-2 min-[380px]:px-3 min-[380px]:text-xs",
          role === ROLES.manager ? "bg-white text-teal-800 shadow-sm" : "text-slate-500"
        )}
      >
        <ShieldCheck className="h-3 w-3 min-[360px]:h-3.5 min-[360px]:w-3.5 min-[380px]:h-4 min-[380px]:w-4" />
        Manager
      </button>
    </div>
  );
}
