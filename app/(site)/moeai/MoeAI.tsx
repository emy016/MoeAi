"use client";
/**
 * MoeAI — your tutor
 *
 * Converted from reference/legacy-html/moeai.html by scripts/port-legacy.py.
 * The markup below is that file's <body>, translated HTML -> JSX structurally.
 * The styling lives in ./legacy.css, copied byte-for-byte from its <style>
 * block, and the behaviour lives in /legacy/moeai.js, copied byte-for-byte
 * from its <script> block.
 *
 * Do not restyle this by hand. If it looks wrong, diff it against the original.
 */
import { legacyHandler, useLegacyScripts } from "@/lib/legacy";
import "./legacy.css";

const STYLESHEETS: string[] = [
  "https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;450;500;550;600;650;700;750;800&family=Space+Grotesk:wght@400;500;600;700&family=Fira+Code:wght@400;500&display=swap",
  "https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css",
  "https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/github-dark.min.css"
];
const SCRIPTS: string[] = [
  "https://cdn.jsdelivr.net/npm/marked@12.0.2/marked.min.js",
  "https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.js",
  "https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/contrib/auto-render.min.js",
  "https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/highlight.min.js",
  "https://cdn.jsdelivr.net/npm/mathjs@12.4.1/lib/browser/math.js"
];

