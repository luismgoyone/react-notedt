import type { UseFormRegisterReturn } from "react-hook-form";
import { TYPE_LABELS, type CategoryGroup } from "../lib/categories";
import { TRANSACTION_TYPES, type TransactionType } from "../types/transaction";

/** Income/Expense segmented control backed by radio inputs. */
export function TypeToggle({
  value,
  registration,
}: {
  value: TransactionType;
  registration: UseFormRegisterReturn;
}) {
  return (
    <fieldset>
      <legend className="field-label">Type</legend>
      <div className="grid grid-cols-2 gap-2">
        {TRANSACTION_TYPES.map((option) => (
          <label
            key={option}
            className={`flex min-h-11 items-center justify-center rounded-md border text-sm font-semibold uppercase transition-colors has-focus-visible:outline-2 has-focus-visible:outline-brand ${
              value === option
                ? option === "income"
                  ? "border-brand bg-brand text-on-brand"
                  : "border-expense bg-expense text-on-expense"
                : "border-line bg-surface text-muted hover:border-brand"
            }`}
          >
            <input
              type="radio"
              value={option}
              className="sr-only"
              {...registration}
            />
            {TYPE_LABELS[option]}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

/**
 * <option>s for a category select. `extra` keeps a saved value selectable
 * when it's no longer in the list (e.g. a deleted custom category).
 */
export function CategoryOptions({
  groups,
  extra,
  placeholder = "Select a category",
}: {
  groups: CategoryGroup[];
  extra?: string;
  placeholder?: string;
}) {
  const known = groups.some((group) => group.categories.includes(extra ?? ""));
  return (
    <>
      <option value="" disabled>
        {placeholder}
      </option>
      {extra && !known && <option value={extra}>{extra}</option>}
      {groups.map((group) =>
        groups.length === 1 ? (
          group.categories.map((category) => (
            <option key={category} value={category}>
              {category}
            </option>
          ))
        ) : (
          <optgroup key={group.label} label={group.label}>
            {group.categories.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </optgroup>
        ),
      )}
    </>
  );
}

export function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return (
    <p id={id} className="field-error">
      {message}
    </p>
  );
}
