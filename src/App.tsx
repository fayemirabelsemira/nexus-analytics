import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import AppLayout from './layouts/AppLayout';
import AccountPage from './pages/AccountPage';
import AnalyticsPage from './pages/AnalyticsPage';
import CleaningPage from './pages/CleaningPage';
import DashboardPage from './pages/DashboardPage';
import ExportPage from './pages/ExportPage';
import HistoryPage from './pages/HistoryPage';
import PreviewPage from './pages/PreviewPage';
import ReportsPage from './pages/ReportsPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import SavedDatasetsPage from './pages/SavedDatasetsPage';
import SavedReportsPage from './pages/SavedReportsPage';
import UploadPage from './pages/UploadPage';
import VisualizationsPage from './pages/VisualizationsPage';

// Every analytics route is public (Guest Mode). Account pages show a log-in prompt instead of redirecting,
// so a guest's in-memory dataset is never lost by navigating.
export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppLayout />}>
          <Route index element={<DashboardPage />} />
          <Route path="upload" element={<UploadPage />} />
          <Route path="preview" element={<PreviewPage />} />
          <Route path="cleaning" element={<CleaningPage />} />
          <Route path="analytics" element={<AnalyticsPage />} />
          <Route path="visualizations" element={<VisualizationsPage />} />
          <Route path="reports" element={<ReportsPage />} />
          <Route path="export" element={<ExportPage />} />
          <Route path="datasets" element={<SavedDatasetsPage />} />
          <Route path="history" element={<HistoryPage />} />
          <Route path="saved-reports" element={<SavedReportsPage />} />
          <Route path="account" element={<AccountPage />} />
          <Route path="reset-password" element={<ResetPasswordPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
