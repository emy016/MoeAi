"use client";
/**
 * Quizzes
 *
 * Converted from reference/legacy-html/quizzes.html by scripts/port-legacy.py.
 * The markup below is that file's <body>, translated HTML -> JSX structurally.
 * The styling lives in ./legacy.css, copied byte-for-byte from its <style>
 * block, and the behaviour lives in /legacy/quizzes.js, copied byte-for-byte
 * from its <script> block.
 *
 * Do not restyle this by hand. If it looks wrong, diff it against the original.
 */
import { legacyHandler, useLegacyScripts } from "@/lib/legacy";
import "./legacy.css";

const STYLESHEETS: string[] = [
  "https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap",
  "https://fonts.googleapis.com/css2?family=Fira+Code:wght@400;500;600&display=swap",
  "https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css"
];
const SCRIPTS: string[] = [
  "https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.js",
  "https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/contrib/auto-render.min.js"
];

export default function Quizzes() {
  useLegacyScripts(STYLESHEETS, SCRIPTS, "/legacy/quizzes.js");

  return (
    <>
      <div className="crt-overlay" id="crtOverlay">
      </div>
      <div className="topbar">
        <a className="brand" href="#">
          <div className="brand-mark">
            <i className="ic" data-ic="clipboard">
            </i>
          </div>
          EDUMOE
          <small>
            · Quizzes
          </small>
        </a>
        <div className="topbar-right">
          <div className="theme-switcher">
            <button className="theme-dot td-ruby active" id="td-ruby" onClick={legacyHandler("setTheme('ruby',this)")}>
            </button>
            <button className="theme-dot td-lava" id="td-lava" onClick={legacyHandler("setTheme('lava',this)")}>
            </button>
            <button className="theme-dot td-space" id="td-space" onClick={legacyHandler("setTheme('space',this)")}>
            </button>
            <button className="theme-dot td-oxford" id="td-oxford" onClick={legacyHandler("setTheme('oxford',this)")}>
            </button>
            <button className="theme-dot td-gray" id="td-gray" onClick={legacyHandler("setTheme('gray',this)")}>
            </button>
            <button className="theme-dot td-light" id="td-light" onClick={legacyHandler("setTheme('light',this)")}>
            </button>
            <div className="custom-color-wrap" id="customColorWrap">
              <input type="color" id="customColorPicker" value="#e11d48" />
            </div>
            <button className="theme-dot td-terminal" id="td-terminal" onClick={legacyHandler("setTheme('terminal',this)")}>
            </button>
          </div>
          <button className="crt-toggle" id="crtToggle" onClick={legacyHandler("toggleCRT()")}>
            <i className="ic" data-ic="tv">
            </i>
          </button>
          <a href="/" className="btn-back">
            <i className="ic" data-ic="arrow-left">
            </i>
            <span>
              Back
            </span>
          </a>
        </div>
      </div>
      <div className="wrap">
        <div className="page-head">
          <h1>
            <i className="ic" data-ic="clipboard">
            </i>
            Ultimate Quizzes
          </h1>
          <p>
            350+ curriculum‑aligned questions across 8 subjects — with proper math rendering, study modes, and analytics.
          </p>
          <div className="kbd-hint">
            <kbd>
              1-4
            </kbd>
            answer ·
            <kbd>
              Enter
            </kbd>
            next ·
            <kbd>
              B
            </kbd>
            bookmark ·
            <kbd>
              Esc
            </kbd>
            quit
          </div>
          <div className="stats-row" id="statsRow">
            <div className="stat-pill">
              📚
              <span className="num" id="totalQuizzes">
                8
              </span>
              subjects
            </div>
            <div className="stat-pill">
              📝
              <span className="num" id="totalQuestions">
                0
              </span>
              questions
            </div>
            <div className="stat-pill">
              ✅
              <span className="num" id="passedCount">
                0
              </span>
              passed
            </div>
            <div className="stat-pill">
              🔥
              <span className="num" id="bestStreak">
                0
              </span>
              best streak
            </div>
            <div className="stat-pill">
              ⭐
              <span className="num" id="bookmarkCount">
                0
              </span>
              bookmarks
            </div>
          </div>
        </div>
        <div className="tabs" id="modeTabs">
          <button className="mode-tab active" data-mode="browse">
            <i className="ic" data-ic="list">
            </i>
            Browse
          </button>
          <button className="mode-tab" data-mode="quick">
            <i className="ic" data-ic="zap">
            </i>
            Quick
          </button>
          <button className="mode-tab" data-mode="exam">
            <i className="ic" data-ic="clock">
            </i>
            Exam
            <span className="badge">
              Timed
            </span>
          </button>
          <button className="mode-tab" data-mode="bookmarks">
            <i className="ic" data-ic="book">
            </i>
            Bookmarks
            <span className="badge" id="bookmarkBadge">
              0
            </span>
          </button>
          <button className="mode-tab" data-mode="analytics">
            <i className="ic" data-ic="fire">
            </i>
            Analytics
          </button>
          <button className="mode-tab" data-mode="history">
            <i className="ic" data-ic="clock">
            </i>
            History
          </button>
        </div>
        <div className="view active" id="browseView">
          <div className="quiz-grid" id="quizGrid">
          </div>
        </div>
        <div className="view" id="quickView">
          <div className="qp-setup" id="quickSetup">
          </div>
        </div>
        <div className="view" id="examView">
          <div className="qp-setup" id="examSetup">
          </div>
        </div>
        <div className="view" id="bookmarksView">
          <div id="bookmarksList">
          </div>
        </div>
        <div className="view" id="analyticsView">
          <div id="analyticsContainer">
          </div>
        </div>
        <div className="view" id="historyView">
          <div className="history-section" id="historyList">
          </div>
        </div>
        <div id="runnerContainer" style={{"display": "none"}}>
        </div>
        <div id="resultsContainer" style={{"display": "none"}}>
        </div>
      </div>
      <div className="toast" id="toast">
        <span id="toastMsg">
        </span>
      </div>
    </>
  );
}
