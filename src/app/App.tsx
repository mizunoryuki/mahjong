import { Link, Route, Routes } from "react-router-dom";

import { AboutPage } from "../pages/AboutPage";
import { PrivacyPage } from "../pages/PrivacyPage";
import { QuizPage } from "../pages/QuizPage";
import { RulesPage } from "../pages/RulesPage";
import { SettingsPage } from "../pages/SettingsPage";

function AppShell() {
  return (
    <div className="app-shell">
      <header className="site-header">
        <Link className="brand" to="/">
          この手、何点？
        </Link>
        <Link to="/rules">ルール</Link>
      </header>

      <main id="main-content">
        <Routes>
          <Route path="/" element={<QuizPage />} />
          <Route path="/rules" element={<RulesPage />} />
          <Route path="/privacy" element={<PrivacyPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/about" element={<AboutPage />} />
        </Routes>
      </main>

      <footer className="site-footer">
        <span>四人打ち・本場なし</span>
        <nav aria-label="補助メニュー">
          <Link to="/settings">記録と設定</Link>
          <Link to="/privacy">プライバシー</Link>
          <Link to="/about">このサービスについて</Link>
        </nav>
      </footer>
    </div>
  );
}

export function App() {
  return <AppShell />;
}
