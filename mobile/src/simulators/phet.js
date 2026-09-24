/**
 * PhET Interactive Simulations (University of Colorado Boulder, CC BY 4.0).
 *
 * The HTML5 sims MoeAI can put in a chat or on the Simulators tab. Each runs
 * from PhET's own site, full and adjustable, never copied into ours; MoeAI
 * adds what PhET does not have: tasks for this student, and a tutor to talk
 * the results over with. `subjects` decides which courses list the sim.
 */
export const PHET_SIMS = {
  // Physics
  'projectile-motion': { title: 'Projectile Motion', subjects: 'physics' },
  'pendulum-lab': { title: 'Pendulum Lab', subjects: 'physics' },
  'forces-and-motion-basics': { title: 'Forces and Motion: Basics', subjects: 'physics' },
  'energy-skate-park-basics': { title: 'Energy Skate Park: Basics', subjects: 'physics' },
  'masses-and-springs': { title: 'Masses and Springs', subjects: 'physics' },
  'hookes-law': { title: "Hooke's Law", subjects: 'physics' },
  'collision-lab': { title: 'Collision Lab', subjects: 'physics' },
  'gravity-and-orbits': { title: 'Gravity and Orbits', subjects: 'physics' },
  'wave-on-a-string': { title: 'Wave on a String', subjects: 'physics' },
  'bending-light': { title: 'Bending Light', subjects: 'physics' },
  'geometric-optics': { title: 'Geometric Optics', subjects: 'physics' },
  'coulombs-law': { title: "Coulomb's Law", subjects: 'physics electric' },
  'charges-and-fields': { title: 'Charges and Fields', subjects: 'physics electric' },
  'faradays-law': { title: "Faraday's Law", subjects: 'physics electric' },
  'ohms-law': { title: "Ohm's Law", subjects: 'physics electric logic' },
  'resistance-in-a-wire': { title: 'Resistance in a Wire', subjects: 'physics electric' },
  'circuit-construction-kit-dc': { title: 'Circuit Construction Kit: DC', subjects: 'physics electric logic' },
  'circuit-construction-kit-ac': { title: 'Circuit Construction Kit: AC', subjects: 'physics electric' },
  'capacitor-lab-basics': { title: 'Capacitor Lab: Basics', subjects: 'physics electric' },
  'gas-properties': { title: 'Gas Properties', subjects: 'physics chem' },
  'states-of-matter': { title: 'States of Matter', subjects: 'physics chem' },
  // Maths
  'calculus-grapher': { title: 'Calculus Grapher', subjects: 'math' },
  'graphing-quadratics': { title: 'Graphing Quadratics', subjects: 'math' },
  'graphing-lines': { title: 'Graphing Lines', subjects: 'math' },
  'function-builder': { title: 'Function Builder', subjects: 'math' },
  'trig-tour': { title: 'Trig Tour', subjects: 'math' },
  'vector-addition': { title: 'Vector Addition', subjects: 'math physics' },
  'curve-fitting': { title: 'Curve Fitting', subjects: 'math stats' },
  'plinko-probability': { title: 'Plinko Probability', subjects: 'stats' },
  'area-model-algebra': { title: 'Area Model Algebra', subjects: 'math' },
  // Chemistry
  'build-an-atom': { title: 'Build an Atom', subjects: 'chem' },
  'isotopes-and-atomic-mass': { title: 'Isotopes and Atomic Mass', subjects: 'chem' },
  'molecule-shapes': { title: 'Molecule Shapes', subjects: 'chem' },
  'balancing-chemical-equations': { title: 'Balancing Chemical Equations', subjects: 'chem' },
  'ph-scale': { title: 'pH Scale', subjects: 'chem' },
  'acid-base-solutions': { title: 'Acid-Base Solutions', subjects: 'chem' },
  concentration: { title: 'Concentration', subjects: 'chem' },
  molarity: { title: 'Molarity', subjects: 'chem' },
  'beers-law-lab': { title: "Beer's Law Lab", subjects: 'chem' },
  'reactants-products-and-leftovers': { title: 'Reactants, Products and Leftovers', subjects: 'chem' },
};

export const PHET_CREDIT = 'PhET Interactive Simulations, University of Colorado Boulder · CC BY 4.0';

const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** The official page for a sim, in the student's language where PhET has it. */
export function phetUrl(sim, locale = 'en') {
  if (!SLUG.test(String(sim || ''))) return null;
  const lang = locale === 'ar' ? 'ar' : 'en';
  return `https://phet.colorado.edu/sims/html/${sim}/latest/${sim}_all.html?locale=${lang}`;
}

/** A ```phet block: {"sim": "...", "title"?: "...", "tasks"?: ["..."]}, or just the sim name. */
export function parsePhet(source) {
  const text = String(source || '').trim();
  let spec = null;
  try { spec = JSON.parse(text); } catch (_) { spec = { sim: text.split(/\s+/)[0] }; }
  const sim = String(spec?.sim || '').trim().toLowerCase();
  if (!SLUG.test(sim)) return null;
  return {
    sim,
    title: String(spec.title || PHET_SIMS[sim]?.title || sim.replace(/-/g, ' ')).slice(0, 120),
    tasks: Array.isArray(spec.tasks) ? spec.tasks.map((task) => String(task).slice(0, 240)).filter(Boolean).slice(0, 6) : [],
  };
}
