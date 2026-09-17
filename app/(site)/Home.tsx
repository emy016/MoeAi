"use client";
/**
 * EDUMOE · Learn Computer Science The Cool Way
 *
 * Converted from reference/legacy-html/index.html by scripts/port-legacy.py.
 * The markup below is that file's <body>, translated HTML -> JSX structurally.
 * The styling lives in ./legacy.css, copied byte-for-byte from its <style>
 * block, and the behaviour lives in /legacy/index.js, copied byte-for-byte
 * from its <script> block.
 *
 * Do not restyle this by hand. If it looks wrong, diff it against the original.
 */
import { legacyHandler, useLegacyScripts } from "@/lib/legacy";
import "./legacy.css";

const STYLESHEETS: string[] = [
  "https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:ital,wght@0,400;0,500;0,600;0,700;0,800;1,500&family=Space+Grotesk:wght@500;600;700&family=Fira+Code:wght@400;500;600&display=swap"
];
const SCRIPTS: string[] = [];

export default function Home() {
  useLegacyScripts(STYLESHEETS, SCRIPTS, "/legacy/index.js");

  return (
    <>
      {/* ─── AMBIENT ORBS ──────────────────────────────────────────── */}
      <div className="bg-canvas">
        <div className="bg-orb bg-orb-1">
        </div>
        <div className="bg-orb bg-orb-2">
        </div>
        <div className="bg-orb bg-orb-3">
        </div>
      </div>
      {/* ─── DYNAMIC CANVAS ────────────────────────────────────────── */}
      <canvas id="bg-canvas">
      </canvas>
      {/* ─── CRT OVERLAY ───────────────────────────────────────────── */}
      <div className="crt-overlay" id="crtOverlay">
      </div>
      {/* ─── LOADER ────────────────────────────────────────────────── */}
      <div id="loader">
        <div className="loader-wordmark gradient-text">
          EDUMOE
        </div>
        <div className="loader-progress">
          <div className="loader-bar">
          </div>
        </div>
      </div>
      {/* ─── NAVBAR ────────────────────────────────────────────────── */}
      <nav className="navbar lg lg-pill" id="navbar">
        <div className="lg-effect">
        </div>
        <div className="lg-tint">
        </div>
        <div className="lg-shine">
        </div>
        <a className="nav-logo" href="#">
          <div className="nav-logo-mark">
            <i className="ic" data-ic="graduation-cap">
            </i>
          </div>
          <span className="nav-logo-name">
            EDUMOE
          </span>
        </a>
        <div className="nav-links">
          <a href="#" className="nav-btn-link active">
            Home
          </a>
          <a href="/courses" className="nav-btn-link">
            Courses
          </a>
          <a href="/simulators" className="nav-btn-link">
            Simulators
          </a>
          <a href="/quizzes" className="nav-btn-link">
            Quizzes
          </a>
          <a href="/ranked" className="nav-btn-link">
            Ranked
          </a>
          <a href="/moeai" className="nav-btn-link nav-moeai">
            MoeAI
            <span className="soon-badge">
              soon
            </span>
          </a>
          <a href="/about" className="nav-btn-link">
            About
          </a>
        </div>
        <div className="nav-right">
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
            <div className="custom-color-wrap" id="customColorWrap" title="Custom accent color">
              <input type="color" id="customColorPicker" value="#e11d48" aria-label="Custom accent color" />
            </div>
            <button className="theme-dot td-terminal" id="td-terminal" onClick={legacyHandler("setTheme('terminal', this)")} title="Terminal mode">
            </button>
          </div>
          <button className="crt-toggle" id="crtToggle" onClick={legacyHandler("toggleCRT()")} title="Toggle CRT scanlines">
            <i className="ic" data-ic="tv">
            </i>
          </button>
          <button className="nav-auth-btn" onClick={legacyHandler("openModal('loginModal')")}>
            <i className="ic" data-ic="user">
            </i>
            <span>
              Log in
            </span>
          </button>
          <button className="nav-cta" onClick={legacyHandler("openModal('signupModal')")}>
            Sign up
          </button>
        </div>
      </nav>
      {/* ─── HERO ──────────────────────────────────────────────────── */}
      <div className="hero">
        <div className="hero-left">
          <h1 className="sf-display hero-title" id="heroTitle" aria-label="Learn Computer Science The Cool Way">
          </h1>
          <p className="hero-desc">
            Built by one FUE CS student, not a company.
            <br />
            Live compilers and real simulators — plus the same notes 230 of your classmates already lean on before finals.
          </p>
          <div className="hero-ctas">
            <a href="/courses" className="btn btn-fire">
              <i className="ic" data-ic="play">
              </i>
              Start Learning
            </a>
            <a href="/simulators" className="btn lg lg-pill" style={{"padding": "12px 24px", "border": "1px solid var(--glass-border)"}}>
              <div className="lg-effect">
              </div>
              <div className="lg-tint">
              </div>
              <div className="lg-shine">
              </div>
              <i className="ic" data-ic="code">
              </i>
              Try Simulators
            </a>
            <a href="https://t.me/CS_Epic_Save" target="_blank" rel="noopener noreferrer" className="btn lg lg-pill" style={{"padding": "12px 24px", "border": "1px solid var(--glass-border)", "color": "inherit", "textDecoration": "none"}}>
              <div className="lg-effect">
              </div>
              <div className="lg-tint">
              </div>
              <div className="lg-shine">
              </div>
              <i className="ic" data-ic="telegram">
              </i>
              Telegram
            </a>
          </div>
          <div className="hero-stats">
            <div className="stat-card">
              <div className="stat-val" id="stat-students">
                —
              </div>
              <div className="stat-lbl">
                Students
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-val">
                8
              </div>
              <div className="stat-lbl">
                Courses
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-val">
                Free
              </div>
              <div className="stat-lbl">
                Always
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-val">
                🇪🇬
              </div>
              <div className="stat-lbl">
                Egypt
              </div>
            </div>
          </div>
        </div>
        <div className="hero-visual">
          <div className="orbit-container" id="orbitContainer">
            <div className="sg-grid-bg">
            </div>
            <div className="orb-shell">
              <div className="orb-ring">
              </div>
              <div className="orb-body">
                <img src="moepfp.jpg" alt="Moemen" className="orb-img" loading="lazy" onError={legacyHandler("this.style.display='none'; this.parentElement.innerHTML='<div class=\\'orb-placeholder\\'><i class=\\'ic\\' data-ic=\\'user\\'></i></div>';")} />
                <div className="orb-gloss">
                </div>
              </div>
              <div className="orb-particles">
                <div className="orb-dot">
                </div>
                <div className="orb-dot">
                </div>
                <div className="orb-dot">
                </div>
                <div className="orb-dot">
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      {/* ─── FEATURES (8 cards) ────────────────────────────────────── */}
      <div className="wrap section reveal">
        <div className="section-head">
          <div className="section-label">
            <div className="section-label-dot">
            </div>
            Why EDUMOE
          </div>
          <h2 className="sf-title">
            Built for CS Students
          </h2>
          <p>
            Everything for Computing Fundamentals through Probability & Statistics — built by someone taking the same courses right now
          </p>
        </div>
        <div className="features-grid">
          {/* Card 1 */}
          <div className="feature-card lg lg-card">
            <div className="lg-effect">
            </div>
            <div className="lg-tint">
            </div>
            <div className="lg-shine">
            </div>
            <div className="feature-icon">
              <i className="ic" data-ic="terminal">
              </i>
            </div>
            <h3>
              Live C++ Compiler
            </h3>
            <p>
              Write and run C++ code directly in your browser. No setup, no downloads.
            </p>
          </div>
          {/* Card 2 */}
          <div className="feature-card lg lg-card">
            <div className="lg-effect">
            </div>
            <div className="lg-tint">
            </div>
            <div className="lg-shine">
            </div>
            <div className="feature-icon">
              <i className="ic" data-ic="microchip">
              </i>
            </div>
            <h3>
              Logic Simulator
            </h3>
            <p>
              Build circuits with AND, OR, XOR, NAND gates. Auto‑generated truth tables.
            </p>
          </div>
          {/* Card 3 */}
          <div className="feature-card lg lg-card">
            <div className="lg-effect">
            </div>
            <div className="lg-tint">
            </div>
            <div className="lg-shine">
            </div>
            <div className="feature-icon">
              <i className="ic" data-ic="square-root-alt">
              </i>
            </div>
            <h3>
              Math Solver
            </h3>
            <p>
              Solve integrals, derivatives, and ODEs step‑by‑step. Plot functions instantly.
            </p>
          </div>
          {/* Card 4 */}
          <div className="feature-card lg lg-card">
            <div className="lg-effect">
            </div>
            <div className="lg-tint">
            </div>
            <div className="lg-shine">
            </div>
            <div className="feature-icon">
              <i className="ic" data-ic="brain">
              </i>
            </div>
            <h3>
              MoeAI Assistant
            </h3>
            <p>
              AI that understands the FUE curriculum. Ask anything about your CS courses.
            </p>
          </div>
          {/* Card 5 */}
          <div className="feature-card lg lg-card">
            <div className="lg-effect">
            </div>
            <div className="lg-tint">
            </div>
            <div className="lg-shine">
            </div>
            <div className="feature-icon">
              <i className="ic" data-ic="layer-group">
              </i>
            </div>
            <h3>
              Smart Flashcards
            </h3>
            <p>
              Create and review flashcards for any topic. Spaced repetition coming soon.
            </p>
          </div>
          {/* Card 6 */}
          <div className="feature-card lg lg-card">
            <div className="lg-effect">
            </div>
            <div className="lg-tint">
            </div>
            <div className="lg-shine">
            </div>
            <div className="feature-icon">
              <i className="ic" data-ic="telegram">
              </i>
            </div>
            <h3>
              Telegram Community
            </h3>
            <p>
              The same channel 230 FUE CS students already use before midterms — t.me/CS_Epic_Save.
            </p>
          </div>
          {/* Card 7 – NEW: Discrete Mathematics */}
          <div className="feature-card lg lg-card">
            <div className="lg-effect">
            </div>
            <div className="lg-tint">
            </div>
            <div className="lg-shine">
            </div>
            <div className="feature-icon">
              <i className="ic" data-ic="project-diagram">
              </i>
            </div>
            <h3>
              Discrete Mathematics
            </h3>
            <p>
              Learn set theory, logic, proofs, combinatorics, and graph theory with interactive visual tools.
            </p>
          </div>
          {/* Card 8 – NEW: Competitive Arena */}
          <div className="feature-card lg lg-card">
            <div className="lg-effect">
            </div>
            <div className="lg-tint">
            </div>
            <div className="lg-shine">
            </div>
            <div className="feature-icon">
              <i className="ic" data-ic="trophy">
              </i>
            </div>
            <h3>
              Competitive Arena
            </h3>
            <p>
              Battle bots in ranked matches, climb the Elo ladder, and win tournaments to prove your skills.
            </p>
          </div>
        </div>
      </div>
      {/* ─── SUBJECTS ─────────────────────────────────────────────── */}
      <div className="wrap section reveal">
        <div className="section-head">
          <div className="section-label">
            <div className="section-label-dot">
            </div>
            The Curriculum
          </div>
          <h2 className="sf-title">
            Every Subject, Covered
          </h2>
          <p>
            Computing Fundamentals, Calculus, Physics, Discrete Math, Structured Programming, Differential Equations, Logic Design, Probability & Statistics — your actual first-year syllabus
          </p>
        </div>
        <div className="subjects-grid">
          <div className="subj-card" onClick={legacyHandler("showToast('\ud83d\udcd8 Structured Programming \u2014 coming soon')")}>
            <div className="subj-term">
              Term 2 · C++
            </div>
            <div className="subj-name">
              Structured Programming
            </div>
            <div className="subj-code">
              structured_programming.cpp
            </div>
            <div className="subj-meta">
              <span>
                <i className="ic" data-ic="terminal">
                </i>
                Compiler
              </span>
              <span>
                <i className="ic" data-ic="code">
                </i>
                Exercises
              </span>
            </div>
          </div>
          <div className="subj-card" onClick={legacyHandler("showToast('\ud83d\udd0c Logic Design \u2014 coming soon')")}>
            <div className="subj-term">
              Term 2 · Digital
            </div>
            <div className="subj-name">
              Logic Design
            </div>
            <div className="subj-code">
              logic_design.v
            </div>
            <div className="subj-meta">
              <span>
                <i className="ic" data-ic="microchip">
                </i>
                Simulator
              </span>
              <span>
                <i className="ic" data-ic="table">
                </i>
                Truth tables
              </span>
            </div>
          </div>
          <div className="subj-card" onClick={legacyHandler("showToast('\ud83d\udcd0 Differential Equations \u2014 coming soon')")}>
            <div className="subj-term">
              Term 2 · Math
            </div>
            <div className="subj-name">
              Differential Equations
            </div>
            <div className="subj-code">
              diff_equations.tex
            </div>
            <div className="subj-meta">
              <span>
                <i className="ic" data-ic="square-root-alt">
                </i>
                Solver
              </span>
              <span>
                <i className="ic" data-ic="chart-line">
                </i>
                Plots
              </span>
            </div>
          </div>
          <div className="subj-card" onClick={legacyHandler("showToast('\ud83c\udfb2 Probability & Statistics \u2014 coming soon')")}>
            <div className="subj-term">
              Term 2 · Math
            </div>
            <div className="subj-name">
              Probability & Statistics
            </div>
            <div className="subj-code">
              probability.tex
            </div>
            <div className="subj-meta">
              <span>
                <i className="ic" data-ic="dice">
                </i>
                Visualizer
              </span>
              <span>
                <i className="ic" data-ic="percent">
                </i>
                Distributions
              </span>
            </div>
          </div>
          <div className="subj-card" onClick={legacyHandler("showToast('\u222b Calculus \u2014 coming soon')")}>
            <div className="subj-term">
              Term 1 · Math
            </div>
            <div className="subj-name">
              Calculus
            </div>
            <div className="subj-code">
              calculus.tex
            </div>
            <div className="subj-meta">
              <span>
                <i className="ic" data-ic="infinity">
                </i>
                Limits
              </span>
              <span>
                <i className="ic" data-ic="square-root-alt">
                </i>
                Integrals
              </span>
            </div>
          </div>
          <div className="subj-card" onClick={legacyHandler("showToast('\u26a1 Physics \u2014 coming soon')")}>
            <div className="subj-term">
              Term 1 · Science
            </div>
            <div className="subj-name">
              Physics
            </div>
            <div className="subj-code">
              physics.tex
            </div>
            <div className="subj-meta">
              <span>
                <i className="ic" data-ic="bolt">
                </i>
                Circuits
              </span>
              <span>
                <i className="ic" data-ic="atom">
                </i>
                Fields
              </span>
            </div>
          </div>
          <div className="subj-card" onClick={legacyHandler("showToast('\ud83d\udd22 Discrete Mathematics \u2014 coming soon')")}>
            <div className="subj-term">
              Term 1 · Math
            </div>
            <div className="subj-name">
              Discrete Mathematics
            </div>
            <div className="subj-code">
              discrete_math.tex
            </div>
            <div className="subj-meta">
              <span>
                <i className="ic" data-ic="project-diagram">
                </i>
                Sets
              </span>
              <span>
                <i className="ic" data-ic="check-double">
                </i>
                Logic
              </span>
            </div>
          </div>
          <div className="subj-card" onClick={legacyHandler("showToast('\ud83d\udcbe Computing Fundamentals \u2014 coming soon')")}>
            <div className="subj-term">
              Term 1 · Core
            </div>
            <div className="subj-name">
              Computing Fundamentals
            </div>
            <div className="subj-code">
              computing_fund.c
            </div>
            <div className="subj-meta">
              <span>
                <i className="ic" data-ic="binary">
                </i>
                Binary
              </span>
              <span>
                <i className="ic" data-ic="memory">
                </i>
                Systems
              </span>
            </div>
          </div>
        </div>
      </div>
      {/* ─── STATS BAR ────────────────────────────────────────────── */}
      <div className="wrap">
        <div className="stats-bar lg lg-panel">
          <div className="lg-effect">
          </div>
          <div className="lg-tint">
          </div>
          <div className="lg-shine">
          </div>
          <div className="stat-item">
            <div className="stat-number">
              230+
            </div>
            <div className="stat-label">
              Active Students
            </div>
          </div>
          <div className="stat-item">
            <div className="stat-number">
              8
            </div>
            <div className="stat-label">
              Full Courses
            </div>
          </div>
          <div className="stat-item">
            <div className="stat-number">
              7
            </div>
            <div className="stat-label">
              Simulators
            </div>
          </div>
          <div className="stat-item">
            <div className="stat-number">
              24/7
            </div>
            <div className="stat-label">
              Community
            </div>
          </div>
          <div className="stat-item">
            <div className="stat-number">
              0 EGP
            </div>
            <div className="stat-label">
              Always Free
            </div>
          </div>
        </div>
      </div>
      {/* ─── CTA ───────────────────────────────────────────────────── */}
      <div className="wrap reveal">
        <div className="cta-section lg lg-panel">
          <div className="lg-effect">
          </div>
          <div className="lg-tint">
          </div>
          <div className="lg-shine">
          </div>
          <h2>
            yalla bina? 👊
          </h2>
          <p>
            Free, and staying free — built by a CS student, not funded by one.
          </p>
          <a href="/courses" className="btn btn-fire" style={{"padding": "14px 36px"}}>
            <i className="ic" data-ic="rocket">
            </i>
            yalla bina! 🚀
          </a>
        </div>
      </div>
      {/* ─── FOOTER ────────────────────────────────────────────────── */}
      <footer className="footer">
        <div className="wrap">
          <div className="footer-grid">
            <div className="footer-brand">
              <div className="footer-logo">
                EDUMOE
              </div>
              <p>
                Interactive CS education for students across Egypt. Built by a student. Free forever.
              </p>
              <div className="footer-social">
                <a href="https://t.me/CS_Epic_Save" target="_blank" rel="noopener noreferrer" className="fsoc">
                  <i className="ic" data-ic="telegram">
                  </i>
                </a>
                <a href="#" className="fsoc" onClick={legacyHandler("showToast('\ud83d\udcfa YouTube coming soon!')")}>
                  <i className="ic" data-ic="youtube">
                  </i>
                </a>
                <a href="#" className="fsoc" onClick={legacyHandler("showToast('\ud83d\udcec Contact coming soon!')")}>
                  <i className="ic" data-ic="envelope">
                  </i>
                </a>
              </div>
            </div>
            <div className="footer-col">
              <h5>
                LEARN
              </h5>
              <a href="/courses">
                All Courses
              </a>
              <a href="/simulators">
                Simulators
              </a>
              <a href="/quizzes">
                Daily Quiz
              </a>
              <a href="#" onClick={legacyHandler("showToast('\ud83c\udccf Flashcards coming soon!')")}>
                Flashcards
              </a>
            </div>
            <div className="footer-col">
              <h5>
                TOOLS
              </h5>
              <a href="#" onClick={legacyHandler("showToast('\u2328\ufe0f Compiler coming soon!')")}>
                C++ Compiler
              </a>
              <a href="#" onClick={legacyHandler("showToast('\ud83e\uddee Math Solver coming soon!')")}>
                Math Solver
              </a>
              <a href="#" onClick={legacyHandler("showToast('\ud83d\udd0c Logic Sim coming soon!')")}>
                Logic Sim
              </a>
              <a href="#" onClick={legacyHandler("showToast('\ud83e\udde0 MoeAI coming soon!')")}>
                MoeAI
              </a>
            </div>
            <div className="footer-col">
              <h5>
                PLATFORM
              </h5>
              <a href="/ranked">
                Ranked
              </a>
              <a href="/about">
                About
              </a>
              <a href="#" onClick={legacyHandler("showToast('\ud83d\udcca Admin panel coming soon!')")}>
                Admin
              </a>
            </div>
            <div className="footer-col">
              <h5>
                CONNECT
              </h5>
              <a href="https://t.me/CS_Epic_Save" target="_blank" rel="noopener noreferrer">
                <i className="ic" data-ic="telegram">
                </i>
                Telegram
              </a>
              <a href="#" onClick={legacyHandler("showToast('\ud83d\udcec Contact coming soon!')")}>
                Contact
              </a>
            </div>
          </div>
          <div className="footer-bottom">
            <span>
              ©
              <span id="yr">
              </span>
              EDUMOE. Not an official FUE service — an independent, student-built study platform.
            </span>
          </div>
        </div>
      </footer>
      {/* ─── MOBILE BOTTOM TAB BAR ────────────────────────────────── */}
      <nav className="bottom-tab-bar" role="navigation" aria-label="Main navigation">
        <a href="/courses" className="tab-item active" aria-label="Courses">
          <i className="ic" data-ic="book">
          </i>
          <span>
            Courses
          </span>
        </a>
        <a href="/simulators" className="tab-item" aria-label="Simulators">
          <i className="ic" data-ic="microchip">
          </i>
          <span>
            Simulators
          </span>
        </a>
        <a href="#" className="tab-item" onClick={legacyHandler("showToast('\ud83e\udde0 MoeAI page coming soon!')")} aria-label="MoeAI">
          <i className="ic" data-ic="brain">
          </i>
          <span>
            MoeAI
          </span>
        </a>
        <a href="#" className="tab-item" onClick={legacyHandler("showToast('\ud83d\udcdd Practice page coming soon!')")} aria-label="Practice">
          <i className="ic" data-ic="pencil-alt">
          </i>
          <span>
            Practice
          </span>
        </a>
        <a href="/ranked" className="tab-item" aria-label="Ranked">
          <i className="ic" data-ic="trophy">
          </i>
          <span>
            Ranked
          </span>
        </a>
      </nav>
      {/* ─── MODALS ────────────────────────────────────────────────── */}
      <div className="modal-overlay" id="loginModal" role="dialog" aria-modal="true" aria-labelledby="loginTitle">
        <div className="modal-box lg lg-panel">
          <div className="lg-effect">
          </div>
          <div className="lg-tint">
          </div>
          <div className="lg-shine">
          </div>
          <button className="m-close" onClick={legacyHandler("closeModal('loginModal')")} aria-label="Close">
            <i className="ic" data-ic="times">
            </i>
          </button>
          <h2 id="loginTitle">
            Welcome back
          </h2>
          <button className="m-btn-google" onClick={legacyHandler("EDUMOE_GOOGLE()")}>
            <svg viewBox="0 0 48 48">
              <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
              <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
              <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
              <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
            </svg>
            Continue with Google
          </button>
          <div className="m-divider">
            or
          </div>
          <input className="m-input" type="text" id="loginId" placeholder="Username or email" autoComplete="username" />
          <div className="m-input-wrap">
            <input className="m-input" type="password" id="loginPassword" placeholder="Password" autoComplete="current-password" />
            <button className="m-pass-toggle" type="button" onClick={legacyHandler("togglePass('loginPassword', this)")} aria-label="Show password">
              <i className="ic" data-ic="eye">
              </i>
            </button>
          </div>
          <button className="m-btn m-btn-fire" onClick={legacyHandler("EDUMOE_LOGIN()")}>
            Log In
          </button>
          <button className="m-btn" onClick={legacyHandler("switchModal('loginModal','signupModal')")}>
            Create an account
          </button>
        </div>
      </div>
      <div className="modal-overlay" id="signupModal" role="dialog" aria-modal="true" aria-labelledby="signupTitle">
        <div className="modal-box lg lg-panel">
          <div className="lg-effect">
          </div>
          <div className="lg-tint">
          </div>
          <div className="lg-shine">
          </div>
          <button className="m-close" onClick={legacyHandler("closeModal('signupModal')")} aria-label="Close">
            <i className="ic" data-ic="times">
            </i>
          </button>
          <h2 id="signupTitle">
            Create account
          </h2>
          <button className="m-btn-google" onClick={legacyHandler("EDUMOE_GOOGLE()")}>
            <svg viewBox="0 0 48 48">
              <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
              <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
              <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
              <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
            </svg>
            Continue with Google
          </button>
          <div className="m-divider">
            or
          </div>
          <input className="m-input" type="text" id="signupUsername" placeholder="Username" autoComplete="username" />
          <input className="m-input" type="email" id="signupEmail" placeholder="Email (optional)" autoComplete="email" />
          <div className="m-input-wrap">
            <input className="m-input" type="password" id="signupPassword" placeholder="Password (6+ characters)" autoComplete="new-password" />
            <button className="m-pass-toggle" type="button" onClick={legacyHandler("togglePass('signupPassword', this)")} aria-label="Show password">
              <i className="ic" data-ic="eye">
              </i>
            </button>
          </div>
          <p className="m-hint">
            Email is optional — a username is all you need to start.
          </p>
          <button className="m-btn m-btn-fire" onClick={legacyHandler("EDUMOE_SIGNUP()")}>
            Create Account
          </button>
          <button className="m-btn" onClick={legacyHandler("switchModal('signupModal','loginModal')")}>
            Already have an account? Log in
          </button>
        </div>
      </div>
      {/* ─── TOAST ──────────────────────────────────────────────────── */}
      <div className="toast" id="toast">
        <span id="toast-msg">
        </span>
      </div>
    </>
  );
}
