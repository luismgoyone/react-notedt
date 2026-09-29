import { useForm, useWatch } from "react-hook-form";
import { getCategoryGroups } from "../lib/categories";
import { isISODate, toISODate } from "../lib/format";
import { validateAmount } from "../lib/validation";
import { useToast } from "../state/useToast";
import { useAppData } from "../state/useAppData";
import type { Transaction, TransactionType } from "../types/transaction";
import { errorProps } from "./errorProps";
import { CategoryOptions, FieldError, TypeToggle } from "./FormFields";
import { Modal } from "./Modal";

const FORM_ID = "transaction-form";

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
  const { data, addTransaction, updateTransaction } = useAppData();
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
  const groups = getCategoryGroups(type, data.categories);
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
      <TypeToggle
        value={type}
        registration={register("type", {
          onChange: () => setValue("category", ""),
        })}
      />

      <div>
        <label htmlFor="tx-category" className="field-label">
          Category
        </label>
        <select
          id="tx-category"
          className="field"
          {...errorProps("tx-category-error", errors.category?.message)}
          {...register("category", { required: "Choose a category." })}
        >
          <CategoryOptions
            groups={groups}
            extra={
              transaction?.type === type ? transaction.category : undefined
            }
          />
        </select>
        <FieldError id="tx-category-error" message={errors.category?.message} />
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
              validate: validateAmount,
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
