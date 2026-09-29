import { useId, useRef, useState } from "react";
import type { ChangeEvent, FormEvent, ReactNode } from "react";
import { FiPlus } from "react-icons/fi";
import {
  HiOutlineDesktopComputer,
  HiOutlineDownload,
  HiOutlineMoon,
  HiOutlinePencil,
  HiOutlineSun,
  HiOutlineTrash,
  HiOutlineUpload,
} from "react-icons/hi";
import { ConfirmDialog } from "../components/ConfirmDialog";
import { PageHeader } from "../components/PageHeader";
import {
  BUILT_IN_CATEGORIES,
  MAX_CATEGORY_NAME_LENGTH,
  TYPE_LABELS,
  validateCategoryName,
} from "../lib/categories";
import { parseTransactionsCsv, transactionsToCsv } from "../lib/csv";
import { downloadFile } from "../lib/download";
import { toISODate } from "../lib/format";
import { parseAppData, serializeAppData } from "../lib/storage";
import { sortTransactions } from "../lib/transactions";
import type { ThemePreference } from "../lib/theme";
import { useAppData } from "../state/useAppData";
import { useThemePreference } from "../state/useThemePreference";
import { useToast } from "../state/useToast";
import {
  TRANSACTION_TYPES,
  type AppData,
  type CustomCategory,
  type TransactionType,
} from "../types/transaction";

export default function Settings() {
  return (
    <>
      <PageHeader title="Settings" />
      <div className="flex flex-col gap-6">
        <AppearanceCard />
        <CategoriesCard />
        <DataCard />
      </div>
    </>
  );
}

function Card({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-lg border border-line bg-surface">
      <div className="border-b border-line px-4 py-4 md:px-6">
        <h2 className="font-semibold">{title}</h2>
        {description && (
          <p className="mt-0.5 text-sm text-muted">{description}</p>
        )}
      </div>
      <div className="px-4 py-4 md:px-6">{children}</div>
    </section>
  );
}

const THEME_OPTIONS: {
  value: ThemePreference;
  label: string;
  icon: typeof HiOutlineSun;
}[] = [
  { value: "system", label: "System", icon: HiOutlineDesktopComputer },
  { value: "light", label: "Light", icon: HiOutlineSun },
  { value: "dark", label: "Dark", icon: HiOutlineMoon },
];

function AppearanceCard() {
  const [preference, setPreference] = useThemePreference();
  return (
    <Card title="Appearance">
      <fieldset>
        <legend className="field-label">Theme</legend>
        <div className="grid grid-cols-3 gap-2">
          {THEME_OPTIONS.map(({ value, label, icon: Icon }) => (
            <label
              key={value}
              className={`flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-md border text-sm font-medium transition-colors has-focus-visible:outline-2 has-focus-visible:outline-brand ${
                preference === value
                  ? "border-brand bg-brand-soft text-brand"
                  : "border-line text-muted hover:border-brand"
              }`}
            >
              <input
                type="radio"
                name="theme"
                value={value}
                checked={preference === value}
                onChange={() => setPreference(value)}
                className="sr-only"
              />
              <Icon aria-hidden size={18} />
              {label}
            </label>
          ))}
        </div>
      </fieldset>
    </Card>
  );
}

function CategoriesCard() {
  return (
    <Card
      title="Categories"
      description="Add your own categories alongside the built-in ones."
    >
      <div className="grid gap-6 md:grid-cols-2">
        {TRANSACTION_TYPES.map((type) => (
          <CategoryList key={type} type={type} />
        ))}
      </div>
    </Card>
  );
}

