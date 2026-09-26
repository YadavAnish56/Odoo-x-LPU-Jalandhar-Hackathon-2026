// Authentication: sign in, sign up and OTP-based password reset.
import { api, clearSession, errorMessage, setSession } from '../api.js';
import { DEMO_STORAGE_KEY, getDemoAccounts, rememberDemoPassword } from '../demo.js';
import { invalidateLookups } from '../store.js';
import { esc, INPUT, LABEL, showToast } from '../utils.js';

let authView = 'login'; // login | signup | forgot | otp | reset
let onLoginHandler = () => {};
const reset = { email: '', otp: '', devOtp: '' };
let resendTimer = null;

const SUBMIT = 'w-full h-10 rounded-md bg-primary-container hover:bg-primary-container/90 text-on-primary text-[14px] font-medium transition-colors disabled:opacity-60';
const LINK = 'text-primary hover:underline font-medium';

const input = (label, name, type, attrs = '') =>
  `<label class="flex flex-col gap-1.5"><span class="${LABEL}">${label}</span><input type="${type}" name="${name}" ${attrs} class="${INPUT}"/></label>`;

function renderAuth() {
  const container = document.getElementById('auth-screen');
  if (!container) return;
  clearInterval(resendTimer);
  const views = { login: loginView, signup: signupView, forgot: forgotView, otp: otpView, reset: resetView };

  container.innerHTML = `
    <div class="min-h-screen flex flex-col items-center justify-center bg-background px-4 py-10">
      <button type="button" data-theme-toggle class="fixed top-4 right-4 p-2 rounded-md text-secondary hover:bg-surface-container-low hover:text-on-surface" title="Dark / light mode" aria-label="Toggle dark mode">
        <span class="material-symbols-outlined dark:hidden">dark_mode</span>
        <span class="material-symbols-outlined hidden dark:inline">light_mode</span>
      </button>
      <div class="w-full max-w-[400px]">
        <div class="flex items-center justify-center gap-2.5 mb-6">
          <img src="/favicon.svg" alt="" width="34" height="34"/>
          <span class="text-[22px] font-semibold tracking-tight">StockSense</span>
        </div>
        <div id="auth-card" class="bg-surface-container-lowest border border-surface-container rounded-lg p-6 sm:p-7">
          ${views[authView]()}
        </div>
      </div>
    </div>`;
  wireAuthEvents();
}

/** Manager and staff demo accounts with their current passwords. */
function demoAccountsHTML() {
  return `
    <div class="mt-5 rounded-md border border-surface-container bg-surface-container-low/60 divide-y divide-surface-container">
      ${getDemoAccounts()
        .map(
          (a) => `
        <div class="p-3" data-demo-account="${a.role}">
          <div class="flex items-center justify-between mb-2">
            <span class="text-[12px] font-medium text-secondary">${esc(a.label)}</span>
            <button type="button" data-use-demo="${a.role}" class="text-[12px] ${LINK} disabled:opacity-60">Use this account</button>
          </div>
          <div class="grid grid-cols-[1fr_8rem] gap-4 text-[13px]">
            <div class="min-w-0"><div class="text-[11px] text-secondary">Email</div><div data-demo-email class="font-mono truncate">${esc(a.email)}</div></div>
            <div class="min-w-0"><div class="text-[11px] text-secondary">Password</div><div data-demo-password class="font-mono truncate" title="${esc(a.password)}">${esc(a.password)}</div></div>
          </div>
        </div>`,
        )
        .join('')}
    </div>`;
}

/** Updates the shown passwords in place (e.g. when another tab changed one). */
function refreshDemoAccounts() {
  for (const a of getDemoAccounts()) {
    const box = document.querySelector(`[data-demo-account="${a.role}"]`);
    if (!box) continue;
    box.querySelector('[data-demo-email]').textContent = a.email;
    box.querySelector('[data-demo-password]').textContent = a.password;
  }
}

window.addEventListener('storage', (e) => {
  if (e.key === DEMO_STORAGE_KEY) refreshDemoAccounts();
});

function loginView() {
  return `
    <h1 class="text-[18px] font-semibold mb-5">Sign in</h1>
    <form id="login-form" class="flex flex-col gap-4">
      ${input('Email', 'email', 'email', `id="login-email" value="${esc(reset.email)}" required autocomplete="username"`)}
      ${input('Password', 'password', 'password', 'id="login-password" required autocomplete="current-password"')}
      <div class="flex items-center justify-between text-[13px]">
        <label class="flex items-center gap-2 cursor-pointer text-secondary"><input type="checkbox" name="remember" checked class="w-4 h-4 accent-primary-container"/>Remember me</label>
        <button type="button" class="${LINK}" data-auth-nav="forgot">Forgot password?</button>
      </div>
      <button type="submit" class="${SUBMIT}">Sign in</button>
    </form>

    ${demoAccountsHTML()}

    <p class="text-center text-[13px] text-secondary mt-5">No account? <button class="${LINK}" data-auth-nav="signup">Create one</button></p>`;
}

