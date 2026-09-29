import type { IconType } from "react-icons";
import { AiFillPieChart } from "react-icons/ai";
import { BsArrowLeftRight } from "react-icons/bs";
import { NavLink } from "react-router";
import logo from "../images/Logo.png";

const NAV_ITEMS: { label: string; to: string; icon: IconType }[] = [
  { label: "Overview", to: "/", icon: AiFillPieChart },
  { label: "Transactions", to: "/transactions", icon: BsArrowLeftRight },
];

const linkClass = ({ isActive }: { isActive: boolean }) =>
  `flex flex-col items-center gap-1 rounded-lg px-3 py-2 transition-colors focus-visible:outline-2 focus-visible:outline-brand ${
    isActive ? "font-semibold text-brand" : "text-muted hover:text-brand"
  }`;

export function Sidebar() {
  return (
    <aside className="sticky top-0 hidden h-dvh w-40 shrink-0 flex-col items-center border-r border-brand bg-white md:flex">
      <NavLink to="/" className="mt-6 mb-16" aria-label="Notedt home">
        <img src={logo} alt="" width={60} height={48} className="h-12 w-auto" />
      </NavLink>
      <nav aria-label="Main" className="flex flex-col gap-6">
        {NAV_ITEMS.map(({ label, to, icon: Icon }) => (
          <NavLink key={to} to={to} end className={linkClass}>
            <Icon aria-hidden size={36} />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}

export function BottomNav() {
  return (
    <nav
      aria-label="Main"
      className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-2 border-t border-brand bg-white pb-[env(safe-area-inset-bottom)] md:hidden"
    >
      {NAV_ITEMS.map(({ label, to, icon: Icon }) => (
        <NavLink
          key={to}
          to={to}
          end
          className={(state) => `${linkClass(state)} text-xs`}
        >
          <Icon aria-hidden size={22} />
          <span>{label}</span>
        </NavLink>
      ))}
    </nav>
  );
}
