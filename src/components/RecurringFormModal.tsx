import { useForm, useWatch } from "react-hook-form";
import { getCategoryGroups } from "../lib/categories";
import { isISODate, toISODate } from "../lib/format";
import { describeSchedule } from "../lib/recurring";
import { validateAmount } from "../lib/validation";
import { useAppData } from "../state/useAppData";
import { useToast } from "../state/useToast";
import type { RecurringRule, TransactionType } from "../types/transaction";
import { errorProps } from "./errorProps";
import { CategoryOptions, FieldError, TypeToggle } from "./FormFields";
import { Modal } from "./Modal";

const FORM_ID = "recurring-form";
const DAYS = Array.from({ length: 31 }, (_, i) => i + 1);

interface FormValues {
  type: TransactionType;
  category: string;
  amount: string;
  dayOfMonth: string;
  startDate: string;
  description: string;
}

interface RecurringFormModalProps {
  open: boolean;
  onClose: () => void;
  rule?: RecurringRule | null;
}

export function RecurringFormModal({
  open,
  onClose,
  rule,
}: RecurringFormModalProps) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={rule ? "Edit recurring" : "Add recurring"}
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
      <RecurringForm rule={rule} onDone={onClose} />
    </Modal>
  );
}

function RecurringForm({
  rule,
  onDone,
}: {
  rule?: RecurringRule | null;
  onDone: () => void;
}) {
  const { data, addRecurring, updateRecurring } = useAppData();
  const { showToast } = useToast();
  const today = toISODate(new Date());
  const {
    register,
    handleSubmit,
    setValue,
    control,
    formState: { errors },
  } = useForm<FormValues>({
    defaultValues: {
      type: rule?.type ?? "expense",
      category: rule?.category ?? "",
      amount: rule ? rule.amount.toFixed(2) : "",
      dayOfMonth: String(rule?.dayOfMonth ?? Number(today.slice(8))),
      startDate: rule?.startDate ?? today,
      description: rule?.description ?? "",
    },
  });
  const type = useWatch({ control, name: "type" });
  const day = Number(useWatch({ control, name: "dayOfMonth" }));

  const onSubmit = (values: FormValues) => {
    const input = {
      type: values.type,
      category: values.category,
      amount: Number(values.amount),
      dayOfMonth: Number(values.dayOfMonth),
      startDate: values.startDate,
      description: values.description,
    };
    try {
      if (rule) {
        updateRecurring(rule.id, input);
        showToast("Recurring transaction updated");
      } else {
        addRecurring(input);
        showToast("Recurring transaction added");
      }
      onDone();
    } catch {
      showToast("Couldn't save. Please try again.", "error");
    }
  };

  return (
    <form
      id={FORM_ID}
      noValidate
      className="flex flex-col gap-4"
      onSubmit={handleSubmit(onSubmit)}
    >
      <TypeToggle
        value={type}
        registration={register("type", {
          onChange: () => setValue("category", ""),
        })}
      />

      <div>
        <label htmlFor="rec-category" className="field-label">
          Category
        </label>
        <select
          id="rec-category"
          className="field"
          {...errorProps("rec-category-error", errors.category?.message)}
          {...register("category", { required: "Choose a category." })}
        >
          <CategoryOptions
            groups={getCategoryGroups(type, data.categories)}
            extra={rule?.type === type ? rule.category : undefined}
          />
        </select>
        <FieldError
          id="rec-category-error"
          message={errors.category?.message}
        />
      </div>

      <div>
        <label htmlFor="rec-amount" className="field-label">
          Amount (PHP)
        </label>
        <input
          id="rec-amount"
          type="number"
          inputMode="decimal"
          step="0.01"
          min="0.01"
          placeholder="0.00"
          className="field"
          {...errorProps("rec-amount-error", errors.amount?.message)}
          {...register("amount", {
            required: "Enter an amount.",
            validate: validateAmount,
          })}
        />
        <FieldError id="rec-amount-error" message={errors.amount?.message} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="rec-day" className="field-label">
            Day of the month
          </label>
          <select id="rec-day" className="field" {...register("dayOfMonth")}>
            {DAYS.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
          <p className="mt-1 text-xs text-muted">
            {describeSchedule({ dayOfMonth: day })}
          </p>
        </div>
        <div>
          <label htmlFor="rec-start" className="field-label">
            Starting
          </label>
          <input
            id="rec-start"
            type="date"
            className="field"
            {...errorProps("rec-start-error", errors.startDate?.message)}
            {...register("startDate", {
              required: "Enter a start date.",
              validate: (value) => isISODate(value) || "Enter a valid date.",
            })}
          />
          <FieldError
            id="rec-start-error"
            message={errors.startDate?.message}
          />
        </div>
      </div>

      <div>
        <label htmlFor="rec-description" className="field-label">
          Description <span className="font-normal text-muted">(optional)</span>
        </label>
        <input
          id="rec-description"
          type="text"
          placeholder="e.g. Apartment rent"
          className="field"
          {...errorProps("rec-description-error", errors.description?.message)}
          {...register("description", {
            maxLength: { value: 200, message: "Keep it under 200 characters." },
          })}
        />
        <FieldError
          id="rec-description-error"
          message={errors.description?.message}
        />
      </div>

      {rule && (
        <p className="text-sm text-muted">
          Changes apply to future transactions. Ones already created stay as
          they are.
        </p>
      )}
    </form>
  );
}
