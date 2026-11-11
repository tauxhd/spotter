"use client";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import Icon from "./Icon";

const tabs = [
  { href: "/", label: "Gym", icon: "gym" },
  { href: "/train", label: "Train", icon: "train" },
  { href: "/eat", label: "Eat", icon: "eat" },
  { href: "/board", label: "Ranks", icon: "ranks" },
  { href: "/feed", label: "Feed", icon: "feed" },
] as const;

export default function Nav() {
  const path = usePathname();
  const t = useSearchParams().get("t"); // keep demo time across tabs
  const q = t ? `?t=${encodeURIComponent(t)}` : "";
  return (
    <nav className="glass-bar fixed inset-x-0 print:hidden bottom-0 z-20 pb-[env(safe-area-inset-bottom)]">
      <ul className="mx-auto flex max-w-md justify-around">
        {tabs.map(({ href, label, icon }) => {
          const active = href === "/" ? path === "/" || path === "/map" : path.startsWith(href);
          return (
            <li key={href}>
              <Link
                href={href + q}
                aria-current={active ? "page" : undefined}
                className={`flex flex-col items-center gap-1 px-3 py-2.5 text-[11px] font-medium transition-colors ${
                  active ? "text-lime-600 dark:text-lime-400" : "text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
                }`}
              >
                <Icon name={icon} size={28} className={`transition ${active ? "scale-110" : "opacity-60 grayscale"}`} />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
