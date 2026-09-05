import { Link, Route, Routes } from "react-router-dom";

import {
  questionBankFingerprint,
  resolveRuntimeQuestionBank,
  type RuntimeQuestionBank,
} from "../content/runtimeQuestionBank";
import { AboutPage } from "../pages/AboutPage";
import { PrivacyPage } from "../pages/PrivacyPage";
import { QuizPage } from "../pages/QuizPage";
import { RulesPage } from "../pages/RulesPage";
import { SettingsPage } from "../pages/SettingsPage";

function QuizRoute({ questionBank }: { questionBank: RuntimeQuestionBank }) {
  if (!questionBank.available) {
    const invalid = questionBank.reason === "invalid";
    return (
      <section
        className="content-page"
        aria-labelledby="quiz-unavailable-title"
      >
        <h1 id="quiz-unavailable-title">
          {invalid ? "問題を読み込めませんでした" : "問題を準備しています"}
        </h1>
        <p>
          {invalid
            ? "問題データを安全に確認できなかったため、出題を停止しています。"
            : "監修済みの問題がそろうまで、点数計算の腕試しは公開していません。"}
        </p>
        <p>
          {invalid
            ? "ページを再読み込みしてください。解消しない場合は、時間を置いてお試しください。"
            : "しばらくしてから、もう一度お試しください。"}
        </p>
      </section>
    );
  }

  return (
    <QuizPage
      questions={questionBank.value.playableQuestions}
      bankFingerprint={questionBankFingerprint(questionBank.value.bank)}
    />
  );
}

function AppShell({ questionBank }: { questionBank: RuntimeQuestionBank }) {
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
          <Route path="/" element={<QuizRoute questionBank={questionBank} />} />
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

export function App({
  questionBank = resolveRuntimeQuestionBank(),
}: {
  questionBank?: RuntimeQuestionBank;
}) {
  return <AppShell questionBank={questionBank} />;
}
