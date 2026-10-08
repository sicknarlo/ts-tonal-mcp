export function isAllowedLogin(login: string, allowlist: string): boolean {
  const allowed = allowlist
    .split(',')
    .map((entry) => entry.trim().toLowerCase())
    .filter(Boolean);
  return allowed.includes(login.toLowerCase());
}
