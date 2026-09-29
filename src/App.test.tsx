import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import App from "./App";
import { toISODate } from "./lib/format";
import { addMonths, currentMonthKey, formatMonth } from "./lib/month";
import { STORAGE_KEY, loadAppData } from "./lib/storage";

const loadTransactions = () => loadAppData().transactions;

function renderApp(path = "/transactions") {
  const user = userEvent.setup();
  render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>,
  );
  return user;
}

/** The top bar's button; empty states render a second one. */
function openAddDialog(user: ReturnType<typeof userEvent.setup>) {
  const [topBar] = screen.getAllByRole("banner");
  return user.click(
    within(topBar!).getByRole("button", { name: "Add transaction" }),
  );
}

async function addTransaction(
  user: ReturnType<typeof userEvent.setup>,
  values: {
    type?: "Income" | "Expense";
    category: string;
    amount: string;
    description?: string;
    date?: string;
  },
) {
  await openAddDialog(user);
  const dialog = screen.getByRole("dialog", { name: "Add transaction" });
  const form = within(dialog);
  if (values.type) await user.click(form.getByLabelText(values.type));
  await user.selectOptions(form.getByLabelText("Category"), values.category);
  if (values.date) {
    await user.clear(form.getByLabelText("Date"));
    await user.type(form.getByLabelText("Date"), values.date);
  }
  await user.type(form.getByLabelText("Amount (PHP)"), values.amount);
  if (values.description) {
    await user.type(form.getByLabelText(/Description/), values.description);
  }
  await user.click(form.getByRole("button", { name: "Save" }));
}

/** A date in the previous month (the 15th, so it's valid in every month). */
const lastMonthDate = () => `${addMonths(currentMonthKey(), -1)}-15`;

const savings = () => screen.getByTestId("savings");
const rows = () => within(screen.getByRole("list")).getAllByRole("listitem");

describe("transactions CRUD", () => {
  it("creates, reads, updates and deletes a transaction", async () => {
    const user = renderApp();
    expect(screen.getByText("No transactions")).toBeInTheDocument();

    // Create
    await addTransaction(user, {
      type: "Income",
      category: "Salary",
      amount: "1500.25",
      description: "September pay",
    });
    await addTransaction(user, { category: "Water Bill", amount: "250" });

    expect(screen.getAllByRole("status")[0]).toHaveTextContent(
      "Transaction added",
    );
    expect(rows()).toHaveLength(2);
    expect(savings()).toHaveTextContent("1,250.25");

    // Read (persisted)
    expect(loadTransactions()).toHaveLength(2);

    // Update
    await user.click(screen.getByRole("button", { name: /^Edit Water Bill/ }));
    const editDialog = screen.getByRole("dialog", { name: "Edit transaction" });
    const amount = within(editDialog).getByLabelText("Amount (PHP)");
    expect(amount).toHaveValue(250);
    await user.clear(amount);
    await user.type(amount, "300");
    await user.click(
      within(editDialog).getByRole("button", { name: "Save changes" }),
    );

    expect(savings()).toHaveTextContent("1,200.25");
    expect(
      loadTransactions().find((tx) => tx.category === "Water Bill")?.amount,
    ).toBe(300);

    // Delete, then undo, then delete for good
    await user.click(
      screen.getByRole("button", { name: /^Delete Water Bill/ }),
    );
    expect(rows()).toHaveLength(1);
    expect(savings()).toHaveTextContent("1,500.25");
    expect(loadTransactions()).toHaveLength(1);

    await user.click(screen.getByRole("button", { name: "Undo" }));
    expect(rows()).toHaveLength(2);
    expect(loadTransactions()).toHaveLength(2);

    await user.click(
      screen.getByRole("button", { name: /^Delete Water Bill/ }),
    );
    expect(loadTransactions()).toHaveLength(1);
  });

  it("validates required fields and amounts", async () => {
    const user = renderApp();
    await openAddDialog(user);
    const dialog = screen.getByRole("dialog", { name: "Add transaction" });
    await user.click(within(dialog).getByRole("button", { name: "Save" }));

    expect(within(dialog).getByText("Choose a category.")).toBeInTheDocument();
    expect(within(dialog).getByText("Enter an amount.")).toBeInTheDocument();

    await user.type(within(dialog).getByLabelText("Amount (PHP)"), "10.555");
    await user.click(within(dialog).getByRole("button", { name: "Save" }));
    expect(
      within(dialog).getByText("Use at most 2 decimal places."),
    ).toBeInTheDocument();
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
  });

  it("switches category options when the type changes", async () => {
    const user = renderApp();
    await openAddDialog(user);
    const dialog = within(
      screen.getByRole("dialog", { name: "Add transaction" }),
    );
    const category = dialog.getByLabelText("Category");
    expect(
      within(category).queryByRole("option", { name: "Salary" }),
    ).toBeNull();

    await user.selectOptions(category, "Rentals");
    await user.click(dialog.getByLabelText("Income"));

    expect(category).toHaveValue("");
    expect(
      within(category).getByRole("option", { name: "Salary" }),
    ).toBeInTheDocument();
  });
});

