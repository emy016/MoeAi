"use client";
/**
 * Simulators
 *
 * Converted from reference/legacy-html/simulators.html by scripts/port-legacy.py.
 * The markup below is that file's <body>, translated HTML -> JSX structurally.
 * The styling lives in ./legacy.css, copied byte-for-byte from its <style>
 * block, and the behaviour lives in /legacy/simulators.js, copied byte-for-byte
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
const SCRIPTS: string[] = [
  "https://cdnjs.cloudflare.com/ajax/libs/nerdamer/1.1.13/all.min.js",
  "https://cdn.jsdelivr.net/npm/nerdamer@1.1.13/all.min.js"
];

export default function Simulators() {
  useLegacyScripts(STYLESHEETS, SCRIPTS, "/legacy/simulators.js");

  return (
    <>
      <div className="crt-overlay" id="crtOverlay">
      </div>
      <div className="topbar">
        <a className="brand" href="#">
          <div className="brand-mark">
            <i className="ic" data-ic="flask">
            </i>
          </div>
          EDUMOE
          <small>
            · Simulators
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
            <i className="ic" data-ic="flask">
            </i>
            Ultimate Simulators
          </h1>
          <p>
            Six fully functional tools — Logic, C++, Probability, Calculus, Discrete Maths, and Physics (DC Circuits).
          </p>
          <div className="kbd-hint">
            <kbd>
              1
            </kbd>
            Logic ·
            <kbd>
              2
            </kbd>
            C++ ·
            <kbd>
              3
            </kbd>
            Probability ·
            <kbd>
              4
            </kbd>
            Calculus ·
            <kbd>
              5
            </kbd>
            Discrete ·
            <kbd>
              6
            </kbd>
            Physics
          </div>
        </div>
        <div className="tabs" id="tabContainer">
          <button className="tab active" data-tab="logic" onClick={legacyHandler("showTab('logic')")}>
            <i className="ic" data-ic="microchip">
            </i>
            Logic
          </button>
          <button className="tab" data-tab="cpp" onClick={legacyHandler("showTab('cpp')")}>
            <i className="ic" data-ic="terminal">
            </i>
            C++
          </button>
          <button className="tab" data-tab="prob" onClick={legacyHandler("showTab('prob')")}>
            <i className="ic" data-ic="dice">
            </i>
            Probability
          </button>
          <button className="tab" data-tab="ode" onClick={legacyHandler("showTab('ode')")}>
            <i className="ic" data-ic="square-root-alt">
            </i>
            Calculus
          </button>
          <button className="tab" data-tab="discrete" onClick={legacyHandler("showTab('discrete')")}>
            <i className="ic" data-ic="project-diagram">
            </i>
            Discrete
          </button>
          <button className="tab" data-tab="physics" onClick={legacyHandler("showTab('physics')")}>
            <i className="ic" data-ic="bolt">
            </i>
            Physics
          </button>
        </div>
        {/* ===========================================================
       VIEW: LOGIC (unchanged)
       =========================================================== */}
        <div className="view active" id="logicView">
          <div className="logic-toolbar">
            <button className="btn btn-sm" onClick={legacyHandler("LOGIC.loadExample('halfadder')")}>
              <i className="ic" data-ic="lightbulb">
              </i>
              Half
            </button>
            <button className="btn btn-sm" onClick={legacyHandler("LOGIC.loadExample('fulladder')")}>
              <i className="ic" data-ic="lightbulb">
              </i>
              Full
            </button>
            <button className="btn btn-sm" onClick={legacyHandler("LOGIC.loadExample('mux')")}>
              <i className="ic" data-ic="lightbulb">
              </i>
              MUX
            </button>
            <span className="sep">
            </span>
            <button className="btn btn-sm" id="undoBtn" onClick={legacyHandler("LOGIC.undo()")}>
              <i className="ic" data-ic="undo">
              </i>
              Undo
            </button>
            <button className="btn btn-sm" onClick={legacyHandler("LOGIC.truthTable()")}>
              <i className="ic" data-ic="table">
              </i>
              Truth
            </button>
            <span className="sep">
            </span>
            <button className="btn btn-sm" onClick={legacyHandler("LOGIC.save()")}>
              <i className="ic" data-ic="save">
              </i>
              Save
            </button>
            <button className="btn btn-sm" onClick={legacyHandler("LOGIC.load()")}>
              <i className="ic" data-ic="folder-open">
              </i>
              Load
            </button>
            <button className="btn btn-sm" onClick={legacyHandler("LOGIC.exportPNG()")}>
              <i className="ic" data-ic="image">
              </i>
              PNG
            </button>
            <span className="sep">
            </span>
            <button className="btn btn-sm btn-danger" onClick={legacyHandler("LOGIC.clear()")}>
              <i className="ic" data-ic="trash">
              </i>
              Clear
            </button>
          </div>
          <div className="logic-body">
            <div className="palette">
              <h4>
                Inputs
              </h4>
              <button className="gate-btn" draggable={true} data-type="INPUT">
                <i className="ic" data-ic="toggle-on">
                </i>
                Switch
              </button>
              <button className="gate-btn" draggable={true} data-type="CLOCK">
                <i className="ic" data-ic="clock">
                </i>
                Clock
              </button>
              <button className="gate-btn" draggable={true} data-type="HIGH">
                <i className="ic" data-ic="1">
                </i>
                1
              </button>
              <button className="gate-btn" draggable={true} data-type="LOW">
                <i className="ic" data-ic="0">
                </i>
                0
              </button>
              <button className="gate-btn" draggable={true} data-type="OUTPUT">
                <i className="ic" data-ic="lightbulb">
                </i>
                LED
              </button>
              <h4>
                Gates
              </h4>
              <button className="gate-btn" draggable={true} data-type="AND">
                <i className="ic" data-ic="times">
                </i>
                AND
              </button>
              <button className="gate-btn" draggable={true} data-type="OR">
                <i className="ic" data-ic="plus">
                </i>
                OR
              </button>
              <button className="gate-btn" draggable={true} data-type="NOT">
                <i className="ic" data-ic="exclamation">
                </i>
                NOT
              </button>
              <button className="gate-btn" draggable={true} data-type="NAND">
                <i className="ic" data-ic="times">
                </i>
                NAND
              </button>
              <button className="gate-btn" draggable={true} data-type="NOR">
                <i className="ic" data-ic="plus">
                </i>
                NOR
              </button>
              <button className="gate-btn" draggable={true} data-type="XOR">
                <i className="ic" data-ic="code-branch">
                </i>
                XOR
              </button>
              <button className="gate-btn" draggable={true} data-type="XNOR">
                <i className="ic" data-ic="code-branch">
                </i>
                XNOR
              </button>
            </div>
            <div className="canvas-area">
              <canvas id="logicCanvas">
              </canvas>
              <div className="zoom-ctrl">
                <button onClick={legacyHandler("LOGIC.zoom(1.2)")} title="In">
                  <i className="ic" data-ic="plus">
                  </i>
                </button>
                <button onClick={legacyHandler("LOGIC.zoom(0.8)")} title="Out">
                  <i className="ic" data-ic="minus">
                  </i>
                </button>
                <button onClick={legacyHandler("LOGIC.resetView()")} title="Reset">
                  <i className="ic" data-ic="compress">
                  </i>
                </button>
              </div>
              <div className="canvas-hint" id="hint">
                Drag gates · click switch to toggle · drag output→input to wire · click wire to delete
              </div>
            </div>
            <div className="panel">
              <h3>
                <i className="ic" data-ic="terminal">
                </i>
                Expression
              </h3>
              <div className="expr-box" id="exprBox">
                —
              </div>
              <h3>
                <i className="ic" data-ic="table">
                </i>
                Truth Table
              </h3>
              <div id="ttContent">
                <div className="empty-note">
                  Add switches, gates, and an LED, wire them up, then hit
                  <b>
                    Truth
                  </b>
                  .
                </div>
              </div>
              <div className="legend">
                <div>
                  <span className="dot on">
                  </span>
                  <b>
                    1
                  </b>
                  <span className="dot off">
                  </span>
                  <b>
                    0
                  </b>
                </div>
                <div style={{"marginTop": "4px"}}>
                  <kbd>
                    Del
                  </kbd>
                  delete ·
                  <kbd>
                    Ctrl+Z
                  </kbd>
                  undo
                </div>
              </div>
            </div>
          </div>
        </div>
        {/* ===========================================================
       VIEW: C++ (unchanged)
       =========================================================== */}
        <div className="view" id="cppView">
          <div className="cpp-toolbar">
            <select id="langSelect" onChange={legacyHandler("switchLang()")}>
              <option value="cpp">
                C++
              </option>
              <option value="c">
                C
              </option>
              <option value="python">
                Python
              </option>
              <option value="java">
                Java
              </option>
            </select>
            <span style={{"fontSize": "11px", "color": "var(--txt3)", "marginLeft": "auto"}}>
              <i className="ic" data-ic="info-circle">
              </i>
              OneCompiler
            </span>
          </div>
          <div className="cpp-frame">
            <iframe id="ocFrame" src="https://onecompiler.com/embed/cpp?theme=dark&hideTitle=true&hideNew=true&hideStdin=false" allowFullScreen={true} title="C++ Compiler">
            </iframe>
          </div>
        </div>
        {/* ===========================================================
       VIEW: PROBABILITY (FUE-aligned – fixed)
       =========================================================== */}
        <div className="view" id="probView">
          <div className="prob-toolbar">
            <div className="pill-group">
              <button className="mode-pill active" data-mode="practice" onClick={legacyHandler("PROB.setMode('practice',this)")}>
                🎯 Practice
              </button>
              <button className="mode-pill" data-mode="dist" onClick={legacyHandler("PROB.setMode('dist',this)")}>
                📊 Distributions
              </button>
              <button className="mode-pill" data-mode="sets" onClick={legacyHandler("PROB.setMode('sets',this)")}>
                📐 Venn / Sets
              </button>
              <button className="mode-pill" data-mode="bayes" onClick={legacyHandler("PROB.setMode('bayes',this)")}>
                🧠 Bayes Tree
              </button>
            </div>
            <select id="probTopic" onChange={legacyHandler("PROB.newProblem()")} style={{"display": "none"}}>
              <option value="mixed">
                Mixed
              </option>
              <option value="counting">
                Counting
              </option>
              <option value="addition">
                Addition
              </option>
              <option value="conditional">
                Conditional
              </option>
              <option value="bayes">
                Bayes
              </option>
              <option value="binomial">
                Binomial
              </option>
              <option value="poisson">
                Poisson
              </option>
              <option value="geometric">
                Geometric
              </option>
            </select>
          </div>
          <div className="prob-body">
            <div className="prob-practice active" id="probPractice">
              <div id="probPracticeContent">
              </div>
            </div>
            <div className="prob-chart-wrap" id="probChartWrap" style={{"display": "none"}}>
              <canvas id="probCanvas">
              </canvas>
              <div className="prob-dist-tabs" id="distTabs" style={{"marginTop": "6px"}}>
                <button className="prob-dist-tab active" data-dist="normal" onClick={legacyHandler("PROB.setDist('normal',this)")}>
                  Normal
                </button>
                <button className="prob-dist-tab" data-dist="binomial" onClick={legacyHandler("PROB.setDist('binomial',this)")}>
                  Binomial
                </button>
                <button className="prob-dist-tab" data-dist="poisson" onClick={legacyHandler("PROB.setDist('poisson',this)")}>
                  Poisson
                </button>
                <button className="prob-dist-tab" data-dist="exponential" onClick={legacyHandler("PROB.setDist('exponential',this)")}>
                  Exponential
                </button>
              </div>
            </div>
            <div className="prob-panel" id="probPanel">
            </div>
          </div>
        </div>
        {/* ===========================================================
       VIEW: CALCULUS / ODE (FUE-aligned – removed Taylor)
       =========================================================== */}
        <div className="view" id="odeView">
          <div className="calc-toolbar">
            <select id="calcMode" onChange={legacyHandler("ODE.mode()")}>
              <option value="integral">
                ∫ Integrate
              </option>
              <option value="derivative">
                d/dx Differentiate
              </option>
              <option value="defint">
                ∫ₐᵇ Definite
              </option>
              <option value="odeplot">
                dy/dx ODE
              </option>
              <option value="simplify">
                🧹 Simplify
              </option>
            </select>
            <input id="calcInput" className="calc-input" placeholder="e.g.  x^3*e^x" spellCheck={false} onKeyDown={legacyHandler("if(event.key==='Enter')ODE.solve()")} />
            <span className="calc-extra" id="calcExtra">
            </span>
            <button className="btn btn-primary" onClick={legacyHandler("ODE.solve()")}>
              <i className="ic" data-ic="play">
              </i>
              Solve
            </button>
            <div className="calc-presets">
              <button onClick={legacyHandler("ODE.applyPreset('x^2')")}>
                x²
              </button>
              <button onClick={legacyHandler("ODE.applyPreset('sin(x)')")}>
                sin
              </button>
              <button onClick={legacyHandler("ODE.applyPreset('e^x')")}>
                eˣ
              </button>
              <button onClick={legacyHandler("ODE.applyPreset('1/x')")}>
                1/x
              </button>
            </div>
          </div>
          <div className="calc-hint" id="calcHint">
            Use
            <code>
              ^
            </code>
            powers,
            <code>
              *
            </code>
            multiply,
            <code>
              sin, cos, e^x, ln(x), sqrt(x)
            </code>
            .
          </div>
          <div className="calc-body">
            <div className="calc-work" id="calcWork">
              <div style={{"color": "var(--txt3)", "fontSize": "13px", "textAlign": "center", "padding": "30px 0"}}>
                Enter an expression and press Solve.
              </div>
            </div>
            <div className="calc-side" id="calcSide">
              <h4>
                📜 History
              </h4>
              <div id="calcHistory" style={{"fontSize": "11px", "color": "var(--txt3)"}}>
                <div style={{"padding": "6px 0"}}>
                  No history yet.
                </div>
              </div>
              <h4 style={{"marginTop": "8px"}}>
                ⚡ Rules
              </h4>
              <div className="stat-list">
                <div className="stat-row">
                  <span>
                    ∫xⁿ
                  </span>
                  <span>
                    xⁿ⁺¹/(n+1)
                  </span>
                </div>
                <div className="stat-row">
                  <span>
                    ∫eˣ
                  </span>
                  <span>
                    eˣ
                  </span>
                </div>
                <div className="stat-row">
                  <span>
                    ∫1/x
                  </span>
                  <span>
                    ln|x|
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
        {/* ===========================================================
       VIEW: DISCRETE (FUE-aligned – cleaned)
       =========================================================== */}
        <div className="view" id="discreteView">
          <div className="dm-toolbar">
            <div className="pill-group">
              <button className="mode-pill active" data-mode="truth" onClick={legacyHandler("DM.setMode('truth',this)")}>
                Truth Table
              </button>
              <button className="mode-pill" data-mode="sets" onClick={legacyHandler("DM.setMode('sets',this)")}>
                Set Calculator
              </button>
              <button className="mode-pill" data-mode="venn" onClick={legacyHandler("DM.setMode('venn',this)")}>
                Venn Diagram
              </button>
              <button className="mode-pill" data-mode="combinatorics" onClick={legacyHandler("DM.setMode('combinatorics',this)")}>
                Combinatorics
              </button>
              <button className="mode-pill" data-mode="functions" onClick={legacyHandler("DM.setMode('functions',this)")}>
                Functions
              </button>
              <button className="mode-pill" data-mode="relations" onClick={legacyHandler("DM.setMode('relations',this)")}>
                Relations
              </button>
              <button className="mode-pill" data-mode="modular" onClick={legacyHandler("DM.setMode('modular',this)")}>
                GCD & Modular
              </button>
              <button className="mode-pill" data-mode="induction" onClick={legacyHandler("DM.setMode('induction',this)")}>
                Induction Helper
              </button>
            </div>
          </div>
          <div className="dm-body">
            <div className="dm-work" id="dmWork">
              <div style={{"color": "var(--txt3)", "fontSize": "13px", "textAlign": "center", "padding": "30px 0"}}>
                Select a tool above.
              </div>
            </div>
            <div className="dm-side" id="dmSide">
              <div style={{"fontSize": "11px", "color": "var(--txt3)", "padding": "4px 0", "borderBottom": "1px solid var(--glass-border)", "fontWeight": "700"}}>
                Quick Reference
              </div>
              <div className="dm-rule">
                ¬ (NOT) — negation
              </div>
              <div className="dm-rule">
                ∧ (AND) — conjunction
              </div>
              <div className="dm-rule">
                ∨ (OR) — disjunction
              </div>
              <div className="dm-rule">
                → (IMPLIES) — implication
              </div>
              <div className="dm-rule">
                ↔ (IFF) — biconditional
              </div>
              <div className="dm-rule">
                ∪ — union · ∩ — intersection
              </div>
              <div className="dm-rule">
                |P(A)| = 2ⁿ (power set)
              </div>
              <div className="dm-rule">
                nPr = n!/(n−r)!
              </div>
              <div className="dm-rule">
                nCr = n!/(r!(n−r)!)
              </div>
              <div className="dm-rule">
                gcd(a,b)·lcm(a,b) = a·b
              </div>
              <div className="dm-rule">
                Injective: no two inputs share an output
              </div>
              <div className="dm-rule">
                Surjective: every output is hit
              </div>
            </div>
          </div>
        </div>
        {/* ===========================================================
       VIEW: PHYSICS (FUE-aligned – DC Circuits + PHET-style)
       =========================================================== */}
        <div className="view" id="physicsView">
          <div className="phys-toolbar">
            <div className="pill-group">
              <span className="pill-group-label" style={{"fontSize": "10px", "textTransform": "uppercase", "letterSpacing": ".07em", "color": "var(--txt3)", "fontWeight": "700", "marginRight": "2px"}}>
                DC Circuits
              </span>
              <button className="mode-pill active" data-mode="ohms" onClick={legacyHandler("PHYS.setMode('ohms',this)")}>
                Ohm's Law
              </button>
              <button className="mode-pill" data-mode="resistors" onClick={legacyHandler("PHYS.setMode('resistors',this)")}>
                Resistors (2)
              </button>
              <button className="mode-pill" data-mode="capacitors" onClick={legacyHandler("PHYS.setMode('capacitors',this)")}>
                Capacitors (2)
              </button>
              <button className="mode-pill" data-mode="circuit" onClick={legacyHandler("PHYS.setMode('circuit',this)")}>
                ⚡ Circuit Sim
              </button>
            </div>
          </div>
          <div className="phys-body">
            <div className="phys-work" id="physWork">
              <div style={{"color": "var(--txt3)", "fontSize": "13px", "textAlign": "center", "padding": "30px 0"}}>
                Select a tool above.
              </div>
            </div>
            <div className="phys-side" id="physSide">
              <div style={{"fontSize": "11px", "color": "var(--txt3)", "padding": "4px 0", "borderBottom": "1px solid var(--glass-border)", "fontWeight": "700"}}>
                DC Circuit Formulas
              </div>
              <div className="phys-const">
                <b>
                  V
                </b>
                = IR (Ohm's Law)
              </div>
              <div className="phys-const">
                <b>
                  P
                </b>
                = VI = I²R = V²/R
              </div>
              <div className="phys-const">
                <b>
                  Series (R)
                </b>
                : R_eq = R₁ + R₂
              </div>
              <div className="phys-const">
                <b>
                  Parallel (R)
                </b>
                : 1/R_eq = 1/R₁ + 1/R₂
              </div>
              <div className="phys-const">
                <b>
                  Series (C)
                </b>
                : 1/C_eq = 1/C₁ + 1/C₂
              </div>
              <div className="phys-const">
                <b>
                  Parallel (C)
                </b>
                : C_eq = C₁ + C₂
              </div>
              <div style={{"fontSize": "11px", "color": "var(--txt3)", "padding": "4px 0", "borderBottom": "1px solid var(--glass-border)", "fontWeight": "700", "marginTop": "6px"}}>
                Constants
              </div>
              <div className="phys-const">
                <b>
                  k
                </b>
                = 8.99×10⁹ N·m²/C²
              </div>
              <div className="phys-const">
                <b>
                  ε₀
                </b>
                = 8.85×10⁻¹² C²/N·m²
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="toast" id="toast">
        <span id="toastMsg">
        </span>
      </div>
    </>
  );
}
