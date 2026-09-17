"use client";
/**
 * Dashboard
 *
 * Converted from reference/legacy-html/dashboard.html by scripts/port-legacy.py.
 * The markup below is that file's <body>, translated HTML -> JSX structurally.
 * The styling lives in ./legacy.css, copied byte-for-byte from its <style>
 * block, and the behaviour lives in /legacy/dashboard.js, copied byte-for-byte
 * from its <script> block.
 *
 * Do not restyle this by hand. If it looks wrong, diff it against the original.
 */
import { legacyHandler, useLegacyScripts } from "@/lib/legacy";
import "./legacy.css";

const STYLESHEETS: string[] = [
  "https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap",
  "https://fonts.googleapis.com/css2?family=Fira+Code:wght@400;500;600&display=swap"
];
const SCRIPTS: string[] = [];

export default function Dashboard() {
  useLegacyScripts(STYLESHEETS, SCRIPTS, "/legacy/dashboard.js");

  return (
    <>
      <div className="crt-overlay" id="crtOverlay">
      </div>
      {/* ─── TOP BAR ────────────────────────────────────────────────── */}
      <div className="topbar">
        <a className="brand" href="#">
          <div className="brand-mark">
            <i className="ic" data-ic="graduation-cap">
            </i>
          </div>
          EDUMOE
          <small>
            · Dashboard
          </small>
        </a>
        <div className="topbar-right">
          <div className="theme-switcher">
            <button className="theme-dot td-ruby active" id="td-ruby" onClick={legacyHandler("setTheme('ruby', this)")}>
            </button>
            <button className="theme-dot td-lava" id="td-lava" onClick={legacyHandler("setTheme('lava', this)")}>
            </button>
            <button className="theme-dot td-space" id="td-space" onClick={legacyHandler("setTheme('space', this)")}>
            </button>
            <button className="theme-dot td-oxford" id="td-oxford" onClick={legacyHandler("setTheme('oxford', this)")}>
            </button>
            <button className="theme-dot td-gray" id="td-gray" onClick={legacyHandler("setTheme('gray', this)")}>
            </button>
            <button className="theme-dot td-light" id="td-light" onClick={legacyHandler("setTheme('light', this)")}>
            </button>
            <div className="custom-color-wrap" id="customColorWrap">
              <input type="color" id="customColorPicker" value="#e11d48" />
            </div>
            <button className="theme-dot td-terminal" id="td-terminal" onClick={legacyHandler("setTheme('terminal', this)")}>
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
              Logout
            </span>
          </a>
        </div>
      </div>
      {/* ─── CONTENT ────────────────────────────────────────────────── */}
      <div className="wrap">
        <div className="page-head">
          <div className="greeting">
            <span>
              👋 Good morning, Ahmed
            </span>
            <span style={{"fontSize": "14px", "fontWeight": "600", "color": "var(--accent2)", "fontFamily": "'Fira Code',monospace"}}>
              🔥 14d streak
            </span>
          </div>
          <div className="sub-greeting">
            You have 2 lectures today. Keep your streak alive!
          </div>
          <div className="stats-row">
            <div className="stat-pill">
              📚
              <span className="num">
                8
              </span>
              courses
            </div>
            <div className="stat-pill">
              📝
              <span className="num">
                23
              </span>
              lectures done
            </div>
            <div className="stat-pill">
              ⭐
              <span className="num">
                1,240
              </span>
              XP
            </div>
            <div className="stat-pill">
              🏆
              <span className="num">
                4
              </span>
              achievements
            </div>
          </div>
        </div>
        <div className="dash-grid">
          {/* ─── LEFT COLUMN ────────────────────────────────────────── */}
          <div>
            {/* Today's Focus */}
            <div className="dash-card lg lg-card" style={{"marginBottom": "20px"}}>
              <div className="lg-effect">
              </div>
              <div className="lg-tint">
              </div>
              <div className="lg-shine">
              </div>
              <div className="card-header">
                <h4>
                  <i className="ic" data-ic="calendar">
                  </i>
                  Today's Focus
                </h4>
                <span className="badge ok">
                  Priority
                </span>
              </div>
              <div className="focus-card" onClick={legacyHandler("showToast('\ud83d\udcda Opening Differential Equations lecture...')")}>
                <div className="focus-subject">
                  Differential Equations · Term 2
                </div>
                <div className="focus-title">
                  Lecture 3: Separable Equations
                </div>
                <div className="focus-meta">
                  <span>
                    ⏱️ 24:10
                  </span>
                  <span>
                    📊 60% done
                  </span>
                </div>
                <div className="focus-progress">
                  <div className="fill" style={{"width": "60%"}}>
                  </div>
                </div>
                <div className="focus-actions">
                  <button className="btn btn-primary btn-sm" onClick={legacyHandler("showToast('\ud83d\udcda Opening lecture...')")}>
                    <i className="ic" data-ic="play">
                    </i>
                    Continue Learning
                  </button>
                  <button className="btn btn-sm" onClick={legacyHandler("showToast('\ud83d\udcdd Quiz generated from this lecture')")}>
                    <i className="ic" data-ic="check">
                    </i>
                    Practice
                  </button>
                </div>
              </div>
            </div>
            {/* Course Progress */}
            <div className="dash-card lg lg-card" style={{"marginBottom": "20px"}}>
              <div className="lg-effect">
              </div>
              <div className="lg-tint">
              </div>
              <div className="lg-shine">
              </div>
              <div className="card-header">
                <h4>
                  <i className="ic" data-ic="chart-line">
                  </i>
                  Course Progress
                </h4>
                <span className="badge">
                  8 subjects
                </span>
              </div>
              <div className="course-progress-grid">
                <div className="course-progress-item" onClick={legacyHandler("showToast('\ud83d\udcd8 Opening Structured Programming...')")}>
                  <div className="cp-name">
                    <i className="ic" data-ic="terminal">
                    </i>
                    C++
                  </div>
                  <div className="cp-bar">
                    <div className="fill" style={{"width": "60%"}}>
                    </div>
                  </div>
                  <div className="cp-pct">
                    60%
                  </div>
                </div>
                <div className="course-progress-item" onClick={legacyHandler("showToast('\ud83d\udd0c Opening Logic Design...')")}>
                  <div className="cp-name">
                    <i className="ic" data-ic="microchip">
                    </i>
                    Logic
                  </div>
                  <div className="cp-bar">
                    <div className="fill" style={{"width": "20%"}}>
                    </div>
                  </div>
                  <div className="cp-pct">
                    20%
                  </div>
                </div>
                <div className="course-progress-item" onClick={legacyHandler("showToast('\ud83d\udcd0 Opening Differential Equations...')")}>
                  <div className="cp-name">
                    <i className="ic" data-ic="infinity">
                    </i>
                    ODE
                  </div>
                  <div className="cp-bar">
                    <div className="fill" style={{"width": "80%"}}>
                    </div>
                  </div>
                  <div className="cp-pct">
                    80%
                  </div>
                </div>
                <div className="course-progress-item" onClick={legacyHandler("showToast('\ud83c\udfb2 Opening Probability...')")}>
                  <div className="cp-name">
                    <i className="ic" data-ic="dice">
                    </i>
                    Prob
                  </div>
                  <div className="cp-bar">
                    <div className="fill" style={{"width": "15%"}}>
                    </div>
                  </div>
                  <div className="cp-pct">
                    15%
                  </div>
                </div>
                <div className="course-progress-item" onClick={legacyHandler("showToast('\u222b Opening Calculus...')")}>
                  <div className="cp-name">
                    <i className="ic" data-ic="square-root-alt">
                    </i>
                    Calculus
                  </div>
                  <div className="cp-bar">
                    <div className="fill" style={{"width": "40%"}}>
                    </div>
                  </div>
                  <div className="cp-pct">
                    40%
                  </div>
                </div>
                <div className="course-progress-item" onClick={legacyHandler("showToast('\u26a1 Opening Physics...')")}>
                  <div className="cp-name">
                    <i className="ic" data-ic="bolt">
                    </i>
                    Physics
                  </div>
                  <div className="cp-bar">
                    <div className="fill" style={{"width": "10%"}}>
                    </div>
                  </div>
                  <div className="cp-pct">
                    10%
                  </div>
                </div>
                <div className="course-progress-item" onClick={legacyHandler("showToast('\ud83d\udd22 Opening Discrete...')")}>
                  <div className="cp-name">
                    <i className="ic" data-ic="project-diagram">
                    </i>
                    Discrete
                  </div>
                  <div className="cp-bar">
                    <div className="fill" style={{"width": "5%"}}>
                    </div>
                  </div>
                  <div className="cp-pct">
                    5%
                  </div>
                </div>
                <div className="course-progress-item" onClick={legacyHandler("showToast('\ud83d\udcbe Opening Computing...')")}>
                  <div className="cp-name">
                    <i className="ic" data-ic="binary">
                    </i>
                    Computing
                  </div>
                  <div className="cp-bar">
                    <div className="fill" style={{"width": "0%"}}>
                    </div>
                  </div>
                  <div className="cp-pct">
                    0%
                  </div>
                </div>
              </div>
            </div>
            {/* Recommendations */}
            <div className="dash-card lg lg-card">
              <div className="lg-effect">
              </div>
              <div className="lg-tint">
              </div>
              <div className="lg-shine">
              </div>
              <div className="card-header">
                <h4>
                  <i className="ic" data-ic="brain">
                  </i>
                  Recommended
                </h4>
                <span className="badge">
                  AI-powered
                </span>
              </div>
              <div className="rec-item" onClick={legacyHandler("showToast('\ud83c\udfaf Opening K-Map simulator...')")}>
                <div className="rec-left">
                  <i className="ic" data-ic="microchip">
                  </i>
                  <div className="rec-text">
                    You struggled with
                    <strong>
                      K-Maps
                    </strong>
                    in Logic Design. Practice with the simulator →
                  </div>
                </div>
                <span style={{"fontSize": "11px", "color": "var(--accent2)", "fontWeight": "600"}}>
                  Practice
                </span>
              </div>
              <div className="rec-item" onClick={legacyHandler("showToast('\ud83d\udcdd Taking Probability quiz...')")}>
                <div className="rec-left">
                  <i className="ic" data-ic="dice">
                  </i>
                  <div className="rec-text">
                    Time to review
                    <strong>
                      Poisson distribution
                    </strong>
                    – 2 questions attempted, 0 correct.
                  </div>
                </div>
                <span style={{"fontSize": "11px", "color": "var(--accent2)", "fontWeight": "600"}}>
                  Review
                </span>
              </div>
              <div className="rec-item" onClick={legacyHandler("showToast('\ud83d\udcda Continuing Calculus...')")}>
                <div className="rec-left">
                  <i className="ic" data-ic="square-root-alt">
                  </i>
                  <div className="rec-text">
                    Next in
                    <strong>
                      Calculus
                    </strong>
                    : Lecture 4 – Applications of Derivatives
                  </div>
                </div>
                <span style={{"fontSize": "11px", "color": "var(--accent2)", "fontWeight": "600"}}>
                  Continue
                </span>
              </div>
            </div>
          </div>
          {/* ─── RIGHT COLUMN ───────────────────────────────────────── */}
          <div>
            {/* Upcoming */}
            <div className="dash-card lg lg-card" style={{"marginBottom": "20px"}}>
              <div className="lg-effect">
              </div>
              <div className="lg-tint">
              </div>
              <div className="lg-shine">
              </div>
              <div className="card-header">
                <h4>
                  <i className="ic" data-ic="clock">
                  </i>
                  Upcoming
                </h4>
                <span className="badge">
                  3 items
                </span>
              </div>
              <div className="upcoming-item">
                <div className="ui-left">
                  <i className="ic" data-ic="dice">
                  </i>
                  <div>
                    <div className="ui-title">
                      Probability Quiz
                    </div>
                    <div className="ui-sub">
                      5 questions · Pass 60%
                    </div>
                  </div>
                </div>
                <div className="ui-right">
                  Tomorrow 10:00
                </div>
              </div>
              <div className="upcoming-item">
                <div className="ui-left">
                  <i className="ic" data-ic="microchip">
                  </i>
                  <div>
                    <div className="ui-title">
                      Logic Assignment
                    </div>
                    <div className="ui-sub">
                      K-Map simplification
                    </div>
                  </div>
                </div>
                <div className="ui-right">
                  Due Friday
                </div>
              </div>
              <div className="upcoming-item">
                <div className="ui-left">
                  <i className="ic" data-ic="terminal">
                  </i>
                  <div>
                    <div className="ui-title">
                      C++ Lab
                    </div>
                    <div className="ui-sub">
                      Pointers & Arrays
                    </div>
                  </div>
                </div>
                <div className="ui-right">
                  Next week
                </div>
              </div>
            </div>
            {/* Achievements */}
            <div className="dash-card lg lg-card" style={{"marginBottom": "20px"}}>
              <div className="lg-effect">
              </div>
              <div className="lg-tint">
              </div>
              <div className="lg-shine">
              </div>
              <div className="card-header">
                <h4>
                  <i className="ic" data-ic="trophy">
                  </i>
                  Achievements
                </h4>
                <span className="badge">
                  4 earned
                </span>
              </div>
              <div className="achievement-grid">
                <div className="achievement-badge">
                  <i className="ic" data-ic="fire">
                  </i>
                  7-Day Streak
                </div>
                <div className="achievement-badge">
                  <i className="ic" data-ic="check">
                  </i>
                  First Pass
                </div>
                <div className="achievement-badge">
                  <i className="ic" data-ic="zap">
                  </i>
                  Speed Learner
                </div>
                <div className="achievement-badge">
                  <i className="ic" data-ic="book">
                  </i>
                  10 Lectures
                </div>
                <div className="achievement-badge" style={{"opacity": "0.5"}}>
                  <i className="ic" data-ic="trophy">
                  </i>
                  Locked
                </div>
                <div className="achievement-badge" style={{"opacity": "0.5"}}>
                  <i className="ic" data-ic="brain">
                  </i>
                  Locked
                </div>
              </div>
            </div>
            {/* Recent Activity */}
            <div className="dash-card lg lg-card" style={{"marginBottom": "20px"}}>
              <div className="lg-effect">
              </div>
              <div className="lg-tint">
              </div>
              <div className="lg-shine">
              </div>
              <div className="card-header">
                <h4>
                  <i className="ic" data-ic="clock">
                  </i>
                  Recent Activity
                </h4>
              </div>
              <div className="activity-item">
                <div className="act-dot">
                </div>
                <div className="act-text">
                  Completed
                  <strong>
                    Calculus Quiz
                  </strong>
                  →
                  <span style={{"color": "var(--ok)"}}>
                    80%
                  </span>
                </div>
                <div className="act-time">
                  2h ago
                </div>
              </div>
              <div className="activity-item">
                <div className="act-dot">
                </div>
                <div className="act-text">
                  Watched
                  <strong>
                    ODE Lecture 3
                  </strong>
                  – Separable Equations
                </div>
                <div className="act-time">
                  4h ago
                </div>
              </div>
              <div className="activity-item">
                <div className="act-dot">
                </div>
                <div className="act-text">
                  Earned
                  <strong>
                    🎯 Speed Learner
                  </strong>
                  badge
                </div>
                <div className="act-time">
                  Yesterday
                </div>
              </div>
              <div className="activity-item">
                <div className="act-dot">
                </div>
                <div className="act-text">
                  Practiced
                  <strong>
                    Logic Simulator
                  </strong>
                  – Full Adder
                </div>
                <div className="act-time">
                  Yesterday
                </div>
              </div>
            </div>
            {/* Community */}
            <div className="dash-card lg lg-card">
              <div className="lg-effect">
              </div>
              <div className="lg-tint">
              </div>
              <div className="lg-shine">
              </div>
              <div className="card-header">
                <h4>
                  <i className="ic" data-ic="telegram">
                  </i>
                  Community
                </h4>
                <span className="badge">
                  Active
                </span>
              </div>
              <div className="community-item">
                <div className="ci-top">
                  <i className="ic" data-ic="telegram">
                  </i>
                  <span className="ci-group">
                    C++ Study Group
                  </span>
                  <span className="ci-count">
                    💬 3 new
                  </span>
                </div>
                <div className="ci-preview">
                  Ahmed: "How do I solve the array reversal problem?"
                </div>
              </div>
              <div className="community-item">
                <div className="ci-top">
                  <i className="ic" data-ic="book">
                  </i>
                  <span className="ci-group">
                    Shared Notes
                  </span>
                  <span className="ci-count">
                    📝 2 new
                  </span>
                </div>
                <div className="ci-preview">
                  Ahmed shared: "C++ Arrays Summary"
                </div>
              </div>
              <div className="community-item">
                <div className="ci-top">
                  <i className="ic" data-ic="microchip">
                  </i>
                  <span className="ci-group">
                    Logic Design Chat
                  </span>
                  <span className="ci-count">
                    💬 1 new
                  </span>
                </div>
                <div className="ci-preview">
                  Sara: "Can someone explain K-Map grouping?"
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      {/* ─── MOEAI FLOATING BUTTON ──────────────────────────────────── */}
      <button className="moeai-float" onClick={legacyHandler("toggleMoeAI()")} aria-label="Open MoeAI">
        <i className="ic" data-ic="brain">
        </i>
      </button>
      {/* ─── MOEAI PANEL ────────────────────────────────────────────── */}
      <div className="moeai-panel" id="moeaiPanel">
        <div className="moeai-header">
          <div className="mh-title">
            <i className="ic" data-ic="brain">
            </i>
            MoeAI
          </div>
          <button className="mh-close" onClick={legacyHandler("toggleMoeAI()")}>
            ✕
          </button>
        </div>
        <div className="moeai-context">
          📍 You're on the
          <span>
            Dashboard
          </span>
          · Ready to help
        </div>
        <div className="moeai-messages" id="moeaiMessages">
          <div className="msg ai">
            👋 Hi Ahmed! How can I help you today?
          </div>
        </div>
        <div className="moeai-input">
          <input id="moeaiInput" placeholder="Ask me anything..." onKeyDown={legacyHandler("if(event.key==='Enter')askMoeAI()")} />
          <button onClick={legacyHandler("askMoeAI()")}>
            Send
          </button>
        </div>
        <div className="moeai-suggestions">
          <button onClick={legacyHandler("suggest('What should I study today?')")}>
            What should I study today?
          </button>
          <button onClick={legacyHandler("suggest('Explain K-Maps')")}>
            Explain K-Maps
          </button>
          <button onClick={legacyHandler("suggest('Generate a quiz')")}>
            Generate a quiz
          </button>
          <button onClick={legacyHandler("suggest('Help with pointers')")}>
            Help with pointers
          </button>
        </div>
      </div>
      {/* ─── TOAST ──────────────────────────────────────────────────── */}
      <div className="toast" id="toast">
        <span id="toastMsg">
        </span>
      </div>
    </>
  );
}