describe("search and filters", () => {
  it("narrows the list and can be cleared", async () => {
    const user = renderApp();
    await addTransaction(user, {
      type: "Income",
      category: "Salary",
      amount: "1000",
    });
    await addTransaction(user, {
      category: "Phone Bill",
      amount: "50",
      description: "Globe",
    });

    await user.type(
      screen.getByRole("searchbox", { name: "Search transactions" }),
      "globe",
    );
    expect(rows()).toHaveLength(1);
    expect(screen.getByText("Showing 1 of 2 transactions")).toBeInTheDocument();

    await user.click(
      screen.getByRole("button", { name: "Clear search & filters" }),
    );
    expect(rows()).toHaveLength(2);

    await user.click(screen.getByRole("button", { name: "Filters" }));
    const filters = within(screen.getByRole("dialog", { name: "Filters" }));
    await user.click(filters.getByLabelText("Expense"));
    await user.click(filters.getByRole("button", { name: "Apply" }));

    expect(rows()).toHaveLength(1);
    expect(
      screen.getByRole("button", { name: "Filters (1 active)" }),
    ).toBeInTheDocument();
  });

  it("rejects an inverted amount range", async () => {
    const user = renderApp();
    await addTransaction(user, { category: "Rentals", amount: "100" });
    await user.click(screen.getByRole("button", { name: "Filters" }));
    const filters = within(screen.getByRole("dialog", { name: "Filters" }));
    await user.type(filters.getByLabelText("Min"), "100");
    await user.type(filters.getByLabelText("Max"), "50");
    await user.click(filters.getByRole("button", { name: "Apply" }));
    expect(filters.getByText("Max is less than min.")).toBeInTheDocument();
  });
});

