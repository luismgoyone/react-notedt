import { useState } from "react";
import { Outlet } from "react-router";
import { Footer } from "./Footer";
import { BottomNav, Sidebar } from "./Navigation";
import { Topnav } from "./Topnav";
import { TransactionFormModal } from "./TransactionFormModal";

export interface LayoutContext {
  openAddTransaction: () => void;
}

export function AppLayout() {
  const [addOpen, setAddOpen] = useState(false);
  const context: LayoutContext = { openAddTransaction: () => setAddOpen(true) };

  return (
    <div className="flex min-h-dvh">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col pb-[calc(4.25rem+env(safe-area-inset-bottom))] md:pb-0">
        <Topnav onAddTransaction={context.openAddTransaction} />
        <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6 md:px-8">
          <Outlet context={context} />
        </main>
        <Footer />
      </div>
      <BottomNav />
      <TransactionFormModal open={addOpen} onClose={() => setAddOpen(false)} />
    </div>
  );
}
