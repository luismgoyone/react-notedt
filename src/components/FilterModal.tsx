import { useForm } from "react-hook-form";
import { TYPE_LABELS } from "../lib/categories";
import {
  EMPTY_FILTERS,
  TRANSACTION_TYPES,
  type TransactionFilters,
  type TransactionType,
} from "../types/transaction";
import { Modal } from "./Modal";

const FORM_ID = "filter-form";

interface FormValues {
  from: string;
  to: string;
  types: TransactionType[];
  min: string;
  max: string;
}

interface FilterModalProps {
  open: boolean;
  onClose: () => void;
  filters: TransactionFilters;
  onApply: (filters: TransactionFilters) => void;
}

export function FilterModal({
  open,
  onClose,
  filters,
  onApply,
}: FilterModalProps) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Filters"
      footer={
        <>
          <button
            type="button"
            className="btn-secondary mr-auto"
            onClick={() => {
              onApply(EMPTY_FILTERS);
              onClose();
            }}
          >
            Reset
          </button>
          <button type="button" className="btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" form={FORM_ID} className="btn-primary">
            Apply
          </button>
        </>
      }
    >
      <FilterForm
        filters={filters}
        onSubmit={(next) => {
          onApply(next);
          onClose();
        }}
      />
    </Modal>
  );
}

const toNumber = (value: string) =>
  value.trim() === "" ? null : Number(value);

function FilterForm({
  filters,
  onSubmit,
}: {
  filters: TransactionFilters;
  onSubmit: (filters: TransactionFilters) => void;
}) {
  const {
    register,
    handleSubmit,
    getValues,
    formState: { errors },
  } = useForm<FormValues>({
    defaultValues: {
      from: filters.from,
      to: filters.to,
      types: filters.types,
      min: filters.min?.toString() ?? "",
      max: filters.max?.toString() ?? "",
    },
  });

  const amountRule = (value: string) =>
    value.trim() === "" ||
    (Number.isFinite(Number(value)) && Number(value) >= 0) ||
    "Enter 0 or more.";

  return (
    <form
      id={FORM_ID}
      noValidate
      className="flex flex-col gap-5"
      onSubmit={handleSubmit((values) =>
        onSubmit({
          from: values.from,
          to: values.to,
          types: TRANSACTION_TYPES.filter((t) => values.types.includes(t)),
          min: toNumber(values.min),
          max: toNumber(values.max),
        }),
      )}
    >
      <fieldset>
        <legend className="field-label">Date range</legend>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="filter-from" className="text-sm text-muted">
              From
            </label>
            <input
              id="filter-from"
              type="date"
              className="field mt-1"
              {...register("from")}
            />
          </div>
          <div>
            <label htmlFor="filter-to" className="text-sm text-muted">
              To
            </label>
            <input
              id="filter-to"
              type="date"
              className="field mt-1"
              aria-invalid={errors.to ? true : undefined}
              aria-describedby={errors.to ? "filter-to-error" : undefined}
              {...register("to", {
                validate: (to) => {
                  const from = getValues("from");
                  return (
                    !from ||
                    !to ||
                    to >= from ||
                    "End date is before start date."
                  );
                },
              })}
            />
          </div>
        </div>
        {errors.to && (
          <p id="filter-to-error" className="field-error">
            {errors.to.message}
          </p>
        )}
      </fieldset>

      <fieldset>
        <legend className="field-label">Type</legend>
        <div className="flex gap-6">
          {TRANSACTION_TYPES.map((type) => (
            <label
              key={type}
              className="flex min-h-11 items-center gap-2 text-sm"
            >
              <input
                type="checkbox"
                value={type}
                className="size-5 accent-brand"
                {...register("types", {
                  validate: (types) =>
                    types.length > 0 || "Choose at least one type.",
                })}
              />
              {TYPE_LABELS[type]}
            </label>
          ))}
        </div>
        {errors.types && (
          <p className="field-error" role="alert">
            {errors.types.message}
          </p>
        )}
      </fieldset>

      <fieldset>
        <legend className="field-label">Amount range (PHP)</legend>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="filter-min" className="text-sm text-muted">
              Min
            </label>
            <input
              id="filter-min"
              type="number"
              inputMode="decimal"
              min="0"
              step="0.01"
              className="field mt-1"
              aria-invalid={errors.min ? true : undefined}
              aria-describedby={errors.min ? "filter-min-error" : undefined}
              {...register("min", { validate: amountRule })}
            />
            {errors.min && (
              <p id="filter-min-error" className="field-error">
                {errors.min.message}
              </p>
            )}
          </div>
          <div>
            <label htmlFor="filter-max" className="text-sm text-muted">
              Max
            </label>
            <input
              id="filter-max"
              type="number"
              inputMode="decimal"
              min="0"
              step="0.01"
              className="field mt-1"
              aria-invalid={errors.max ? true : undefined}
              aria-describedby={errors.max ? "filter-max-error" : undefined}
              {...register("max", {
                validate: (max) => {
                  const base = amountRule(max);
                  if (base !== true) return base;
                  const min = toNumber(getValues("min"));
                  const maxValue = toNumber(max);
                  return (
                    min === null ||
                    maxValue === null ||
                    maxValue >= min ||
                    "Max is less than min."
                  );
                },
              })}
            />
            {errors.max && (
              <p id="filter-max-error" className="field-error">
                {errors.max.message}
              </p>
            )}
          </div>
        </div>
      </fieldset>
    </form>
  );
}
