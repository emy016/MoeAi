"use client";
/**
 * Courses
 *
 * Converted from reference/legacy-html/courses.html by scripts/port-legacy.py.
 * The markup below is that file's <body>, translated HTML -> JSX structurally.
 * The styling lives in ./legacy.css, copied byte-for-byte from its <style>
 * block, and the behaviour lives in /legacy/courses.js, copied byte-for-byte
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

export default function Courses() {
  useLegacyScripts(STYLESHEETS, SCRIPTS, "/legacy/courses.js");

  return (
    <>
      {/* ─── CRT OVERLAY ──────────────────────────────────────────── */}
      <div className="crt-overlay" id="crtOverlay">
      </div>
      {/* ─── TOP BAR ───────────────────────────────────────────────── */}
      <div className="topbar">
        <a className="brand" href="#">
          <div className="brand-mark">
            <i className="ic" data-ic="book">
            </i>
          </div>
          EDUMOE
          <small>
            · Courses
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
              Back
            </span>
          </a>
        </div>
      </div>
      {/* ─── OVERVIEW ───────────────────────────────────────────────── */}
      <div className="wrap" id="overviewView">
        {/* Hero */}
        <div className="courses-hero">
          <h1>
            <i className="ic" data-ic="book">
            </i>
            Courses
          </h1>
          <p>
            All 8 core CS subjects — with real lecture structures, progress tracking, and AI companion.
          </p>
          <div className="courses-stats" id="overviewStats">
            <div className="stat-item">
              <div className="num" id="statTotal">
                0
              </div>
              <div className="lbl">
                Lectures
              </div>
            </div>
            <div className="stat-item">
              <div className="num" id="statDone">
                0
              </div>
              <div className="lbl">
                Completed
              </div>
            </div>
            <div className="stat-item">
              <div className="num" id="statPct">
                0%
              </div>
              <div className="lbl">
                Progress
              </div>
            </div>
          </div>
          <div className="search-wrap">
            <span className="search-icon">
              <i className="ic" data-ic="search">
              </i>
            </span>
            <input type="text" id="courseSearch" placeholder="Search courses..." onInput={legacyHandler("filterCourses(this.value)")} />
          </div>
        </div>
        {/* Continue Learning */}
        <div className="continue-section hidden" id="continueSection">
          <div className="left">
            <span className="label">
              ↻ Continue
            </span>
            <span className="course-name" id="continueCourse">
              —
            </span>
            <span className="lec-name" id="continueLecture">
              —
            </span>
          </div>
          <button className="btn btn-sm btn-primary" id="continueBtn" onClick={legacyHandler("resumeLearning()")}>
            Resume
          </button>
        </div>
        <div className="course-grid" id="courseGrid">
        </div>
      </div>
      {/* ─── DETAIL VIEW ───────────────────────────────────────────── */}
      <div className="wrap detail-view" id="detailView">
        <div className="detail-top">
          <button className="btn btn-sm" onClick={legacyHandler("goBack()")}>
            <i className="ic" data-ic="arrow-left">
            </i>
            Back
          </button>
          <h2 id="detailTitle">
            Course
          </h2>
          <span className="sub" id="detailSub">
            Term · Units
          </span>
        </div>
        <div className="sidebar-backdrop" id="sidebarBackdrop" onClick={legacyHandler("toggleSidebar()")}>
        </div>
        <div className="detail-layout">
          <aside className="sidebar" id="sidebar">
            <div className="sidebar-head">
              <h4 id="sideTitle">
                Units
              </h4>
              <div className="meta" id="sideMeta">
                0 units · 0 lectures
              </div>
              <div className="prog-bar">
                <div className="prog-bar-fill" id="sideProgFill">
                </div>
              </div>
              <div className="prog-label">
                <span id="sideProgText">
                  0 of 0 done
                </span>
                <span id="sideProgPct">
                  0%
                </span>
              </div>
            </div>
            <div className="unit-list" id="unitList">
            </div>
          </aside>
          <main className="main-content" id="mainContent">
            {/* filled by JS */}
          </main>
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
