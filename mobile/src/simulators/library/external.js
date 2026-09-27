/**
 * Tools MoeAI links to but does not run itself. They are labelled honestly
 * ("Not integrated with MoeAI"): MoeAI cannot see or check what happens in
 * them. PhET's open-source simulations are listed by what they do; their
 * credit and licence (CC BY 4.0) are on the legal page.
 */
const phet = (sim, title, topics) => ({ id: `phet-${sim}`, title, topics, status: 'external', kind: 'phet', code: JSON.stringify({ sim }) });

export const EXTERNAL_SIMS = [
  { id: 'falstad-circuit', title: 'Circuit simulator (analog and digital)', topics: /logic gate|flip.?flop|circuit|resist|ohm|capacitor|transistor|adder|decoder|multiplexer/, status: 'external', kind: 'frame', url: 'https://www.falstad.com/circuit/circuitjs.html' },
  { id: 'circuitverse', title: 'CircuitVerse logic designer', topics: /logic gate|flip.?flop|adder|decoder|multiplexer|combinational|sequential|boolean/, status: 'external', kind: 'link', url: 'https://circuitverse.org/simulator' },
  { id: 'onecompiler-c', title: 'C / C++ online compiler', topics: /\bc\+\+|\bc programming|structured programming|programming|pointers?\b|control structure/, status: 'external', kind: 'frame', url: 'https://onecompiler.com/embed/cpp?hideNew=true&hideNewFileOption=true' },
  { id: 'onecompiler-java', title: 'Java online compiler', topics: /\bjava\b|object.oriented|\boop\b|class(es)? and objects/, status: 'external', kind: 'frame', url: 'https://onecompiler.com/embed/java?hideNew=true&hideNewFileOption=true' },
  { id: 'geogebra', title: 'Graphing calculator', topics: /graph of|calculus|integra|derivative|conic|parabola|vector|curve/, status: 'external', kind: 'frame', url: 'https://www.geogebra.org/graphing?embed' },
  phet('circuit-construction-kit-dc', 'Circuit construction kit', /circuit|resist|ohm|current and voltage|kirchhoff/),
  phet('calculus-grapher', 'Derivative and integral grapher', /derivative|antideriv|integra|calculus/),
  phet('plinko-probability', 'Binomial distribution board', /binomial|probability|distribution/),
  phet('curve-fitting', 'Curve fitting', /regression|curve fitting|least squares|correlation/),
  phet('projectile-motion', 'Projectile motion lab', /projectile|kinematic|motion in two dimensions/),
  phet('masses-and-springs', 'Masses and springs', /spring|oscillat|simple harmonic|hooke/),
  phet('wave-on-a-string', 'Waves on a string', /wave|frequency|amplitude|standing wave/),
];
