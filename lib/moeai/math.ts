import { parse, derivative, format } from "mathjs";
const functions = new Set(["sin", "cos", "tan", "sqrt", "abs", "log", "exp", "floor", "ceil", "round", "min", "max"]);
export function expression(source: string, variables: string[] = []) {
  if (!source.trim() || source.length > 300) throw new Error("Use an expression between 1 and 300 characters.");
  const node = parse(source); let count = 0;
  node.traverse(n => {
    if (++count > 100 || !["OperatorNode", "ConstantNode", "SymbolNode", "FunctionNode", "ParenthesisNode"].includes(n.type)) throw new Error("Use a scalar expression with numbers and basic functions.");
    if (n.type === "FunctionNode" && !functions.has((n as unknown as {name: string}).name)) throw new Error("Supported functions: sin, cos, tan, sqrt, abs, log, exp, floor, ceil, round, min, max.");
    if (n.type === "SymbolNode" && ![...variables, "pi", "e", "true", "false", ...functions].includes((n as unknown as {name: string}).name)) throw new Error("Unknown variable or function.");
    if (n.type === "OperatorNode" && !["+", "-", "*", "/", "^", "%", "and", "or", "xor", "not", "==", "!=", "<", ">", "<=", ">="].includes((n as unknown as {op: string}).op)) throw new Error("This operator is not supported.");
  }); return node;
}
export function calculate(source: string) { const value = expression(source).compile().evaluate(); if (typeof value !== "number" || !Number.isFinite(value)) throw new Error("The result is not a finite real number."); return format(value, { precision: 12 }); }
export function differentiate(source: string) { expression(source, ["x"]); return derivative(source, "x").toString(); }
export function graphPoints(source: string) { const compiled = expression(source, ["x"]).compile(); return Array.from({ length: 241 }, (_, i) => { const x = -10 + i / 12; try { const y = compiled.evaluate({ x }); return { x, y: typeof y === "number" && Number.isFinite(y) && Math.abs(y) <= 10 ? y : null }; } catch { return { x, y: null }; } }); }
export function truthTable(source: string) { const compiled = expression(source, ["A", "B", "C"]).compile(); return Array.from({length: 8}, (_, i) => { const A = Boolean(i & 4), B = Boolean(i & 2), C = Boolean(i & 1); return { A, B, C, value: Boolean(compiled.evaluate({ A, B, C })) }; }); }
