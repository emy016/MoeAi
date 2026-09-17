"use client";
/**
 * Ranked
 *
 * Converted from reference/legacy-html/ranked.html by scripts/port-legacy.py.
 * The markup below is that file's <body>, translated HTML -> JSX structurally.
 * The styling lives in ./legacy.css, copied byte-for-byte from its <style>
 * block, and the behaviour lives in /legacy/ranked.js, copied byte-for-byte
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

export default function Ranked() {
  useLegacyScripts(STYLESHEETS, SCRIPTS, "/legacy/ranked.js");

  return (
    <>
      <div className="crt-overlay" id="crtOverlay">
      </div>
      {/* ─── TOP BAR ───────────────────────────────────────────────── */}
      <div className="topbar">
        <a className="brand" href="#">
          <div className="brand-mark">
            <i className="ic" data-ic="trophy">
            </i>
          </div>
          EDUMOE
          <small>
            · Ranked
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
      {/* ─── CONTENT ───────────────────────────────────────────────── */}
      <div className="wrap" id="app">
        <div className="page-head">
          <h1>
            <i className="ic" data-ic="trophy">
            </i>
            Ultimate Ranked Arena
          </h1>
          <p>
            Compete against 8 unique bots, climb the Elo ladder, and prove your mastery.
          </p>
          <div className="stats-row" id="statsRow">
            <div className="stat-pill">
              🏆
              <span className="num" id="statElo">
                1200
              </span>
              Elo
            </div>
            <div className="stat-pill">
              ✅
              <span className="num" id="statWins">
                0
              </span>
              wins
            </div>
            <div className="stat-pill">
              📊
              <span className="num" id="statWR">
                0%
              </span>
              win rate
            </div>
            <div className="stat-pill">
              👾
              <span className="num" id="statMatches">
                0
              </span>
              matches
            </div>
            <div className="stat-pill">
              🔥
              <span className="num" id="statStreak">
                0
              </span>
              streak
            </div>
            <div className="stat-pill">
              🏅
              <span className="num" id="statAchievements">
                0
              </span>
              achievements
            </div>
          </div>
        </div>
        <div className="mode-tabs" id="modeTabs">
          <button className="mode-tab active" data-mode="profile" onClick={legacyHandler("showMode('profile')")}>
            <i className="ic" data-ic="user">
            </i>
            Profile
          </button>
          <button className="mode-tab" data-mode="play" onClick={legacyHandler("showMode('play')")}>
            <i className="ic" data-ic="zap">
            </i>
            Play
          </button>
          <button className="mode-tab" data-mode="gauntlet" onClick={legacyHandler("showMode('gauntlet')")}>
            <i className="ic" data-ic="fire">
            </i>
            Gauntlet
          </button>
          <button className="mode-tab" data-mode="tournament" onClick={legacyHandler("showMode('tournament')")}>
            <i className="ic" data-ic="trophy">
            </i>
            Tournament
          </button>
          <button className="mode-tab" data-mode="leaderboard" onClick={legacyHandler("showMode('leaderboard')")}>
            <i className="ic" data-ic="list">
            </i>
            Leaderboard
          </button>
          <button className="mode-tab" data-mode="history" onClick={legacyHandler("showMode('history')")}>
            <i className="ic" data-ic="clock">
            </i>
            History
          </button>
          <button className="mode-tab" data-mode="achievements" onClick={legacyHandler("showMode('achievements')")}>
            <i className="ic" data-ic="medal">
            </i>
            Achievements
            <span className="badge" id="achBadge">
              0
            </span>
          </button>
        </div>
        {/* Profile */}
        <div id="profileMode">
          <div id="profileContainer">
          </div>
        </div>
        {/* Play */}
        <div id="playMode" style={{"display": "none"}}>
          <div className="rank-grid" id="playGrid">
          </div>
        </div>
        {/* Gauntlet */}
        <div id="gauntletMode" style={{"display": "none"}}>
          <div id="gauntletContainer">
          </div>
        </div>
        {/* Tournament */}
        <div id="tournamentMode" style={{"display": "none"}}>
          <div id="tournamentContainer">
          </div>
        </div>
        {/* Leaderboard */}
        <div id="leaderboardMode" style={{"display": "none"}}>
          <div className="lb-filters" id="lbFilters">
            <button className="lb-filter active" data-period="all" onClick={legacyHandler("setLeaderboardPeriod('all', this)")}>
              All Time
            </button>
            <button className="lb-filter" data-period="weekly" onClick={legacyHandler("setLeaderboardPeriod('weekly', this)")}>
              This Week
            </button>
            <button className="lb-filter" data-period="monthly" onClick={legacyHandler("setLeaderboardPeriod('monthly', this)")}>
              This Month
            </button>
            <button className="lb-filter" data-period="season" onClick={legacyHandler("setLeaderboardPeriod('season', this)")}>
              Season 1
            </button>
          </div>
          <div className="lb-container" id="leaderboardContainer">
          </div>
        </div>
        {/* History */}
        <div id="historyMode" style={{"display": "none"}}>
          <div id="historyContainer">
          </div>
        </div>
        {/* Achievements */}
        <div id="achievementsMode" style={{"display": "none"}}>
          <div id="achievementsContainer">
          </div>
        </div>
        {/* Match / Results */}
        <div id="matchContainer" style={{"display": "none"}}>
        </div>
        <div id="resultsContainer" style={{"display": "none"}}>
        </div>
      </div>
      <div className="toast" id="toast">
        <span id="toastMsg">
        </span>
      </div>
      <div className="modal-overlay" id="tournamentModal">
        <div className="modal-box">
          <h2>
            🏆 Tournament
            <button className="close-modal" onClick={legacyHandler("closeTournamentModal()")}>
              ✕
            </button>
          </h2>
          <div id="tournamentModalContent">
          </div>
        </div>
      </div>
    </>
  );
}
