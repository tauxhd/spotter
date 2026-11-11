// Weights are always stored in kg. Each viewer sees (and types) them in their own preferred unit.
export type Unit = "kg" | "lb";
export const LB_PER_KG = 2.20462;

export const toUnit = (kg: number, u: Unit = "kg") => (u === "lb" ? kg * LB_PER_KG : kg);
export const fromUnit = (v: number, u: Unit = "kg") => (u === "lb" ? v / LB_PER_KG : v);
// Number only, 1 decimal max: 100 kg -> "220.5" in lb.
export const wNum = (kg: number, u: Unit = "kg") => (Math.round(toUnit(kg, u) * 10) / 10).toLocaleString();
export const w = (kg: number, u: Unit = "kg") => `${wNum(kg, u)} ${u}`;
// Big totals (volume) as whole numbers: "27,216 lb".
export const wTotal = (kg: number, u: Unit = "kg") => `${Math.round(toUnit(kg, u)).toLocaleString()} ${u}`;