describe("overview", () => {
  it("shows this month's totals, breakdown, and navigates months", async () => {
    const user = renderApp("/");
    expect(screen.getByText("No transactions")).toBeInTheDocument();

    await addTransaction(user, {
      type: "Income",
      category: "Salary",
      amount: "1000",
    });
    await addTransaction(user, { category: "Rentals", amount: "200" });
    await addTransaction(user, { category: "Rentals", amount: "100" });
    await addTransaction(user, {
      category: "Water Bill",
      amount: "999",
      date: lastMonthDate(),
    });

    expect(
      screen.getByRole("heading", { name: formatMonth(currentMonthKey()) }),
    ).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Expenses" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    const panel = screen.getByRole("tabpanel", { name: "Expenses" });
    expect(within(panel).getByText("Rentals")).toBeInTheDocument();
    expect(within(panel).getByText("₱300.00")).toBeInTheDocument();
    expect(within(panel).queryByText("Water Bill")).toBeNull();
    expect(screen.getByText(/70% vs/)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Previous month" }));
    expect(
      within(screen.getByRole("tabpanel", { name: "Expenses" })).getByText(
        "Water Bill",
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Previous month" }),
    ).toBeDisabled();

    await user.click(
      screen.getByRole("button", { name: "Back to this month" }),
    );
    expect(
      screen.getByRole("heading", { name: formatMonth(currentMonthKey()) }),
    ).toBeInTheDocument();
  });
});

describe("plan", () => {
  it("tracks a budget against this month's spending", async () => {
    const user = renderApp("/plan");
    await user.click(screen.getByRole("button", { name: "Add budget" }));
    const dialog = within(screen.getByRole("dialog", { name: "Add budget" }));
    await user.selectOptions(
      dialog.getByLabelText("Expense category"),
      "Rentals",
    );
    await user.type(dialog.getByLabelText("Monthly limit (PHP)"), "500");
    await user.click(dialog.getByRole("button", { name: "Save" }));
    expect(screen.getByText("Rentals")).toBeInTheDocument();

    await addTransaction(user, { category: "Rentals", amount: "650" });
    await user.click(screen.getAllByRole("link", { name: "Overview" })[0]!);

    expect(
      screen.getByRole("progressbar", { name: "Rentals budget used" }),
    ).toHaveAttribute("aria-valuenow", "100");
    expect(screen.getByText("Over by ₱150.00")).toBeInTheDocument();
  });

  it("creates recurring transactions when they're due", async () => {
    const user = renderApp("/plan");
    await user.click(screen.getByRole("button", { name: "Add recurring" }));
    const dialog = within(
      screen.getByRole("dialog", { name: "Add recurring" }),
    );
    await user.selectOptions(dialog.getByLabelText("Category"), "Rentals");
    await user.type(dialog.getByLabelText("Amount (PHP)"), "12000");
    // Defaults: today's day of the month, starting today, so it's due now.
    await user.click(dialog.getByRole("button", { name: "Save" }));

    expect(screen.getByText(/Next: /)).toBeInTheDocument();
    const [created] = loadTransactions();
    expect(created).toMatchObject({
      category: "Rentals",
      amount: 12000,
      date: toISODate(new Date()),
    });

    await user.click(screen.getByRole("button", { name: "Pause Rentals" }));
    expect(screen.getByText(/Paused/)).toBeInTheDocument();

    await user.click(screen.getAllByRole("link", { name: "Transactions" })[0]!);
    expect(within(rows()[0]!).getByText("Recurring")).toBeInTheDocument();
  });
});

describe("settings", () => {
  it("adds, renames and uses a custom category", async () => {
    const user = renderApp("/settings");
    const input = screen.getByLabelText("New expense category");
    await user.type(input, "Pets");
    await user.click(
      within(input.closest("form")!).getByRole("button", { name: "Add" }),
    );
    expect(screen.getByText("Pets")).toBeInTheDocument();

    await user.type(input, "rentals");
    await user.click(
      within(input.closest("form")!).getByRole("button", { name: "Add" }),
    );
    expect(
      screen.getByText("A category with that name already exists."),
    ).toBeInTheDocument();

    await addTransaction(user, { category: "Pets", amount: "300" });
    await user.click(screen.getByRole("button", { name: "Rename Pets" }));
    const dialog = within(
      screen.getByRole("dialog", { name: "Rename category" }),
    );
    await user.clear(dialog.getByLabelText("Name"));
    await user.type(dialog.getByLabelText("Name"), "Pet care");
    await user.click(dialog.getByRole("button", { name: "Rename" }));

    expect(loadAppData().categories[0]!.name).toBe("Pet care");
    expect(loadTransactions()[0]!.category).toBe("Pet care");
  });

  it("switches the theme", async () => {
    const user = renderApp("/settings");
    await user.click(screen.getByLabelText("Dark"));
    expect(document.documentElement.dataset.theme).toBe("dark");
    expect(localStorage.getItem("notedt:theme")).toBe("dark");
    await user.click(screen.getByLabelText("Light"));
    expect(document.documentElement.dataset.theme).toBe("light");
  });

  it("imports transactions from CSV", async () => {
    const user = renderApp("/settings");
    const csv = [
      "date,type,category,amount,description",
      "2026-09-01,income,Salary,45000,Pay",
      "2026-09-02,expense,Rentals,12000,",
      "bad,expense,Rentals,1,",
    ].join("\n");
    await user.upload(
      screen.getByLabelText("CSV file"),
      new File([csv], "export.csv", { type: "text/csv" }),
    );
    expect(
      await screen.findByText(/Imported 2 transactions \(1 skipped/),
    ).toBeInTheDocument();
    expect(loadTransactions()).toHaveLength(2);
  });

  it("restores a backup after confirmation", async () => {
    const user = renderApp("/settings");
    const backup = {
      version: 2,
      transactions: [
        {
          id: "b1",
          type: "expense",
          category: "Loan",
          amount: 5000,
          date: "2026-01-15",
          description: "",
          createdAt: "2026-01-15T00:00:00.000Z",
          updatedAt: "2026-01-15T00:00:00.000Z",
        },
      ],
      categories: [],
      budgets: [{ category: "Loan", limit: 6000 }],
      recurring: [],
    };
    await user.upload(
      screen.getByLabelText("Backup file"),
      new File([JSON.stringify(backup)], "backup.json", {
        type: "application/json",
      }),
    );
    const dialog = within(
      await screen.findByRole("dialog", { name: "Restore backup" }),
    );
    await user.click(dialog.getByRole("button", { name: "Replace my data" }));

    expect(loadAppData()).toMatchObject({
      transactions: [{ id: "b1" }],
      budgets: [{ category: "Loan", limit: 6000 }],
    });
  });

  it("rejects files that aren't backups", async () => {
    const user = renderApp("/settings");
    await user.upload(
      screen.getByLabelText("Backup file"),
      new File(['{"hello":1}'], "nope.json", { type: "application/json" }),
    );
    expect(
      await screen.findByText("That file isn't a Notedt backup."),
    ).toBeInTheDocument();
  });
});
