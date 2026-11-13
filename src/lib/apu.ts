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
// The account's sign-in address: the student's APU email, so they sign in with TP number + password.
export const tpEmail = (tp: string) => `${tp.trim().toLowerCase()}@mail.apu.edu.my`;
export const authMsg = (e: { code?: string; message: string }) =>
  e.code === "email_exists" || e.code === "user_already_exists" ? "That TP number already has an account. Sign in instead."
  : e.code === "invalid_credentials" ? "Wrong TP number or password" : e.message;
export const courses = programmes.map(([faculty, course]) => ({ faculty, course }));

// Sign-up: the student types their own details. Returns the student, or what to fix.
export function newStudent(f: { tp: string; name: string; course: string; intake: string; sex: Sex | "" }): ApuStudent | string {
  const tp = f.tp.trim().toUpperCase(), name = f.name.trim().replace(/\s+/g, " "), intake = f.intake.trim().toUpperCase();
  const c = courses.find((x) => x.course === f.course);
  if (name.length < 2) return "Enter your full name";
  if (!isTp(tp)) return "TP number looks like TP012345";
  if (!c) return "Pick your course";
  if (intake && !/^[A-Z0-9]{6,16}$/.test(intake)) return "Intake code looks like APD2F2602CS";
  if (!f.sex) return "Pick a category";
  return { tp, name, sex: f.sex, faculty: c.faculty, course: c.course, intake };
}

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
