"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, ClipboardList, ClipboardPenLine, Map, Radar } from "lucide-react";
import { useEffect, useState } from "react";
import { cx } from "@/lib/utils";
import RoleSwitcher, { getStoredRole, ROLES } from "@/components/layout/RoleSwitcher";

const fieldTabs = [
  { href: "/log", label: "Log", icon: ClipboardPenLine },
  { href: "/visits", label: "Visits", icon: ClipboardList },
];

const managerTabs = [
  { href: "/dashboard", label: "Dashboard", icon: BarChart3 },
  { href: "/map", label: "Map", icon: Map },
  { href: "/patterns", label: "Patterns", icon: Radar },
];

export default function MobileNav() {
  const pathname = usePathname();
  const [role, setRole] = useState(ROLES.field);

  useEffect(() => {
    setRole(getStoredRole());
    function onRoleChange(event) {
      setRole(event.detail || getStoredRole());
    }
    window.addEventListener("debrief-role-change", onRoleChange);
    return () => window.removeEventListener("debrief-role-change", onRoleChange);
  }, []);

  const tabs = role === ROLES.manager ? managerTabs : fieldTabs;

  return (
    <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-slate-200 bg-white/94 px-2 pb-[env(safe-area-inset-bottom)] shadow-2xl shadow-slate-950/10 backdrop-blur-xl">
      <div className="mx-auto grid max-w-2xl grid-cols-1 items-center gap-1 py-1 min-[430px]:grid-cols-[1fr_auto] min-[430px]:gap-2">
        <div className={cx("grid h-14 min-[430px]:h-[3.75rem]", role === ROLES.manager ? "grid-cols-3" : "grid-cols-2")}>
        {tabs.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(`${href}/`);
          return (
            <Link
              key={href}
              href={href}
              className={cx(
                "grid place-items-center gap-0.5 rounded-lg text-[11px] font-bold transition min-[380px]:text-xs",
                active ? "text-teal-800" : "text-slate-500 hover:text-slate-900"
              )}
            >
              <span className={cx("grid h-7 w-10 place-items-center rounded-full transition min-[380px]:h-8 min-[380px]:w-12", active && "bg-teal-100")}>
                <Icon className="h-4 w-4 min-[380px]:h-5 min-[380px]:w-5" />
              </span>
              <span>{label}</span>
            </Link>
          );
        })}
        </div>
        <div className="hidden w-44 min-[430px]:block">
          <RoleSwitcher compact />
        </div>
      </div>
    </nav>
  );
}
