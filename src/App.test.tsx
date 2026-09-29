import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import App from "./App";
import { STORAGE_KEY, loadTransactions } from "./lib/storage";

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

    // Delete
    await user.click(
      screen.getByRole("button", { name: /^Delete Water Bill/ }),
    );
    const confirm = screen.getByRole("dialog", { name: "Delete transaction" });
    await user.click(within(confirm).getByRole("button", { name: "Delete" }));

    expect(rows()).toHaveLength(1);
    expect(savings()).toHaveTextContent("1,500.25");
    expect(loadTransactions()).toHaveLength(1);
  });

  it("keeps the transaction when delete is cancelled", async () => {
    const user = renderApp();
    await addTransaction(user, { category: "Rentals", amount: "100" });
    await user.click(screen.getByRole("button", { name: /^Delete Rentals/ }));
    await user.click(
      within(
        screen.getByRole("dialog", { name: "Delete transaction" }),
      ).getByRole("button", { name: "Cancel" }),
    );
    expect(rows()).toHaveLength(1);
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
  it("shows totals and a per-category breakdown", async () => {
    const user = renderApp("/");
    expect(screen.getByText("No transactions")).toBeInTheDocument();

    await addTransaction(user, {
      type: "Income",
      category: "Salary",
      amount: "1000",
    });
    await addTransaction(user, { category: "Rentals", amount: "200" });
    await addTransaction(user, { category: "Rentals", amount: "100" });

    expect(screen.getByRole("tab", { name: "Income" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    await user.click(screen.getByRole("tab", { name: "Expenses" }));
    const panel = screen.getByRole("tabpanel", { name: "Expenses" });
    expect(within(panel).getByText("Rentals")).toBeInTheDocument();
    expect(within(panel).getByText("₱300.00")).toBeInTheDocument();
  });
});
