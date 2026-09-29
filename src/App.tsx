import { Navigate, Route, Routes } from "react-router";
import { AppLayout } from "./components/AppLayout";
import Overview from "./pages/Overview";
import Plan from "./pages/Plan";
import Settings from "./pages/Settings";
import Transactions from "./pages/Transactions";
import { ToastProvider } from "./state/ToastProvider";
import { AppDataProvider } from "./state/AppDataProvider";

export default function App() {
  return (
    <ToastProvider>
      <AppDataProvider>
        <Routes>
          <Route element={<AppLayout />}>
            <Route index element={<Overview />} />
            <Route path="transactions" element={<Transactions />} />
            <Route path="plan" element={<Plan />} />
            <Route path="settings" element={<Settings />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </AppDataProvider>
    </ToastProvider>
  );
}
