import { useForm, useWatch } from "react-hook-form";
import { CATEGORY_GROUPS, TYPE_LABELS } from "../lib/categories";
import { isISODate, toISODate } from "../lib/format";
import { useToast } from "../state/useToast";
import { useTransactions } from "../state/useTransactions";
import {
  TRANSACTION_TYPES,
  type Transaction,
  type TransactionType,
} from "../types/transaction";
import { Modal } from "./Modal";

const FORM_ID = "transaction-form";
const MAX_AMOUNT = 1_000_000_000;

interface FormValues {
  type: TransactionType;
  category: string;
  date: string;
  amount: string;
  description: string;
}

interface TransactionFormModalProps {
  open: boolean;
  onClose: () => void;
  /** When set, the form edits this transaction instead of creating one. */
  transaction?: Transaction | null;
}

export function TransactionFormModal({
  open,
  onClose,
  transaction,
}: TransactionFormModalProps) {
  const isEditing = Boolean(transaction);
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEditing ? "Edit transaction" : "Add transaction"}
      footer={
        <>
          <button type="button" className="btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" form={FORM_ID} className="btn-primary">
            {isEditing ? "Save changes" : "Save"}
          </button>
        </>
      }
    >
      <TransactionForm transaction={transaction} onDone={onClose} />
    </Modal>
  );
}

function TransactionForm({
  transaction,
  onDone,
}: {
  transaction?: Transaction | null;
  onDone: () => void;
}) {
  const { addTransaction, updateTransaction } = useTransactions();
  const { showToast } = useToast();
  const {
    register,
    handleSubmit,
    setValue,
    control,
    formState: { errors },
  } = useForm<FormValues>({
    defaultValues: {
      type: transaction?.type ?? "expense",
      category: transaction?.category ?? "",
      date: transaction?.date ?? toISODate(new Date()),
      amount: transaction ? transaction.amount.toFixed(2) : "",
      description: transaction?.description ?? "",
    },
  });

  const type = useWatch({ control, name: "type" });
  const groups = CATEGORY_GROUPS[type];
  // Keep a saved category selectable even if it's no longer in the list.
  const hasUnknownCategory =
    transaction?.type === type &&
    !groups.some((g) => g.categories.includes(transaction.category));

  const onSubmit = (values: FormValues) => {
    const input = {
      type: values.type,
      category: values.category,
      date: values.date,
      amount: Number(values.amount),
      description: values.description,
    };
    try {
      if (transaction) {
        updateTransaction(transaction.id, input);
        showToast("Transaction updated");
      } else {
        addTransaction(input);
        showToast("Transaction added");
      }
      onDone();
    } catch {
      showToast("Couldn't save the transaction. Please try again.", "error");
    }
  };

  return (
    <form
      id={FORM_ID}
      noValidate
      onSubmit={handleSubmit(onSubmit)}
      className="flex flex-col gap-4"
    >
      <fieldset>
        <legend className="field-label">Type</legend>
        <div className="grid grid-cols-2 gap-2">
          {TRANSACTION_TYPES.map((option) => (
            <label
              key={option}
              className={`flex min-h-11 items-center justify-center rounded-md border text-sm font-semibold uppercase transition-colors has-focus-visible:outline-2 has-focus-visible:outline-brand ${
                type === option
                  ? option === "income"
                    ? "border-brand bg-brand text-white"
                    : "border-expense bg-expense text-white"
                  : "border-line bg-white text-muted hover:border-brand"
              }`}
            >
              <input
                type="radio"
                value={option}
                className="sr-only"
                {...register("type", {
                  onChange: () => setValue("category", ""),
                })}
              />
              {TYPE_LABELS[option]}
            </label>
          ))}
        </div>
      </fieldset>

      <div>
        <label htmlFor="tx-category" className="field-label">
          Category
        </label>
        <select
          id="tx-category"
          className="field"
          aria-invalid={errors.category ? true : undefined}
          aria-describedby={errors.category ? "tx-category-error" : undefined}
          {...register("category", { required: "Choose a category." })}
        >
          <option value="" disabled>
            Select a category
          </option>
          {hasUnknownCategory && transaction && (
            <option value={transaction.category}>{transaction.category}</option>
          )}
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
        </select>
        {errors.category && (
          <p id="tx-category-error" className="field-error">
            {errors.category.message}
          </p>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="tx-date" className="field-label">
            Date
          </label>
          <input
            id="tx-date"
            type="date"
            className="field"
            aria-invalid={errors.date ? true : undefined}
            aria-describedby={errors.date ? "tx-date-error" : undefined}
            {...register("date", {
              required: "Enter a date.",
              validate: (value) => isISODate(value) || "Enter a valid date.",
            })}
          />
          {errors.date && (
            <p id="tx-date-error" className="field-error">
              {errors.date.message}
            </p>
          )}
        </div>

        <div>
          <label htmlFor="tx-amount" className="field-label">
            Amount (PHP)
          </label>
          <input
            id="tx-amount"
            type="number"
            inputMode="decimal"
            step="0.01"
            min="0.01"
            placeholder="0.00"
            className="field"
            aria-invalid={errors.amount ? true : undefined}
            aria-describedby={errors.amount ? "tx-amount-error" : undefined}
            {...register("amount", {
              required: "Enter an amount.",
              validate: (value) => {
                const amount = Number(value);
                if (!Number.isFinite(amount) || amount <= 0) {
                  return "Enter an amount greater than 0.";
                }
                if (!/^\d+(\.\d{1,2})?$/.test(value.trim())) {
                  return "Use at most 2 decimal places.";
                }
                if (amount > MAX_AMOUNT) {
                  return "That amount is too large.";
                }
                return true;
              },
            })}
          />
          {errors.amount && (
            <p id="tx-amount-error" className="field-error">
              {errors.amount.message}
            </p>
          )}
        </div>
      </div>

      <div>
        <label htmlFor="tx-description" className="field-label">
          Description <span className="font-normal text-muted">(optional)</span>
        </label>
        <textarea
          id="tx-description"
          rows={3}
          placeholder="What was this for?"
          className="field resize-none"
          aria-invalid={errors.description ? true : undefined}
          aria-describedby={
            errors.description ? "tx-description-error" : undefined
          }
          {...register("description", {
            maxLength: {
              value: 200,
              message: "Keep it under 200 characters.",
            },
          })}
        />
        {errors.description && (
          <p id="tx-description-error" className="field-error">
            {errors.description.message}
          </p>
        )}
      </div>
    </form>
  );
}