function signupView() {
  return `
    <h1 class="text-[18px] font-semibold mb-5">Create account</h1>
    <form id="signup-form" class="flex flex-col gap-4">
      ${input('Full name', 'name', 'text', 'required minlength="2" autocomplete="name"')}
      ${input('Email', 'email', 'email', 'required autocomplete="email"')}
      ${input('Password', 'password', 'password', 'required minlength="8" autocomplete="new-password"')}
      ${input('Confirm password', 'confirm', 'password', 'required autocomplete="new-password"')}
      <p class="text-[12px] text-secondary -mt-2">At least 8 characters, including a letter and a number.</p>
      <button type="submit" class="${SUBMIT}">Create account</button>
    </form>
    <p class="text-center text-[13px] text-secondary mt-5">Already registered? <button class="${LINK}" data-auth-nav="login">Sign in</button></p>`;
}

function forgotView() {
  return `
    <h1 class="text-[18px] font-semibold mb-1">Reset password</h1>
    <p class="text-[13px] text-secondary mb-5">We will send a 6-digit code to your email.</p>
    <form id="forgot-form" class="flex flex-col gap-4">
      ${input('Email', 'email', 'email', `value="${esc(reset.email)}" required autocomplete="email"`)}
      <button type="submit" class="${SUBMIT}">Send code</button>
    </form>
    <p class="text-center text-[13px] mt-5"><button class="${LINK}" data-auth-nav="login">Back to sign in</button></p>`;
}

function otpView() {
  return `
    <h1 class="text-[18px] font-semibold mb-1">Enter code</h1>
    <p class="text-[13px] text-secondary mb-5">Sent to <span class="text-on-surface font-medium">${esc(reset.email)}</span></p>
    ${reset.devOtp ? `<p class="mb-4 rounded-md bg-info-soft text-info px-3 py-2 text-[13px]">Email is not set up, so here is your code: <span class="font-mono font-semibold tracking-widest">${esc(reset.devOtp)}</span></p>` : ''}
    <form id="otp-form" class="flex flex-col gap-4">
      <div class="flex items-center justify-between gap-2">
        ${[1, 2, 3, 4, 5, 6].map(() => `<input type="text" inputmode="numeric" maxlength="1" autocomplete="one-time-code" class="otp-input w-full h-12 text-center text-[20px] font-semibold rounded-md border border-surface-container-high bg-surface-container-lowest outline-none focus:border-primary-container focus:ring-2 focus:ring-primary-container/20"/>`).join('')}
      </div>
      <button type="submit" class="${SUBMIT}">Verify</button>
    </form>
    <p class="text-center text-[13px] text-secondary mt-4"><button id="resend-otp" class="${LINK} disabled:text-secondary disabled:no-underline disabled:font-normal" disabled>Resend code in <span id="resend-timer">60</span>s</button></p>
    <p class="text-center text-[13px] mt-2"><button class="${LINK}" data-auth-nav="forgot">Use a different email</button></p>`;
}

function resetView() {
  return `
    <h1 class="text-[18px] font-semibold mb-5">New password</h1>
    <form id="reset-form" class="flex flex-col gap-4">
      ${input('New password', 'password', 'password', 'required minlength="8" autocomplete="new-password"')}
      ${input('Confirm password', 'confirm', 'password', 'required autocomplete="new-password"')}
      <p class="text-[12px] text-secondary -mt-2">At least 8 characters, including a letter and a number.</p>
      <button type="submit" class="${SUBMIT}">Save password</button>
    </form>`;
}

function go(view) {
  authView = view;
  renderAuth();
}

/** Wraps a form submit: disables the button while the request runs and shows errors. */
function onSubmit(form, handler) {
  form?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = form.querySelector('[type=submit]');
    const label = btn.textContent;
    btn.disabled = true;
    btn.textContent = 'Please wait...';
    try {
      await handler(Object.fromEntries(new FormData(form)));
    } catch (err) {
      showToast(errorMessage(err), 'error');
    } finally {
      if (btn.isConnected) {
        btn.disabled = false;
        btn.textContent = label;
      }
    }
  });
}

async function signIn(email, password, remember = true) {
  const { token, user } = await api.post('/auth/login', { email, password });
  setSession(token, user, remember);
  rememberDemoPassword(email, password);
  showToast(`Signed in as ${user.name}`);
  onLoginHandler(user);
}

