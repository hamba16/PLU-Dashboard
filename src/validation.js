import { AppError, divisions } from "./access.js";
import { ageFromDOB, educationLevels, skills, validPhone } from "./data.js";
export function passwordValid(password) {
  return (
    typeof password === "string" &&
    password.length >= 12 &&
    password.length <= 128 &&
    /[a-z]/.test(password) &&
    /[A-Z]/.test(password) &&
    /[0-9]/.test(password)
  );
}
export function validateFields(input, status, hasNin = false) {
  if (!input || typeof input !== "object")
    throw new AppError("Registration details are required.");
  const fields = {};
  for (const key of [
    "name",
    "phone",
    "dob",
    "education",
    "subcounty",
    "guardianName",
    "guardianPhone",
  ]) {
    if (
      typeof input[key] !== "string" ||
      input[key].length > (key === "dob" ? 10 : 200)
    )
      throw new AppError(`Invalid ${key}.`);
    fields[key] = input[key].trim();
  }
  if (
    !Array.isArray(input.skills) ||
    input.skills.some((s) => !skills.includes(s)) ||
    input.skills.length > skills.length
  )
    throw new AppError("Invalid skills.");
  fields.skills = [...new Set(input.skills)];
  if (typeof input.consent !== "boolean")
    throw new AppError("Invalid consent.");
  fields.consent = input.consent;
  if (!divisions.includes(input.district))
    throw new AppError("Select a Kampala division.");
  const nin =
    typeof input.nin === "string" ? input.nin.trim().toUpperCase() : "";
  if (nin && !/^[A-Z0-9]{14}$/.test(nin))
    throw new AppError("NIN must contain 14 letters or numbers.");
  const dobValid =
    /^\d{4}-\d{2}-\d{2}$/.test(fields.dob) &&
    !Number.isNaN(Date.parse(fields.dob)) &&
    new Date(fields.dob).toISOString().slice(0, 10) === fields.dob;
  const age = dobValid ? ageFromDOB(fields.dob) : null;
  if (fields.dob && (age === null || age > 120))
    throw new AppError("Enter a valid date of birth.");
  if (fields.education && !educationLevels.includes(fields.education))
    throw new AppError("Invalid education level.");
  if (status !== "draft") {
    if (
      !fields.name ||
      !fields.subcounty ||
      !validPhone(fields.phone) ||
      age === null ||
      !fields.education ||
      (!nin && !hasNin)
    )
      throw new AppError(
        "Complete the required name, phone, NIN, birth date, location and education details.",
      );
    if (
      age < 18 &&
      (!fields.guardianName ||
        !validPhone(fields.guardianPhone) ||
        !fields.consent)
    )
      throw new AppError(
        "Guardian details and consent are required for a minor.",
      );
  }
  return { fields, nin, division: input.district };
}
export function fieldChanges(before, after, ninChanged = false) {
  const changes = {};
  for (const key of Object.keys(after))
    if (JSON.stringify(before[key]) !== JSON.stringify(after[key]))
      changes[key] = { from: before[key] ?? null, to: after[key] };
  if (ninChanged) changes.nin = { changed: true };
  return changes;
}
