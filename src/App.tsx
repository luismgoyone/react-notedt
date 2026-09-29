import { Navigate, Route, Routes } from "react-router";
import { AppLayout } from "./components/AppLayout";
import Overview from "./pages/Overview";
import Transactions from "./pages/Transactions";
import { ToastProvider } from "./state/ToastProvider";
import { TransactionsProvider } from "./state/TransactionsProvider";

export default function App() {
  return (
    <ToastProvider>
      <TransactionsProvider>
        <Routes>
          <Route element={<AppLayout />}>
            <Route index element={<Overview />} />
            <Route path="transactions" element={<Transactions />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </TransactionsProvider>
    </ToastProvider>
  );
}
