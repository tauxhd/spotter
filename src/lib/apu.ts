import type { Sex } from "./data";

// Mock APU student records, keyed by TP number.
// ponytail: stands in for the APU student API / SSO. Swap apuStudent() for the real lookup; nothing else changes.
export type ApuStudent = { tp: string; name: string; sex: Sex; faculty: string; course: string; intake: string };

const programmes: [faculty: string, course: string, code: string][] = [
  ["Computing", "BSc (Hons) Computer Science", "CS"],
  ["Computing", "BSc (Hons) Software Engineering", "SE"],
  ["Computing", "BSc (Hons) Cyber Security", "CYS"],
  ["Computing", "BSc (Hons) Computer Science (Data Analytics)", "DA"],
  ["Technology", "BSc (Hons) Information Technology", "IT"],
  ["Engineering", "BEng (Hons) Mechatronic Engineering", "ME"],
  ["Engineering", "BEng (Hons) Electrical & Electronic Engineering", "EE"],
  ["Business", "BA (Hons) Business Management", "BM"],
  ["Accounting", "BA (Hons) Accounting & Finance", "AF"],
  ["Design", "BA (Hons) Graphic Design & Multimedia", "GD"],
  ["Psychology", "BSc (Hons) Psychology", "PSY"],
];
const names: Record<Sex, string[]> = {
  M: ["Arif", "Hafiz", "Jun Wei", "Daniel", "Kenji", "Ravi", "Farhan", "Imran", "Wei Jie", "Aiman", "Darren", "Syafiq"],
  F: ["Priya", "Nurul", "Mei Ling", "Aisyah", "Sofia", "Hui Min", "Amira", "Kavya", "Zara", "Iman", "Chloe", "Balqis"],
};
const surnames = ["Rahman", "Tan", "Lim", "Kumar", "Ismail", "Wong", "Abdullah", "Lee", "Nair", "Hassan", "Ong", "Yusof"];

export const isTp = (tp: string) => /^TP\d{6}$/.test(tp);

// Same TP always gives the same student.
export function apuStudent(tp: string): ApuStudent | null {
  tp = tp.trim().toUpperCase();
  if (!isTp(tp)) return null;
  const n = Number(tp.slice(2));
  if (tp === "TP070001") return { tp, name: "Arif Rahman", sex: "M", faculty: "Computing", course: programmes[0][1], intake: "APD2F2602CS" };
  const sex: Sex = n % 2 ? "F" : "M";
  const [faculty, course, code] = programmes[n % programmes.length];
  const name = `${names[sex][Math.floor(n / 2) % names[sex].length]} ${surnames[Math.floor(n / 7) % surnames.length]}`;
  const intake = `APD${2 + (n % 2)}F${24 + (n % 3)}0${2 + (n % 2) * 7}${code}`;
  return { tp, name, sex, faculty, course, intake };
}