function wireAuthEvents() {
  document.querySelectorAll('[data-auth-nav]').forEach((btn) => btn.addEventListener('click', () => go(btn.dataset.authNav)));

  document.querySelectorAll('[data-use-demo]').forEach((btn) =>
    btn.addEventListener('click', async () => {
      const account = getDemoAccounts().find((a) => a.role === btn.dataset.useDemo);
      document.getElementById('login-email').value = account.email;
      document.getElementById('login-password').value = account.password;
      btn.disabled = true;
      try {
        await signIn(account.email, account.password);
      } catch (err) {
        const hint = err.status === 401 ? ' (run "npm run db:seed" to create the demo data)' : '';
        showToast(errorMessage(err) + hint, 'error');
      } finally {
        btn.disabled = false;
      }
    }),
  );

  onSubmit(document.getElementById('login-form'), ({ email, password, remember }) => signIn(email, password, remember === 'on'));

  onSubmit(document.getElementById('signup-form'), async ({ name, email, password, confirm }) => {
    if (password !== confirm) throw new Error('Passwords do not match');
    const { token, user } = await api.post('/auth/signup', { name, email, password });
    setSession(token, user, true);
    showToast(`Account created (${user.role === 'manager' ? 'Inventory Manager' : 'Warehouse Staff'})`);
    onLoginHandler(user);
  });

  onSubmit(document.getElementById('forgot-form'), async ({ email }) => {
    const res = await api.post('/auth/forgot-password', { email });
    reset.email = email.trim().toLowerCase();
    reset.devOtp = res.devOtp || '';
    go('otp');
  });

  const otpForm = document.getElementById('otp-form');
  if (otpForm) {
    const inputs = [...otpForm.querySelectorAll('.otp-input')];
    inputs.forEach((inp, i) => {
      inp.addEventListener('input', () => {
        inp.value = inp.value.replace(/\D/g, '').slice(0, 1);
        if (inp.value && i < inputs.length - 1) inputs[i + 1].focus();
      });
      inp.addEventListener('keydown', (e) => {
        if (e.key === 'Backspace' && !inp.value && i > 0) inputs[i - 1].focus();
      });
      inp.addEventListener('paste', (e) => {
        const digits = (e.clipboardData?.getData('text') || '').replace(/\D/g, '').slice(0, 6);
        if (!digits) return;
        e.preventDefault();
        digits.split('').forEach((d, j) => inputs[j] && (inputs[j].value = d));
        inputs[Math.min(digits.length, 5)].focus();
      });
    });
    inputs[0]?.focus();

    let seconds = 60;
    const timerEl = document.getElementById('resend-timer');
    const resendBtn = document.getElementById('resend-otp');
    resendTimer = setInterval(() => {
      seconds -= 1;
      if (timerEl) timerEl.textContent = seconds;
      if (seconds <= 0) {
        clearInterval(resendTimer);
        resendBtn.disabled = false;
        resendBtn.textContent = 'Resend code';
      }
    }, 1000);
    resendBtn.addEventListener('click', async () => {
      resendBtn.disabled = true;
      try {
        const res = await api.post('/auth/forgot-password', { email: reset.email });
        reset.devOtp = res.devOtp || reset.devOtp;
        showToast('A new code has been sent', 'info');
        go('otp');
      } catch (err) {
        showToast(errorMessage(err), 'error');
        resendBtn.disabled = false;
      }
    });

    onSubmit(otpForm, async () => {
      const otp = inputs.map((i) => i.value).join('');
      if (!/^\d{6}$/.test(otp)) throw new Error('Enter all 6 digits');
      await api.post('/auth/verify-otp', { email: reset.email, otp });
      reset.otp = otp;
      go('reset');
    });
  }

  onSubmit(document.getElementById('reset-form'), async ({ password, confirm }) => {
    if (password !== confirm) throw new Error('Passwords do not match');
    await api.post('/auth/reset-password', { email: reset.email, otp: reset.otp, newPassword: password });
    rememberDemoPassword(reset.email, password);
    reset.otp = '';
    reset.devOtp = '';
    showToast('Password changed. Sign in with your new password.');
    go('login');
  });
}

/** Shows the sign-in screen (hides the app). */
export function showAuth(view = 'login') {
  document.getElementById('app-shell')?.classList.add('hidden');
  document.getElementById('auth-screen')?.classList.remove('hidden');
  document.querySelector('.modal-overlay-dynamic')?.remove();
  go(view);
}

export function hideAuth() {
  clearInterval(resendTimer);
  document.getElementById('auth-screen')?.classList.add('hidden');
  document.getElementById('app-shell')?.classList.remove('hidden');
}

/** Logs out on the server (all sessions) and returns to the sign-in screen. */
export async function logout() {
  try {
    await api.post('/auth/logout');
  } catch {
    /* the session is cleared locally anyway */
  }
  clearSession();
  invalidateLookups();
  showAuth('login');
}

export function initAuth({ onLogin }) {
  onLoginHandler = onLogin;
}