export default function MoeAI() {
  useLegacyScripts(STYLESHEETS, SCRIPTS, "/legacy/moeai.js");

  return (
    <>
      <div className="mx-app" id="mxApp" data-moe-theme="ruby">
        <div className="mx-ambient" aria-hidden="true">
        </div>
        <div id="mxFileWarn" style={{"display": "none", "position": "fixed", "top": "0", "left": "0", "right": "0", "zIndex": "9999", "padding": "8px 14px", "background": "#3a1a2a", "borderBottom": "1px solid #ff4d6d", "color": "#ffd9e6", "fontSize": "11px", "textAlign": "center"}}>
          ⚠️ file:// blocked — run via http://localhost:8000 (python -m http.server) for AI streaming.
          <button onClick={legacyHandler("this.parentElement.style.display='none'")} style={{"marginLeft": "8px", "background": "rgba(255,255,255,.12)", "border": "none", "color": "#fff", "padding": "4px 8px", "borderRadius": "6px"}}>
            Dismiss
          </button>
        </div>
        <aside className="mx-sidebar" id="mxSidebar">
          <a className="mx-brand" href="/">
            <img src="public/brand/moeai-logo.jpg" alt="" width="42" height="42" onError={legacyHandler("this.style.display='none'")} />
            <span>
              Moe
              <span>
                AI
              </span>
              <small>
                by EduMoe
              </small>
            </span>
          </a>
          <button className="mx-mobile-close mx-icon" id="mxSidebarClose">
            X
          </button>
          <button className="mx-new-chat" id="mxNewChat">
            + New conversation
            <span>
              CmdO
            </span>
          </button>
          <label className="mx-search mx-sidebar-search">
            <span>
              search
            </span>
            <input id="mxSearch" placeholder="Search conversations" />
            <kbd>
              CmdK
            </kbd>
          </label>
          <nav className="mx-nav">
            <button data-view="chat" className="active">
              Conversations
            </button>
            <button data-view="library">
              Library
              <span id="mxLibCount">
                0
              </span>
            </button>
            <button data-view="courses">
              Courses
              <span style={{"fontSize": "9px", "background": "rgba(244,63,109,.15)", "padding": "2px 6px", "borderRadius": "999px"}}>
                8
              </span>
            </button>
            <button data-view="simulators">
              Simulators
              <span style={{"fontSize": "8px", "background": "rgba(72,216,237,.15)", "padding": "2px 6px", "borderRadius": "999px"}}>
                6
              </span>
            </button>
            <button data-view="quizzes">
              Quizzes
              <span style={{"fontSize": "8px", "background": "rgba(249,181,91,.15)", "padding": "2px 6px", "borderRadius": "999px"}}>
                350+
              </span>
            </button>
            <button data-view="ranked">
              Ranked
            </button>
            <button data-view="dashboard">
              Dashboard
            </button>
            <button data-view="planner">
              Study plan
              <i id="mxPlannerDot" style={{"display": "none"}}>
              </i>
            </button>
            <button data-view="about">
              About
            </button>
          </nav>
          <div style={{"margin": "12px 8px", "padding": "10px", "borderRadius": "10px", "background": "linear-gradient(135deg,rgba(244,63,109,.12),rgba(176,139,255,.10))", "border": "1px solid rgba(244,63,109,.18)", "fontSize": "10px", "lineHeight": "1.7", "color": "#e8dff0"}}>
            <strong style={{"color": "var(--mx-accent)"}}>
              ✨ Enhanced v2.1
            </strong>
            — Personality (EN/AR/Franco) + Tutoring (diagnosis → progressive) + Security (redaction) + Tools. Key pre-filled.
            <a href="#" id="mxWhatsNew" style={{"color": "var(--mx-accent)", "textDecoration": "underline"}}>
              What's new?
            </a>
          </div>
          <div className="mx-history-heading">
            <span className="mx-eyebrow">
              YOUR CONVERSATIONS
            </span>
            <span id="mxChatCount">
              0
            </span>
          </div>
          <div className="mx-history" id="mxHistory">
          </div>
          <div className="mx-sidebar-bottom">
            <a href="/" className="mx-back">
              Back to EduMoe
            </a>
            <button className="mx-profile" id="mxProfileBtn">
              <span className="mx-avatar" id="mxAvatar">
                Y
              </span>
              <span>
                <strong id="mxProfileName">
                  Your workspace
                </strong>
                <small>
                  Personal
                </small>
              </span>
              settings
            </button>
          </div>
        </aside>
        <button className="mx-sidebar-scrim" id="mxScrim" style={{"display": "none", "position": "fixed", "inset": "0", "background": "#0009", "zIndex": "35"}}>
        </button>
        <main className="mx-main">
          <header className="mx-header">
            <div className="mx-header-left">
              <button className="mx-icon mx-menu-toggle" id="mxMenuOpen">
                menu
              </button>
              <span className="mx-header-breadcrumb">
                Workspace
                <span>
                  /
                </span>
              </span>
              <strong id="mxHeaderTitle">
                MoeAI
              </strong>
              <span className="mx-beta">
                BETA SINGLE FILE
              </span>
            </div>
            <div className="mx-header-actions">
              <span className="mx-live">
                <i className="mx-dot">
                </i>
                Live AI
              </span>
              <button className="mx-icon" id="mxToolToggle">
                tool
              </button>
              <button className="mx-icon" id="mxSettingsOpen">
                set
              </button>
            </div>
          </header>
          <div className="mx-main-body" id="mxMainBody">
          </div>
        </main>
        <aside className="mx-tool-panel" id="mxToolPanel" style={{"display": "none"}}>
          <header>
            <div>
              <span className="mx-eyebrow">
                WORKBENCH
              </span>
              <h2 id="mxToolTitle">
                Calculator
              </h2>
            </div>
            <button className="mx-icon" id="mxToolClose">
              X
            </button>
          </header>
          <div className="mx-tool-body" id="mxToolBody">
          </div>
          <footer>
            <span className="mx-dot">
            </span>
            Tools run on your device
          </footer>
        </aside>
      </div>
      <dialog id="mxSettings" className="mx-settings">
        <header>
          <div>
            <span className="mx-eyebrow">
              MAKE IT YOURS
            </span>
            <h2>
              Your workspace
            </h2>
          </div>
          <button className="mx-icon" id="mxSettingsClose">
            X
          </button>
        </header>
        <label className="mx-field">
          What should Moe call you?
          <input id="mxName" maxLength={80} />
        </label>
        <div style={{"display": "grid", "gridTemplateColumns": "1fr 1fr", "gap": "14px"}}>
          <label className="mx-field">
            Language
            <select id="mxLang">
              <option>
                Auto \u00b7 match me
              </option>
              <option>
                English
              </option>
              <option>
                Egyptian Arabic
              </option>
              <option>
                Franco-Arabic
              </option>
            </select>
          </label>
          <label className="mx-field">
            Answer style
            <select id="mxDetail">
              <option>
                Balanced
              </option>
              <option>
                Short and direct
              </option>
              <option>
                Detailed with examples
              </option>
            </select>
          </label>
        </div>
        <label className="mx-field">
          Things Moe should remember
          <textarea id="mxMemory" rows={3}>
          </textarea>
        </label>
        <label className="mx-field">
          BYO API key (optional)
          <input id="mxApiKey" placeholder="Gemini or Groq key" />
        </label>
        <label className="mx-field">
          Provider
          <select id="mxProvider">
            <option value="auto">
              Auto
            </option>
            <option value="gemini">
              Gemini
            </option>
            <option value="groq">
              Groq
            </option>
          </select>
        </label>
        <label className="mx-switch">
          <div>
            <strong>
              Proactive notes
            </strong>
          </div>
          <input type="checkbox" id="mxProactive" />
        </label>
        <span className="mx-eyebrow">
          WORKSPACE ACCENT
        </span>
        <div className="mx-themes" id="mxThemes">
          <button data-color="ruby" style={{"background": "#f43f6d"}}>
          </button>
          <button data-color="violet" style={{"background": "#b08bff"}}>
          </button>
          <button data-color="ocean" style={{"background": "#48d8ed"}}>
          </button>
          <button data-color="amber" style={{"background": "#f9b55b"}}>
          </button>
        </div>
        <div style={{"display": "flex", "gap": "8px", "justifyContent": "flex-end"}}>
          <button id="mxExportBtn">
            Export
          </button>
          <button id="mxClearBtn">
            Clear
          </button>
        </div>
      </dialog>
      <div id="mxToast" className="mx-toast" style={{"display": "none"}}>
        <span id="mxToastText">
        </span>
        <button id="mxToastClose">
          X
        </button>
      </div>
    </>
  );
}
