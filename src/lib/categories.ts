import type { CustomCategory, TransactionType } from "../types/transaction";

export interface CategoryGroup {
  label: string;
  categories: string[];
}

export const BUILT_IN_CATEGORIES: Record<TransactionType, CategoryGroup[]> = {
  income: [{ label: "Income", categories: ["Salary", "Allowance", "Other"] }],
  expense: [
    {
      label: "Essential Expenses",
      categories: [
        "Electricity Bill",
        "Water Bill",
        "Phone Bill",
        "Internet Bill",
        "Rentals",
        "Food & Beverages",
        "Other Utility Bill",
        "Education",
        "Debts",
        "Loan",
        "Insurances",
        "Home Maintenance",
        "Vehicle Maintenance",
        "Other Essential Expenses",
      ],
    },
    {
      label: "Entertainment Expenses",
      categories: ["Television Bill", "Other Entertainment Expenses"],
    },
    {
      label: "Health & Personal Expenses",
      categories: [
        "Medical Check Up",
        "Personal Item",
        "Fitness",
        "Gifts & Donations",
        "Other Health & Personal Expenses",
      ],
    },
  ],
};

export const MAX_CATEGORY_NAME_LENGTH = 40;

/** Built-in groups plus the user's own categories as a "Custom" group. */
export function getCategoryGroups(
  type: TransactionType,
  custom: CustomCategory[],
): CategoryGroup[] {
  const mine = custom
    .filter((category) => category.type === type)
    .map((category) => category.name)
    .sort((a, b) => a.localeCompare(b));
  return mine.length > 0
    ? [...BUILT_IN_CATEGORIES[type], { label: "Custom", categories: mine }]
    : BUILT_IN_CATEGORIES[type];
}

export function getCategoryNames(
  type: TransactionType,
  custom: CustomCategory[],
) {
  return getCategoryGroups(type, custom).flatMap((group) => group.categories);
}

/**
 * Returns an error message for a new or renamed category, or null when the
 * name is usable. `ignoreId` skips the category being renamed.
 */
export function validateCategoryName(
  name: string,
  type: TransactionType,
  custom: CustomCategory[],
  ignoreId?: string,
): string | null {
  const trimmed = name.trim();
  if (!trimmed) return "Enter a name.";
  if (trimmed.length > MAX_CATEGORY_NAME_LENGTH) {
    return `Keep it under ${MAX_CATEGORY_NAME_LENGTH} characters.`;
  }
  const taken = getCategoryNames(
    type,
    custom.filter((category) => category.id !== ignoreId),
  ).some((existing) => existing.toLowerCase() === trimmed.toLowerCase());
  return taken ? "A category with that name already exists." : null;
}

export const TYPE_LABELS: Record<TransactionType, string> = {
  income: "Income",
  expense: "Expense",
};