function CategoryList({ type }: { type: TransactionType }) {
  const { data, addCategory, renameCategory, deleteCategory } = useAppData();
  const { showToast } = useToast();
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [renaming, setRenaming] = useState<CustomCategory | null>(null);
  const [deleting, setDeleting] = useState<CustomCategory | null>(null);
  const inputId = useId();
  const mine = data.categories
    .filter((c) => c.type === type)
    .sort((a, b) => a.name.localeCompare(b.name));
  const builtInCount = BUILT_IN_CATEGORIES[type].reduce(
    (sum, group) => sum + group.categories.length,
    0,
  );

  const onAdd = (event: FormEvent) => {
    event.preventDefault();
    const problem = validateCategoryName(name, type, data.categories);
    setError(problem);
    if (problem) return;
    try {
      addCategory(type, name);
      showToast(`Added ${name.trim()}`);
      setName("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't add the category.");
    }
  };

  const inUse = (category: CustomCategory) =>
    data.transactions.filter(
      (tx) => tx.type === category.type && tx.category === category.name,
    ).length;

  return (
    <div>
      <h3 className="text-sm font-semibold uppercase">{TYPE_LABELS[type]}</h3>
      <p className="mt-0.5 text-xs text-muted">
        {builtInCount} built-in, {mine.length} custom
      </p>

      {mine.length > 0 && (
        <ul className="mt-3 divide-y divide-line rounded-md border border-line">
          {mine.map((category) => (
            <li key={category.id} className="flex items-center gap-2 pl-3">
              <span className="min-w-0 flex-1 text-sm break-words">
                {category.name}
              </span>
              <button
                type="button"
                className="icon-btn"
                onClick={() => setRenaming(category)}
                aria-label={`Rename ${category.name}`}
              >
                <HiOutlinePencil aria-hidden size={18} />
              </button>
              <button
                type="button"
                className="icon-btn hover:bg-expense-soft hover:text-expense"
                onClick={() => setDeleting(category)}
                aria-label={`Delete ${category.name}`}
              >
                <HiOutlineTrash aria-hidden size={18} />
              </button>
            </li>
          ))}
        </ul>
      )}

      <form noValidate onSubmit={onAdd} className="mt-3">
        <label htmlFor={inputId} className="sr-only">
          New {TYPE_LABELS[type].toLowerCase()} category
        </label>
        <div className="flex gap-2">
          <input
            id={inputId}
            value={name}
            maxLength={MAX_CATEGORY_NAME_LENGTH}
            onChange={(event) => {
              setName(event.target.value);
              setError(null);
            }}
            placeholder={`New ${TYPE_LABELS[type].toLowerCase()} category`}
            className="field"
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? `${inputId}-error` : undefined}
          />
          <button type="submit" className="btn-secondary shrink-0 px-3">
            <FiPlus aria-hidden size={18} />
            <span className="sr-only sm:not-sr-only">Add</span>
          </button>
        </div>
        {error && (
          <p id={`${inputId}-error`} className="field-error">
            {error}
          </p>
        )}
      </form>

      <RenameCategoryDialog
        key={renaming?.id ?? "closed"}
        category={renaming}
        onClose={() => setRenaming(null)}
        onRename={(category, next) => {
          renameCategory(category.id, next);
          showToast(`Renamed to ${next.trim()}`);
        }}
        categories={data.categories}
      />
      <ConfirmDialog
        open={deleting !== null}
        title="Delete category"
        confirmLabel="Delete"
        onClose={() => setDeleting(null)}
        onConfirm={() => {
          if (!deleting) return;
          try {
            deleteCategory(deleting.id);
            showToast(`Deleted ${deleting.name}`);
          } catch {
            showToast("Couldn't delete the category.", "error");
          }
          setDeleting(null);
        }}
      >
        {deleting && (
          <p>
            Delete <strong>{deleting.name}</strong>?{" "}
            {inUse(deleting) > 0
              ? `Your ${inUse(deleting)} existing transaction(s) keep this category name.`
              : "No transactions use it."}{" "}
            {type === "expense" &&
              data.budgets.some((b) => b.category === deleting.name) &&
              "Its budget will be removed."}
          </p>
        )}
      </ConfirmDialog>
    </div>
  );
}

function RenameCategoryDialog({
  category,
  categories,
  onClose,
  onRename,
}: {
  category: CustomCategory | null;
  categories: CustomCategory[];
  onClose: () => void;
  onRename: (category: CustomCategory, name: string) => void;
}) {
  // Remounted per category via `key`, so this starts from its current name.
  const [name, setName] = useState(category?.name ?? "");
  const [error, setError] = useState<string | null>(null);

  const submit = () => {
    if (!category) return;
    const problem = validateCategoryName(
      name,
      category.type,
      categories,
      category.id,
    );
    if (problem) {
      setError(problem);
      return;
    }
    try {
      onRename(category, name);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't rename.");
    }
  };

  return (
    <ConfirmDialog
      open={category !== null}
      title="Rename category"
      confirmLabel="Rename"
      tone="primary"
      onClose={onClose}
      onConfirm={submit}
    >
      <form
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          submit();
        }}
      >
        <label htmlFor="rename-category" className="field-label">
          Name
        </label>
        <input
          id="rename-category"
          value={name}
          maxLength={MAX_CATEGORY_NAME_LENGTH}
          onChange={(event) => {
            setName(event.target.value);
            setError(null);
          }}
          className="field"
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? "rename-category-error" : undefined}
        />
        {error && (
          <p id="rename-category-error" className="field-error">
            {error}
          </p>
        )}
        <p className="mt-2 text-xs text-muted">
          Transactions, budgets, and recurring items using it are renamed too.
        </p>
      </form>
    </ConfirmDialog>
  );
}

