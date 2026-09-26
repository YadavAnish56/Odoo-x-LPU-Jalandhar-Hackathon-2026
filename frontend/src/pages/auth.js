import { api, clearSession, errorMessage, setSession } from '../api.js';
import { invalidateLookups } from '../store.js';
import { esc, showToast } from '../utils.js';

export const DEMO_ACCOUNT = { email: 'manager@stocksense.com', password: 'Manager@123' };

let authView = 'login'; // login | signup | forgot | otp | reset
let onLoginHandler = () => {};
const reset = { email: '', otp: '', devOtp: '' };
let resendTimer = null;

const inputClass =
  'w-full bg-surface-container-low text-on-surface font-body-sm text-body-sm rounded-xl px-space-md py-2.5 outline-none focus:ring-2 focus:ring-primary-container transition-all';
const submitClass =
  'w-full py-2.5 bg-primary-container hover:bg-primary text-on-primary font-label-md text-label-md rounded-xl shadow-sm transition-all mt-2 active:scale-[0.99] font-semibold disabled:opacity-60';

function renderAuth() {
  const container = document.getElementById('auth-screen');
  if (!container) return;
  clearInterval(resendTimer);

  const views = { login: loginView, signup: signupView, forgot: forgotView, otp: otpView, reset: resetView };

  container.innerHTML = `
    <div class="min-h-screen flex items-center justify-center bg-background px-gutter-mobile py-10">
      <div class="w-full max-w-md">
        <div class="w-full flex justify-start mb-4">
          <a href="/landing.html" class="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-surface-container hover:bg-surface-container-high text-on-surface-variant font-label-md text-label-md transition-colors shadow-xs">
            <span class="material-symbols-outlined text-[16px]">arrow_back</span>
            <span>Back to Landing Page</span>
          </a>
        </div>

        <div class="flex flex-col items-center mb-8">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width="56" height="56" fill="none" class="mb-4">
            <rect width="48" height="48" rx="14" fill="#FFF1E8"/>
            <rect x="12" y="12" width="10" height="10" rx="3.5" fill="#F97316"/>
            <rect x="26" y="12" width="10" height="10" rx="3.5" fill="#F97316" fill-opacity="0.35"/>
            <rect x="12" y="26" width="10" height="10" rx="3.5" fill="#F97316" fill-opacity="0.7"/>
            <path d="M26 31C26 28.2386 28.2386 26 31 26H36V31C36 33.7614 33.7614 36 31 36C28.2386 36 26 33.7614 26 31Z" fill="#F97316"/>
            <path d="M29 31L33 31M33 31L31 29M33 31L31 33" stroke="#FFFFFF" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
          <h1 class="font-headline-lg text-headline-lg text-on-surface font-semibold tracking-tight">StockSense</h1>
          <p class="font-body-sm text-body-sm text-secondary mt-1">Know your stock. Control every movement.</p>
        </div>
        <div class="bg-surface-container-lowest rounded-2xl shadow-sm p-8" id="auth-card">
          ${views[authView]()}
        </div>
      </div>
    </div>
  `;

  wireAuthEvents();
}

function loginView() {
  return `
    <h2 class="font-headline-md text-headline-md text-on-surface font-semibold mb-1">Welcome back</h2>
    <p class="font-body-sm text-body-sm text-secondary mb-4">Sign in to your inventory workspace</p>

    <div class="mb-5 p-3.5 rounded-xl bg-primary-fixed/40 border border-primary-container/20 flex flex-col gap-2">
      <div class="flex items-center justify-between">
        <span class="font-label-sm text-label-sm uppercase tracking-wider text-primary font-bold flex items-center gap-1.5">
          <span class="material-symbols-outlined text-[16px]">key</span>
          Demo Credentials
        </span>
        <button id="fill-demo-btn" type="button" class="px-2.5 py-1 rounded-lg bg-primary-container text-on-primary font-label-sm text-label-sm font-semibold hover:bg-primary transition-all shadow-xs cursor-pointer flex items-center gap-1 disabled:opacity-60">
          <span>Auto Login</span>
          <span class="material-symbols-outlined text-[13px]">bolt</span>
        </button>
      </div>
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-label-sm font-label-sm text-on-surface-variant font-mono bg-surface-container-lowest/90 p-2.5 rounded-lg border border-surface-container-high/60">
        <div class="truncate"><span class="text-secondary font-sans font-normal">Email:</span> <strong class="text-on-surface">${DEMO_ACCOUNT.email}</strong></div>
        <div><span class="text-secondary font-sans font-normal">Pass:</span> <strong class="text-on-surface">${DEMO_ACCOUNT.password}</strong></div>
      </div>
    </div>

    <form id="login-form" class="flex flex-col gap-4">
      <div class="flex flex-col gap-1">
        <label class="font-label-md text-label-md text-secondary">Email</label>
        <input type="email" id="login-email" name="email" value="${esc(reset.email)}" placeholder="you@company.com" required autocomplete="username" class="${inputClass}"/>
      </div>
      <div class="flex flex-col gap-1">
        <label class="font-label-md text-label-md text-secondary">Password</label>
        <input type="password" id="login-password" name="password" placeholder="••••••••" required autocomplete="current-password" class="${inputClass}"/>
      </div>
      <div class="flex items-center justify-between">
        <label class="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" name="remember" checked class="w-4 h-4 rounded accent-primary-container"/>
          <span class="font-body-sm text-body-sm text-secondary">Remember me</span>
        </label>
        <button type="button" class="font-label-md text-label-md text-primary hover:text-primary-container transition-colors font-semibold" data-auth-nav="forgot">Forgot password?</button>
      </div>
      <button type="submit" class="${submitClass}">Sign In</button>
    </form>
    <p class="text-center font-body-sm text-body-sm text-secondary mt-6">
      Don't have an account? <button class="text-primary hover:text-primary-container font-semibold transition-colors" data-auth-nav="signup">Create one</button>
    </p>
  `;
}

