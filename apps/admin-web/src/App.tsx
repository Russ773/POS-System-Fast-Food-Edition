import { Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "./auth/AuthContext";
import { AppLayout } from "./components/AppLayout";
import { LoginPage } from "./pages/LoginPage";
import { MenuPage } from "./pages/MenuPage";
import { InventoryPage } from "./pages/InventoryPage";
import { EmployeesPage } from "./pages/EmployeesPage";
import { ShiftsPage } from "./pages/ShiftsPage";
import { ReportingPage } from "./pages/ReportingPage";
import { SettingsPage } from "./pages/SettingsPage";

export function App() {
  const { token } = useAuth();

  if (!token) {
    return (
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    );
  }

  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route path="/menu" element={<MenuPage />} />
        <Route path="/inventory" element={<InventoryPage />} />
        <Route path="/employees" element={<EmployeesPage />} />
        <Route path="/shifts" element={<ShiftsPage />} />
        <Route path="/reporting" element={<ReportingPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="*" element={<Navigate to="/menu" replace />} />
      </Route>
    </Routes>
  );
}
