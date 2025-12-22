export function isAdminEmail(email: string | null | undefined) {
  if (!email) return false;
  const allow = (process.env.ADMIN_EMAIL_ALLOWLIST || "")
    .split(",")
    .map(s => s.trim().toLowerCase())
    .filter(Boolean);
  return allow.includes(email.toLowerCase());
}