function signupView() {
  return `
    <h2 class="font-headline-md text-headline-md text-on-surface font-semibold mb-1">Create your account</h2>
    <p class="font-body-sm text-body-sm text-secondary mb-6">Start managing your inventory today</p>
    <form id="signup-form" class="flex flex-col gap-4">
      <div class="flex flex-col gap-1">
        <label class="font-label-md text-label-md text-secondary">Full Name</label>
        <input type="text" name="name" placeholder="Rajesh Sharma" required minlength="2" autocomplete="name" class="${inputClass}"/>
      </div>
      <div class="flex flex-col gap-1">
        <label class="font-label-md text-label-md text-secondary">Email</label>
        <input type="email" name="email" placeholder="you@company.com" required autocomplete="email" class="${inputClass}"/>
      </div>
      <div class="grid grid-cols-2 gap-3">
        <div class="flex flex-col gap-1">
          <label class="font-label-md text-label-md text-secondary">Password</label>
          <input type="password" name="password" placeholder="••••••••" required minlength="8" autocomplete="new-password" class="${inputClass}"/>
        </div>
        <div class="flex flex-col gap-1">
          <label class="font-label-md text-label-md text-secondary">Confirm</label>
          <input type="password" name="confirm" placeholder="••••••••" required autocomplete="new-password" class="${inputClass}"/>
        </div>
      </div>
      <p class="font-label-sm text-label-sm text-secondary -mt-2">At least 8 characters, with a letter and a number.</p>
      <div class="p-3 rounded-xl bg-surface-container-low font-body-sm text-body-sm text-secondary flex gap-2">
        <span class="material-symbols-outlined text-[18px] text-primary-container">badge</span>
        <span>The first account becomes the <strong class="text-on-surface">Inventory Manager</strong>. Later accounts join as <strong class="text-on-surface">Warehouse Staff</strong>; a manager can promote them.</span>
      </div>
      <button type="submit" class="${submitClass}">Create Account</button>
    </form>
    <p class="text-center font-body-sm text-body-sm text-secondary mt-6">
      Already have an account? <button class="text-primary hover:text-primary-container font-semibold transition-colors" data-auth-nav="login">Sign in</button>
    </p>
  `;
}

function forgotView() {
  return `
    <h2 class="font-headline-md text-headline-md text-on-surface font-semibold mb-1">Reset password</h2>
    <p class="font-body-sm text-body-sm text-secondary mb-6">We'll send a 6-digit verification code to your email</p>
    <form id="forgot-form" class="flex flex-col gap-4">
      <div class="flex flex-col gap-1">
        <label class="font-label-md text-label-md text-secondary">Email</label>
        <input type="email" name="email" value="${esc(reset.email)}" placeholder="you@company.com" required autocomplete="email" class="${inputClass}"/>
      </div>
      <button type="submit" class="${submitClass}">Send Reset Code</button>
    </form>
    <p class="text-center font-body-sm text-body-sm text-secondary mt-6">
      <button class="text-primary hover:text-primary-container font-semibold transition-colors" data-auth-nav="login">← Back to sign in</button>
    </p>
  `;
}

