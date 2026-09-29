import { useForm } from "react-hook-form";
import { getCategoryGroups } from "../lib/categories";
import { validateAmount } from "../lib/validation";
import { useAppData } from "../state/useAppData";
import { useToast } from "../state/useToast";
import type { Budget } from "../types/transaction";
import { errorProps } from "./errorProps";
import { CategoryOptions, FieldError } from "./FormFields";
import { Modal } from "./Modal";

const FORM_ID = "budget-form";

interface BudgetFormModalProps {
  open: boolean;
  onClose: () => void;
  /** When set, edits this budget's limit. */
  budget?: Budget | null;
}

export function BudgetFormModal({
  open,
  onClose,
  budget,
}: BudgetFormModalProps) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={budget ? "Edit budget" : "Add budget"}
      footer={
        <>
          <button type="button" className="btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" form={FORM_ID} className="btn-primary">
            Save
          </button>
        </>
      }
    >
      <BudgetForm budget={budget} onDone={onClose} />
    </Modal>
  );
}

function BudgetForm({
  budget,
  onDone,
}: {
  budget?: Budget | null;
  onDone: () => void;
}) {
  const { data, setBudget } = useAppData();
  const { showToast } = useToast();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    defaultValues: {
      category: budget?.category ?? "",
      limit: budget ? budget.limit.toFixed(2) : "",
    },
  });

  // Offer only categories that don't have a budget yet.
  const taken = new Set(data.budgets.map((b) => b.category));
  const groups = getCategoryGroups("expense", data.categories)
    .map((group) => ({
      ...group,
      categories: group.categories.filter(
        (c) => c === budget?.category || !taken.has(c),
      ),
    }))
    .filter((group) => group.categories.length > 0);

  return (
    <form
      id={FORM_ID}
      noValidate
      className="flex flex-col gap-4"
      onSubmit={handleSubmit((values) => {
        try {
          // Disabled fields are left out of `values` when editing.
          setBudget(budget?.category ?? values.category, Number(values.limit));
          showToast(budget ? "Budget updated" : "Budget added");
          onDone();
        } catch {
          showToast("Couldn't save the budget. Please try again.", "error");
        }
      })}
    >
      <div>
        <label htmlFor="budget-category" className="field-label">
          Expense category
        </label>
        <select
          id="budget-category"
          className="field"
          disabled={Boolean(budget)}
          {...errorProps("budget-category-error", errors.category?.message)}
          {...register("category", { required: "Choose a category." })}
        >
          <CategoryOptions groups={groups} extra={budget?.category} />
        </select>
        <FieldError
          id="budget-category-error"
          message={errors.category?.message}
        />
      </div>
      <div>
        <label htmlFor="budget-limit" className="field-label">
          Monthly limit (PHP)
        </label>
        <input
          id="budget-limit"
          type="number"
          inputMode="decimal"
          step="0.01"
          min="0.01"
          placeholder="0.00"
          className="field"
          {...errorProps("budget-limit-error", errors.limit?.message)}
          {...register("limit", {
            required: "Enter a limit.",
            validate: validateAmount,
          })}
        />
        <FieldError id="budget-limit-error" message={errors.limit?.message} />
      </div>
    </form>
  );
}
