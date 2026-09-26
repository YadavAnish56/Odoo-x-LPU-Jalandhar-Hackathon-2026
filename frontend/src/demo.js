// Demo accounts shown on the sign-in page (created by `npm run db:seed`).
// When one of them changes its password here (My Profile or "Forgot password"), the new password is
// remembered in this browser, so the sign-in page always shows the password that works.
export const DEMO_STORAGE_KEY = 'stocksense_demo_accounts';
const OLD_KEY = 'stocksense_demo_account'; // earlier version: manager only

const DEFAULTS = [
  { role: 'manager', label: 'Manager account', email: 'manager@stocksense.com', password: 'Manager@123' },
  { role: 'staff', label: 'Staff account', email: 'staff@stocksense.com', password: 'Staff@123' },
];

/** Saved changes: { manager: { email, password }, staff: { email, password } } */
function loadSaved() {
  try {
    const saved = JSON.parse(localStorage.getItem(DEMO_STORAGE_KEY) || 'null');
    if (saved) return saved;
    const old = JSON.parse(localStorage.getItem(OLD_KEY) || 'null');
    return old ? { manager: old } : {};
  } catch {
    return {};
  }
}

export function getDemoAccounts() {
  const saved = loadSaved();
  return DEFAULTS.map((account) => ({ ...account, ...saved[account.role] }));
}

function save(role, changes) {
  const saved = loadSaved();
  saved[role] = { ...saved[role], ...changes };
  try {
    localStorage.setItem(DEMO_STORAGE_KEY, JSON.stringify(saved));
    localStorage.removeItem(OLD_KEY);
  } catch {
    /* storage unavailable - the defaults are shown */
  }
}

const findByEmail = (email) =>
  getDemoAccounts().find((a) => a.email.toLowerCase() === String(email ?? '').trim().toLowerCase());

/** Call after a successful sign-in or a password change / reset. */
export function rememberDemoPassword(email, password) {
  const account = findByEmail(email);
  if (account && password) save(account.role, { email: account.email, password });
}

/** Call after a demo account changes its email in My Profile. */
export function rememberDemoEmail(oldEmail, newEmail) {
  const account = findByEmail(oldEmail);
  if (account && newEmail) save(account.role, { email: newEmail.trim().toLowerCase(), password: account.password });
}