function otpView() {
  return `
    <h2 class="font-headline-md text-headline-md text-on-surface font-semibold mb-1">Verify your identity</h2>
    <p class="font-body-sm text-body-sm text-secondary mb-6">Enter the 6-digit code sent to <strong class="text-on-surface">${esc(reset.email)}</strong></p>
    ${reset.devOtp ? `<div class="mb-4 p-3 rounded-xl bg-blue-50 text-blue-800 font-body-sm text-body-sm">Development mode (no email server configured): your code is <strong class="font-mono tracking-widest">${esc(reset.devOtp)}</strong></div>` : ''}
    <form id="otp-form" class="flex flex-col gap-4">
      <div class="flex items-center justify-center gap-2 sm:gap-3">
        ${[1, 2, 3, 4, 5, 6].map((i) => `<input type="text" inputmode="numeric" maxlength="1" autocomplete="one-time-code" class="otp-input w-11 h-14 sm:w-12 text-center bg-surface-container-low text-on-surface font-headline-md text-headline-md rounded-xl outline-none focus:ring-2 focus:ring-primary-container transition-all" data-otp-idx="${i}"/>`).join('')}
      </div>
      <button type="submit" class="${submitClass}">Verify Code</button>
    </form>
    <div class="text-center mt-4">
      <span class="font-body-sm text-body-sm text-secondary">Didn't receive the code? </span>
      <button id="resend-otp" class="font-label-md text-label-md text-primary hover:text-primary-container font-semibold transition-colors disabled:text-secondary" disabled>Resend in <span id="resend-timer">60</span>s</button>
    </div>
    <p class="text-center font-body-sm text-body-sm text-secondary mt-4">
      <button class="text-primary hover:text-primary-container font-semibold transition-colors" data-auth-nav="forgot">← Use a different email</button>
    </p>
  `;
}

function resetView() {
  return `
    <div class="flex items-center justify-center mb-4">
      <div class="w-12 h-12 rounded-full bg-emerald-50 flex items-center justify-center">
        <span class="material-symbols-outlined text-emerald-600 text-[28px]">check_circle</span>
      </div>
    </div>
    <h2 class="font-headline-md text-headline-md text-on-surface font-semibold mb-1 text-center">Set new password</h2>
    <p class="font-body-sm text-body-sm text-secondary mb-6 text-center">Code verified! Create your new password</p>
    <form id="reset-form" class="flex flex-col gap-4">
      <div class="flex flex-col gap-1">
        <label class="font-label-md text-label-md text-secondary">New Password</label>
        <input type="password" name="password" placeholder="••••••••" required minlength="8" autocomplete="new-password" class="${inputClass}"/>
      </div>
      <div class="flex flex-col gap-1">
        <label class="font-label-md text-label-md text-secondary">Confirm Password</label>
        <input type="password" name="confirm" placeholder="••••••••" required autocomplete="new-password" class="${inputClass}"/>
      </div>
      <p class="font-label-sm text-label-sm text-secondary -mt-2">At least 8 characters, with a letter and a number.</p>
      <button type="submit" class="${submitClass}">Reset Password</button>
    </form>
  `;
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
  showToast(`Welcome back, ${user.name}!`);
  onLoginHandler(user);
}

function wireAuthEvents() {
  document.querySelectorAll('[data-auth-nav]').forEach((btn) => {
    btn.addEventListener('click', () => go(btn.dataset.authNav));
  });

  // Demo login with the seeded manager account
  const demoBtn = document.getElementById('fill-demo-btn');
  demoBtn?.addEventListener('click', async () => {
    document.getElementById('login-email').value = DEMO_ACCOUNT.email;
    document.getElementById('login-password').value = DEMO_ACCOUNT.password;
    demoBtn.disabled = true;
    try {
      await signIn(DEMO_ACCOUNT.email, DEMO_ACCOUNT.password);
    } catch (err) {
      const hint = err.status === 401 ? ' (run "npm run db:seed" in the backend to create the demo data)' : '';
      showToast(errorMessage(err) + hint, 'error');
    } finally {
      demoBtn.disabled = false;
    }
  });

  onSubmit(document.getElementById('login-form'), ({ email, password, remember }) =>
    signIn(email, password, remember === 'on'),
  );

  onSubmit(document.getElementById('signup-form'), async ({ name, email, password, confirm }) => {
    if (password !== confirm) throw new Error('Passwords do not match');
    const { token, user } = await api.post('/auth/signup', { name, email, password });
    setSession(token, user, true);
    showToast(`Account created — you are signed in as ${user.role}`);
    onLoginHandler(user);
  });

  onSubmit(document.getElementById('forgot-form'), async ({ email }) => {
    const res = await api.post('/auth/forgot-password', { email });
    reset.email = email.trim().toLowerCase();
    reset.devOtp = res.devOtp || '';
    showToast(res.message, 'info');
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
        resendBtn.textContent = 'Resend Code';
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
      showToast('Code verified!');
      go('reset');
    });
  }

  onSubmit(document.getElementById('reset-form'), async ({ password, confirm }) => {
    if (password !== confirm) throw new Error('Passwords do not match');
    await api.post('/auth/reset-password', { email: reset.email, otp: reset.otp, newPassword: password });
    reset.otp = '';
    reset.devOtp = '';
    showToast('Password reset successfully! Please sign in.');
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
  showToast('Signed out', 'info');
  showAuth('login');
}

export function initAuth({ onLogin }) {
  onLoginHandler = onLogin;
}
