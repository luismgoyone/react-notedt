import type { IconType } from "react-icons";
import { AiFillPieChart } from "react-icons/ai";
import { BsArrowLeftRight, BsGear, BsListCheck } from "react-icons/bs";
import { NavLink } from "react-router";
import logo from "../images/Logo.png";

const NAV_ITEMS: { label: string; to: string; icon: IconType }[] = [
  { label: "Overview", to: "/", icon: AiFillPieChart },
  { label: "Transactions", to: "/transactions", icon: BsArrowLeftRight },
  { label: "Plan", to: "/plan", icon: BsListCheck },
  { label: "Settings", to: "/settings", icon: BsGear },
];

const linkClass = ({ isActive }: { isActive: boolean }) =>
  `flex flex-col items-center gap-1 rounded-lg py-2 transition-colors focus-visible:outline-2 focus-visible:outline-brand ${
    isActive ? "font-semibold text-brand" : "text-muted hover:text-brand"
  }`;

export function Sidebar() {
  return (
    <aside className="sticky top-0 hidden h-dvh w-40 shrink-0 flex-col items-center border-r border-brand bg-surface md:flex">
      <NavLink to="/" className="mt-6 mb-12" aria-label="Notedt home">
        <img
          src={logo}
          alt=""
          width={60}
          height={48}
          className="h-12 w-auto dark:brightness-160"
        />
      </NavLink>
      <nav aria-label="Main" className="flex flex-col gap-6">
        {NAV_ITEMS.map(({ label, to, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end
            className={(state) => `${linkClass(state)} px-3`}
          >
            <Icon aria-hidden size={32} />
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
      className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-4 border-t border-brand bg-surface pb-[env(safe-area-inset-bottom)] md:hidden"
    >
      {NAV_ITEMS.map(({ label, to, icon: Icon }) => (
        <NavLink
          key={to}
          to={to}
          end
          className={(state) =>
            `${linkClass(state)} min-w-0 px-0.5 text-[11px]`
          }
        >
          <Icon aria-hidden size={22} />
          <span>{label}</span>
        </NavLink>
      ))}
    </nav>
  );
}
