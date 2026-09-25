/**
 * Hand-drawn icons for the courses where a search result is a coin toss:
 * "Logic Design" came back as a system-design diagram, "Linear Algebra" as a
 * globe, "Differential Equations" as a plain book. These are exact, work
 * offline and take the subject's color like every other icon.
 */
import React from 'react';
import Svg, { Circle, G, Line, Path, Rect, Text as SvgText } from 'react-native-svg';

const stroke = (color) => ({ stroke: color, strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round', fill: 'none' });

/** An AND gate feeding an OR gate: a logic circuit. */
export function LogicGateGlyph({ size = 24, color = '#fff' }) {
  const s = stroke(color);
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M3 4h4.5a4 4 0 0 1 0 8H3z" {...s} />
      <Line x1="1" y1="6" x2="3" y2="6" {...s} />
      <Line x1="1" y1="10" x2="3" y2="10" {...s} />
      <Path d="M11.5 8h2.5v5" {...s} />
      <Path d="M12 13c1.5 0 5 0 7 3.5-2 3.5-5.5 3.5-7 3.5 1.2-2.3 1.2-4.7 0-7z" {...s} />
      <Line x1="9" y1="18" x2="12.4" y2="18" {...s} />
      <Line x1="19" y1="16.5" x2="23" y2="16.5" {...s} />
      <Circle cx="1" cy="6" r="0.9" fill={color} />
      <Circle cx="1" cy="10" r="0.9" fill={color} />
    </Svg>
  );
}

/** A 3x3 matrix in brackets. */
export function MatrixGlyph({ size = 24, color = '#fff' }) {
  const s = stroke(color);
  const dots = [];
  for (let r = 0; r < 3; r += 1) for (let c = 0; c < 3; c += 1) dots.push(<Circle key={`${r}${c}`} cx={8 + c * 4} cy={7 + r * 5} r={1.3} fill={color} />);
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M5 3H3v18h2" {...s} />
      <Path d="M19 3h2v18h-2" {...s} />
      {dots}
    </Svg>
  );
}

/** dy/dx over a rising curve: differential equations. */
export function DerivativeGlyph({ size = 24, color = '#fff' }) {
  const s = stroke(color);
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <G>
        <SvgText x="3" y="9.5" fontSize="8" fontWeight="700" fill={color}>dy</SvgText>
        <Line x1="2.5" y1="11.5" x2="12" y2="11.5" {...s} />
        <SvgText x="3" y="19.5" fontSize="8" fontWeight="700" fill={color}>dx</SvgText>
      </G>
      <Path d="M14 21c3-1 4-5 5-9s1.5-7 3.5-8" {...s} />
      <Line x1="15" y1="13" x2="23" y2="5" {...s} strokeDasharray="1.5 2" />
    </Svg>
  );
}

/** An integral sign over an area: calculus. */
export function IntegralGlyph({ size = 24, color = '#fff' }) {
  const s = stroke(color);
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M10 3.5c-2-1-3.5.5-3.5 2.5v12c0 2-1.5 3.5-3.5 2.5" {...s} />
      <Path d="M11 19c2-6 5-9 10-10" {...s} />
      <Path d="M11 19h10v-10" {...s} strokeDasharray="1.5 2" />
    </Svg>
  );
}

/** Sigma: discrete math, probability, statistics. */
export function SigmaGlyph({ size = 24, color = '#fff' }) {
  const s = stroke(color);
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M18 4H6l7 8-7 8h12" {...s} />
    </Svg>
  );
}

/** A small tree of nodes: data structures and algorithms. */
export function TreeGlyph({ size = 24, color = '#fff' }) {
  const s = stroke(color);
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Line x1="12" y1="6" x2="6" y2="12" {...s} />
      <Line x1="12" y1="6" x2="18" y2="12" {...s} />
      <Line x1="6" y1="12" x2="3.5" y2="18" {...s} />
      <Line x1="6" y1="12" x2="9" y2="18" {...s} />
      <Circle cx="12" cy="5" r="2.4" fill={color} />
      <Circle cx="6" cy="12" r="2.2" fill={color} />
      <Circle cx="18" cy="12" r="2.2" fill={color} />
      <Circle cx="3.5" cy="19" r="1.9" fill={color} />
      <Circle cx="9" cy="19" r="1.9" fill={color} />
    </Svg>
  );
}

/** A resistor between two nodes: circuits and electronics. */
export function CircuitGlyph({ size = 24, color = '#fff' }) {
  const s = stroke(color);
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M2 12h4l1.5-4 3 8 3-8 3 8 1.5-4h4" {...s} />
      <Rect x="1" y="10.5" width="3" height="3" rx="1.5" fill={color} />
      <Rect x="20" y="10.5" width="3" height="3" rx="1.5" fill={color} />
    </Svg>
  );
}

/** Courses with an exact icon, checked before any search. Most specific first. */
const RULES = [
  [/logic (design|circuit)|digital (logic|design|system|electronic|circuit)|boolean|switching theory/, LogicGateGlyph],
  [/differential equation|\bodes?\b|\bpdes?\b|dynamical system/, DerivativeGlyph],
  [/linear algebra|matri(x|ces)|vector space/, MatrixGlyph],
  [/calculus|integral|analysis i/, IntegralGlyph],
  [/discrete|probability|statistic|combinator/, SigmaGlyph],
  [/data structure|algorithm/, TreeGlyph],
  [/circuit|electronic/, CircuitGlyph],
];

export function courseGlyphFor(name) {
  const value = String(name || '').toLowerCase();
  const hit = RULES.find(([re]) => re.test(value));
  return hit ? hit[1] : null;
}