function DataCard() {
  const { data, replaceData, importTransactions } = useAppData();
  const { showToast } = useToast();
  const backupInput = useRef<HTMLInputElement>(null);
  const csvInput = useRef<HTMLInputElement>(null);
  const [pendingBackup, setPendingBackup] = useState<AppData | null>(null);
  const stamp = toISODate(new Date());

  const exportBackup = () =>
    downloadFile(
      `notedt-backup-${stamp}.json`,
      serializeAppData(data),
      "application/json",
    );

  const exportCsv = () =>
    downloadFile(
      `notedt-transactions-${stamp}.csv`,
      transactionsToCsv(sortTransactions(data.transactions)),
      "text/csv",
    );

  const readFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = ""; // allow picking the same file again
    return file ? file.text() : null;
  };

  const onBackupChosen = async (event: ChangeEvent<HTMLInputElement>) => {
    const text = await readFile(event);
    if (text === null) return;
    let parsed: AppData | null;
    try {
      parsed = parseAppData(JSON.parse(text));
    } catch {
      parsed = null;
    }
    if (!parsed) {
      showToast("That file isn't a Notedt backup.", "error");
      return;
    }
    setPendingBackup(parsed);
  };

  const onCsvChosen = async (event: ChangeEvent<HTMLInputElement>) => {
    const text = await readFile(event);
    if (text === null) return;
    try {
      const { transactions, skipped } = parseTransactionsCsv(text);
      if (transactions.length === 0) {
        showToast(
          skipped.length > 0
            ? `No valid rows found (${skipped.length} skipped, e.g. line ${skipped[0]!.line}: ${skipped[0]!.reason}).`
            : "No transactions found in that file.",
          "error",
        );
        return;
      }
      importTransactions(transactions);
      showToast(
        `Imported ${transactions.length} transaction${transactions.length === 1 ? "" : "s"}` +
          (skipped.length > 0
            ? ` (${skipped.length} skipped, e.g. line ${skipped[0]!.line}: ${skipped[0]!.reason})`
            : ""),
      );
    } catch (error) {
      showToast(
        error instanceof Error ? error.message : "Couldn't read that file.",
        "error",
      );
    }
  };

  return (
    <Card
      title="Your data"
      description="Everything is stored in this browser only. Export a backup to keep it safe or move it to another device."
    >
      <div className="grid gap-6 sm:grid-cols-2">
        <div>
          <h3 className="text-sm font-semibold uppercase">Export</h3>
          <div className="mt-3 flex flex-col gap-2">
            <button
              type="button"
              className="btn-secondary"
              onClick={exportBackup}
            >
              <HiOutlineDownload aria-hidden size={18} />
              Backup (JSON)
            </button>
            <button
              type="button"
              className="btn-secondary"
              onClick={exportCsv}
              disabled={data.transactions.length === 0}
            >
              <HiOutlineDownload aria-hidden size={18} />
              Transactions (CSV)
            </button>
          </div>
        </div>
        <div>
          <h3 className="text-sm font-semibold uppercase">Import</h3>
          <div className="mt-3 flex flex-col gap-2">
            <button
              type="button"
              className="btn-secondary"
              onClick={() => backupInput.current?.click()}
            >
              <HiOutlineUpload aria-hidden size={18} />
              Restore backup
            </button>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => csvInput.current?.click()}
            >
              <HiOutlineUpload aria-hidden size={18} />
              Add from CSV
            </button>
          </div>
          <p className="mt-2 text-xs text-muted">
            CSV columns: date (YYYY-MM-DD), type (income/expense), category,
            amount, description (optional).
          </p>
        </div>
      </div>

      <input
        ref={backupInput}
        type="file"
        accept="application/json,.json"
        className="hidden"
        aria-label="Backup file"
        onChange={onBackupChosen}
      />
      <input
        ref={csvInput}
        type="file"
        accept="text/csv,.csv"
        className="hidden"
        aria-label="CSV file"
        onChange={onCsvChosen}
      />

      <ConfirmDialog
        open={pendingBackup !== null}
        title="Restore backup"
        confirmLabel="Replace my data"
        onClose={() => setPendingBackup(null)}
        onConfirm={() => {
          if (!pendingBackup) return;
          try {
            replaceData(pendingBackup);
            showToast("Backup restored");
          } catch {
            showToast("Couldn't restore the backup.", "error");
          }
          setPendingBackup(null);
        }}
      >
        {pendingBackup && (
          <p>
            This replaces everything in this browser ({data.transactions.length}{" "}
            transactions) with the backup ({pendingBackup.transactions.length}{" "}
            transactions, {pendingBackup.budgets.length} budgets,{" "}
            {pendingBackup.recurring.length} recurring). Export a backup first
            if you might want your current data back.
          </p>
        )}
      </ConfirmDialog>
    </Card>
  );
}
