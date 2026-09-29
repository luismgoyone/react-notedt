import { FiPlus } from "react-icons/fi";
import { HiOutlineCurrencyDollar } from "react-icons/hi";
import { Link } from "react-router";
import logo from "../images/Logo.png";
import { formatCurrency } from "../lib/format";
import { getTotals } from "../lib/transactions";
import { useAppData } from "../state/useAppData";

export function Topnav({ onAddTransaction }: { onAddTransaction: () => void }) {
  const {
    data: { transactions },
  } = useAppData();
  const { savings } = getTotals(transactions);

  return (
    <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-brand bg-surface px-4 py-3 md:px-6 md:py-5">
      <Link to="/" className="shrink-0 md:hidden" aria-label="Notedt home">
        <img
          src={logo}
          alt=""
          width={40}
          height={32}
          className="h-8 w-auto dark:brightness-160"
        />
      </Link>
      <div className="min-w-0 flex-1 text-brand">
        <p className="text-xs tracking-wide md:text-sm">Savings</p>
        <p
          className={`flex items-center gap-1 truncate text-base font-semibold tabular-nums md:text-lg ${
            savings < 0 ? "text-expense" : ""
          }`}
          data-testid="savings"
        >
          <HiOutlineCurrencyDollar aria-hidden size={20} className="shrink-0" />
          {formatCurrency(savings)}
        </p>
      </div>
      <button
        type="button"
        className="btn-primary px-3 sm:px-4"
        onClick={onAddTransaction}
      >
        <FiPlus aria-hidden size={20} />
        <span className="sr-only sm:not-sr-only">Add transaction</span>
      </button>
    </header>
  );
}
