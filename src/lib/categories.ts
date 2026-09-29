import type { TransactionType } from "../types/transaction";

export interface CategoryGroup {
  label: string;
  categories: string[];
}

export const CATEGORY_GROUPS: Record<TransactionType, CategoryGroup[]> = {
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

export function isValidCategory(type: TransactionType, category: string) {
  return CATEGORY_GROUPS[type].some((group) =>
    group.categories.includes(category),
  );
}

export const TYPE_LABELS: Record<TransactionType, string> = {
  income: "Income",
  expense: "Expense",
};
