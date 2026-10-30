export function isAdminUser(role?: string | null) {
  return String(role ?? "")
    .toLowerCase()
    .includes("admin");
}
