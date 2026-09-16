export const statuses = [
  "draft",
  "submitted",
  "approved",
  "rejected",
  "needs_correction",
];
export const educationLevels = [
  "none",
  "primary",
  "O-level",
  "A-level",
  "vocational",
  "tertiary",
];
export { divisions as districts } from "./access.js";
export const skills = [
  "ICT",
  "Agriculture",
  "Trade",
  "Public speaking",
  "Sports",
  "Creative arts",
  "Community service",
  "Entrepreneurship",
];
export function ageFromDOB(dob, now = new Date()) {
  if (!dob) return null;
  const date = new Date(`${dob}T00:00:00`);
  if (Number.isNaN(date.getTime()) || date > now) return null;
  let age = now.getFullYear() - date.getFullYear();
  if (
    now.getMonth() < date.getMonth() ||
    (now.getMonth() === date.getMonth() && now.getDate() < date.getDate())
  )
    age--;
  return age;
}
export const maskNIN = (value) =>
  value ? `•••• •••• ${value.slice(-4)}` : "Not provided";
export const normalizePhone = (value) => {
  const digits = value.replace(/\D/g, "");
  return digits.startsWith("0") ? `256${digits.slice(1)}` : digits;
};
export const validPhone = (value) => /^256\d{9}$/.test(normalizePhone(value));
export const emptyForm = () => ({
  name: "",
  nin: "",
  phone: "",
  dob: "",
  education: "",
  district: "",
  subcounty: "",
  skills: [],
  guardianName: "",
  guardianPhone: "",
  consent: false,
});
