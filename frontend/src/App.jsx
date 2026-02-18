import { Navigate, Route, Routes } from "react-router-dom";
import { useState } from "react";
import Sidebar from "./components/Sidebar";
import LoginPage from "./pages/LoginPage";
import DashboardPage from "./pages/DashboardPage";
import UploadPage from "./pages/UploadPage";
import QueryPage from "./pages/QueryPage";
import LinkAnalysisPage from "./pages/LinkAnalysisPage";
import ReportsPage from "./pages/ReportsPage";

function App() {
  const [officer, setOfficer] = useState(() => localStorage.getItem("ufdr_officer") || "");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  if (!officer) {
    return <LoginPage onLogin={(name) => {
      localStorage.setItem("ufdr_officer", name);
      setOfficer(name);
    }} />;
  }

  return (
    <div className={`app-shell ${sidebarOpen ? "sidebar-open" : ""}`}>
      <button
        type="button"
        className="mobile-nav-toggle"
        onClick={() => setSidebarOpen((prev) => !prev)}
        aria-label="Toggle navigation"
      >
        {sidebarOpen ? "Close" : "Menu"}
      </button>

      {sidebarOpen && <div className="sidebar-scrim" onClick={() => setSidebarOpen(false)} />}

      <Sidebar
        officer={officer}
        onClose={() => setSidebarOpen(false)}
        onLogout={() => {
          localStorage.removeItem("ufdr_officer");
          setOfficer("");
        }}
      />
      <main className="content-shell">
        <Routes>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/upload" element={<UploadPage />} />
          <Route path="/query" element={<QueryPage />} />
          <Route path="/links" element={<LinkAnalysisPage />} />
          <Route path="/reports" element={<ReportsPage officer={officer} />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </main>
    </div>
  );
}

export default App;
