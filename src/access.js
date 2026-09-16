export const roles = [
  "registration",
  "approval",
  "admin-readonly",
  "admin-full",
];
export const divisions = [
  "Kampala Central",
  "Kawempe",
  "Makindye",
  "Nakawa",
  "Rubaga",
];
export const editableStatuses = ["draft", "submitted", "needs_correction"];
export const canCreate = (actor) =>
  ["registration", "admin-full"].includes(actor?.role);
export const canView = (actor, record) =>
  !!actor &&
  (actor.role !== "registration" || actor.division === record.division);
export const canEdit = (actor, record) =>
  canView(actor, record) &&
  record.status !== "rejected" &&
  (actor.role === "admin-full" ||
    (actor.role === "registration" &&
      actor.id === record.owner_id &&
      editableStatuses.includes(record.status)));
export const canReview = (actor, record) =>
  ["approval", "admin-full"].includes(actor?.role) &&
  record.status === "submitted";
export function validAssignment(role, division) {
  return (
    roles.includes(role) &&
    (role === "registration" ? divisions.includes(division) : division === null)
  );
}
export class AppError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.status = status;
  }
}
export function requireRight(
  condition,
  message = "You do not have permission for this action.",
) {
  if (!condition) throw new AppError(message, 403);
}
