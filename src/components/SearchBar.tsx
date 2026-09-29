import { BsSearch } from "react-icons/bs";

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
}

export function SearchBar({ value, onChange }: SearchBarProps) {
  return (
    <form
      role="search"
      className="relative flex-1"
      onSubmit={(event) => event.preventDefault()}
    >
      <label htmlFor="transaction-search" className="sr-only">
        Search transactions
      </label>
      <BsSearch
        aria-hidden
        size={16}
        className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted"
      />
      <input
        id="transaction-search"
        type="search"
        placeholder="Search"
        autoComplete="off"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="field pl-9"
      />
    </form>
  );
}
