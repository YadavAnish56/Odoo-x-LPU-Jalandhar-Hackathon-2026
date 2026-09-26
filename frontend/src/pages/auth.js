import { showToast } from '../utils.js';

let authView = 'login'; // login | signup | forgot | otp | reset
let otpPurpose = 'reset'; // signup | reset - where the OTP screen leads after verification

function renderAuth() {
  const container = document.getElementById('auth-screen');
  if (!container) return;

  const views = {
    login: loginView,
    signup: signupView,
    forgot: forgotView,
    otp: otpView,
    reset: resetView,
  };

  container.innerHTML = `
    <div class="min-h-screen flex items-center justify-center bg-background px-gutter-mobile py-10">
      <div class="w-full max-w-md">
        <!-- Logo & Brand -->
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
        <!-- Auth Card -->
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

    <!-- Demo Credentials Helper Card -->
    <div class="mb-5 p-3.5 rounded-xl bg-primary-fixed/40 border border-primary-container/20 flex flex-col gap-2">
      <div class="flex items-center justify-between">
        <span class="font-label-sm text-label-sm uppercase tracking-wider text-primary font-bold flex items-center gap-1.5">
          <span class="material-symbols-outlined text-[16px]">key</span>
          Demo Credentials
        </span>
        <button id="fill-demo-btn" type="button" class="px-2.5 py-1 rounded-lg bg-primary-container text-on-primary font-label-sm text-label-sm font-semibold hover:bg-primary transition-all shadow-xs cursor-pointer flex items-center gap-1">
          <span>Auto Login</span>
          <span class="material-symbols-outlined text-[13px]">bolt</span>
        </button>
      </div>
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-label-sm font-label-sm text-on-surface-variant font-mono bg-surface-container-lowest/90 p-2.5 rounded-lg border border-surface-container-high/60">
        <div><span class="text-secondary font-sans font-normal">Email:</span> <strong class="text-on-surface">admin@stocksense.com</strong></div>
        <div><span class="text-secondary font-sans font-normal">Pass:</span> <strong class="text-on-surface">admin123</strong></div>
      </div>
    </div>

    <form id="login-form" class="flex flex-col gap-4">
      <div class="flex flex-col gap-1">
        <label class="font-label-md text-label-md text-secondary">Email</label>
        <input type="email" id="login-email" name="email" value="admin@stocksense.com" placeholder="you@company.com" required class="w-full bg-surface-container-low text-on-surface font-body-sm text-body-sm rounded-xl px-space-md py-2.5 outline-none focus:ring-2 focus:ring-primary-container transition-all"/>
      </div>
      <div class="flex flex-col gap-1">
        <label class="font-label-md text-label-md text-secondary">Password</label>
        <input type="password" id="login-password" name="password" value="admin123" placeholder="••••••••" required class="w-full bg-surface-container-low text-on-surface font-body-sm text-body-sm rounded-xl px-space-md py-2.5 outline-none focus:ring-2 focus:ring-primary-container transition-all"/>
      </div>
      <div class="flex items-center justify-between">
        <label class="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" checked class="w-4 h-4 rounded accent-primary-container"/>
          <span class="font-body-sm text-body-sm text-secondary">Remember me</span>
        </label>
        <button type="button" class="font-label-md text-label-md text-primary hover:text-primary-container transition-colors font-semibold" data-auth-nav="forgot">Forgot password?</button>
      </div>
      <button type="submit" class="w-full py-2.5 bg-primary-container hover:bg-primary text-on-primary font-label-md text-label-md rounded-xl shadow-sm transition-all mt-2 active:scale-[0.99] font-semibold">Sign In</button>
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
        <input type="text" name="name" placeholder="Rajesh Sharma" required class="w-full bg-surface-container-low text-on-surface font-body-sm text-body-sm rounded-xl px-space-md py-2.5 outline-none focus:ring-2 focus:ring-primary-container transition-all"/>
      </div>
      <div class="flex flex-col gap-1">
        <label class="font-label-md text-label-md text-secondary">Email</label>
        <input type="email" name="email" placeholder="you@company.com" required class="w-full bg-surface-container-low text-on-surface font-body-sm text-body-sm rounded-xl px-space-md py-2.5 outline-none focus:ring-2 focus:ring-primary-container transition-all"/>
      </div>
      <div class="grid grid-cols-2 gap-3">
        <div class="flex flex-col gap-1">
          <label class="font-label-md text-label-md text-secondary">Password</label>
          <input type="password" name="password" placeholder="••••••••" required class="w-full bg-surface-container-low text-on-surface font-body-sm text-body-sm rounded-xl px-space-md py-2.5 outline-none focus:ring-2 focus:ring-primary-container transition-all"/>
        </div>
        <div class="flex flex-col gap-1">
          <label class="font-label-md text-label-md text-secondary">Confirm</label>
          <input type="password" name="confirm" placeholder="••••••••" required class="w-full bg-surface-container-low text-on-surface font-body-sm text-body-sm rounded-xl px-space-md py-2.5 outline-none focus:ring-2 focus:ring-primary-container transition-all"/>
        </div>
      </div>
      <div class="flex flex-col gap-1">
        <label class="font-label-md text-label-md text-secondary">Role</label>
        <select name="role" class="w-full bg-surface-container-low text-on-surface font-body-sm text-body-sm rounded-xl px-space-md py-2.5 outline-none focus:ring-2 focus:ring-primary-container transition-all">
          <option value="manager">Inventory Manager</option>
          <option value="staff">Warehouse Staff</option>
        </select>
      </div>
      <button type="submit" class="w-full py-2.5 bg-primary-container hover:bg-primary text-on-primary font-label-md text-label-md rounded-xl shadow-sm transition-all mt-2 active:scale-[0.99]">Create Account</button>
    </form>
    <p class="text-center font-body-sm text-body-sm text-secondary mt-6">
      Already have an account? <button class="text-primary hover:text-primary-container font-semibold transition-colors" data-auth-nav="login">Sign in</button>
    </p>
  `;
}

function forgotView() {
  return `
    <h2 class="font-headline-md text-headline-md text-on-surface font-semibold mb-1">Reset password</h2>
    <p class="font-body-sm text-body-sm text-secondary mb-6">We'll send a verification code to your email</p>
    <form id="forgot-form" class="flex flex-col gap-4">
      <div class="flex flex-col gap-1">
        <label class="font-label-md text-label-md text-secondary">Email</label>
        <input type="email" name="email" placeholder="you@company.com" required class="w-full bg-surface-container-low text-on-surface font-body-sm text-body-sm rounded-xl px-space-md py-2.5 outline-none focus:ring-2 focus:ring-primary-container transition-all"/>
      </div>
      <button type="submit" class="w-full py-2.5 bg-primary-container hover:bg-primary text-on-primary font-label-md text-label-md rounded-xl shadow-sm transition-all mt-2 active:scale-[0.99]">Send Reset Code</button>
    </form>
    <p class="text-center font-body-sm text-body-sm text-secondary mt-6">
      <button class="text-primary hover:text-primary-container font-semibold transition-colors" data-auth-nav="login">← Back to sign in</button>
    </p>
  `;
}

function otpView() {
  return `
    <h2 class="font-headline-md text-headline-md text-on-surface font-semibold mb-1">Verify your identity</h2>
    <p class="font-body-sm text-body-sm text-secondary mb-6">Enter the 6-digit code sent to your email</p>
    <form id="otp-form" class="flex flex-col gap-4">
      <div class="flex items-center justify-center gap-3">
        ${[1,2,3,4,5,6].map(i => `<input type="text" maxlength="1" class="otp-input w-12 h-14 text-center bg-surface-container-low text-on-surface font-headline-md text-headline-md rounded-xl outline-none focus:ring-2 focus:ring-primary-container transition-all" data-otp-idx="${i}"/>`).join('')}
      </div>
      <button type="submit" class="w-full py-2.5 bg-primary-container hover:bg-primary text-on-primary font-label-md text-label-md rounded-xl shadow-sm transition-all mt-2 active:scale-[0.99]">Verify Code</button>
    </form>
    <div class="text-center mt-4">
      <span class="font-body-sm text-body-sm text-secondary">Didn't receive the code? </span>
      <button id="resend-otp" class="font-label-md text-label-md text-primary hover:text-primary-container font-semibold transition-colors" disabled>Resend in <span id="resend-timer">30</span>s</button>
    </div>
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
        <input type="password" name="password" placeholder="••••••••" required class="w-full bg-surface-container-low text-on-surface font-body-sm text-body-sm rounded-xl px-space-md py-2.5 outline-none focus:ring-2 focus:ring-primary-container transition-all"/>
      </div>
      <div class="flex flex-col gap-1">
        <label class="font-label-md text-label-md text-secondary">Confirm Password</label>
        <input type="password" name="confirm" placeholder="••••••••" required class="w-full bg-surface-container-low text-on-surface font-body-sm text-body-sm rounded-xl px-space-md py-2.5 outline-none focus:ring-2 focus:ring-primary-container transition-all"/>
      </div>
      <button type="submit" class="w-full py-2.5 bg-primary-container hover:bg-primary text-on-primary font-label-md text-label-md rounded-xl shadow-sm transition-all mt-2 active:scale-[0.99]">Reset Password</button>
    </form>
  `;
}

function wireAuthEvents() {
  // Nav between auth views
  document.querySelectorAll('[data-auth-nav]').forEach(btn => {
    btn.addEventListener('click', () => {
      authView = btn.dataset.authNav;
      renderAuth();
    });
  });

  // Quick Demo Login button
  const fillDemoBtn = document.getElementById('fill-demo-btn');
  if (fillDemoBtn) {
    fillDemoBtn.addEventListener('click', () => {
      const emailInput = document.getElementById('login-email');
      const passInput = document.getElementById('login-password');
      if (emailInput) emailInput.value = 'admin@stocksense.com';
      if (passInput) passInput.value = 'admin123';
      showToast('Signing in as Demo Admin...', 'success');
      setTimeout(() => {
        document.getElementById('auth-screen').classList.add('hidden');
        document.getElementById('app-shell').classList.remove('hidden');
        window.location.hash = '#dashboard';
      }, 400);
    });
  }

  // Login submit
  const loginForm = document.getElementById('login-form');
  if (loginForm) {
    loginForm.addEventListener('submit', (e) => {
      e.preventDefault();
      showToast('Signed in successfully!', 'success');
      document.getElementById('auth-screen').classList.add('hidden');
      document.getElementById('app-shell').classList.remove('hidden');
      window.location.hash = '#dashboard';
    });
  }

  // Signup submit
  const signupForm = document.getElementById('signup-form');
  if (signupForm) {
    signupForm.addEventListener('submit', (e) => {
      e.preventDefault();
      if (signupForm.password.value !== signupForm.confirm.value) {
        showToast('Passwords do not match', 'error');
        return;
      }
      showToast('Account created! Please verify your email.', 'success');
      otpPurpose = 'signup';
      authView = 'otp';
      renderAuth();
    });
  }

  // Forgot submit
  const forgotForm = document.getElementById('forgot-form');
  if (forgotForm) {
    forgotForm.addEventListener('submit', (e) => {
      e.preventDefault();
      showToast('Reset code sent to your email', 'info');
      otpPurpose = 'reset';
      authView = 'otp';
      renderAuth();
    });
  }

  // OTP handling
  const otpForm = document.getElementById('otp-form');
  if (otpForm) {
    const inputs = otpForm.querySelectorAll('.otp-input');
    inputs.forEach((inp, i) => {
      inp.addEventListener('input', () => {
        if (inp.value.length === 1 && i < inputs.length - 1) inputs[i + 1].focus();
      });
      inp.addEventListener('keydown', (e) => {
        if (e.key === 'Backspace' && !inp.value && i > 0) inputs[i - 1].focus();
      });
    });
    inputs[0]?.focus();

    // Timer (restarted each time a new code is requested)
    const resendBtn = document.getElementById('resend-otp');
    let iv;
    function startResendTimer() {
      let seconds = 30;
      clearInterval(iv);
      resendBtn.disabled = true;
      resendBtn.innerHTML = 'Resend in <span id="resend-timer">30</span>s';
      iv = setInterval(() => {
        seconds--;
        const timerEl = document.getElementById('resend-timer');
        if (timerEl) timerEl.textContent = seconds;
        if (seconds <= 0) {
          clearInterval(iv);
          resendBtn.disabled = false;
          resendBtn.textContent = 'Resend Code';
        }
      }, 1000);
    }
    startResendTimer();

    resendBtn.addEventListener('click', () => {
      showToast('A new code has been sent to your email', 'info');
      startResendTimer();
    });

    otpForm.addEventListener('submit', (e) => {
      e.preventDefault();
      if (![...inputs].every(inp => /^\d$/.test(inp.value))) {
        showToast('Enter the full 6-digit code', 'error');
        return;
      }
      clearInterval(iv);
      if (otpPurpose === 'signup') {
        showToast('Email verified! You can now sign in.', 'success');
        authView = 'login';
      } else {
        showToast('Code verified!', 'success');
        authView = 'reset';
      }
      renderAuth();
    });
  }

  // Reset submit
  const resetForm = document.getElementById('reset-form');
  if (resetForm) {
    resetForm.addEventListener('submit', (e) => {
      e.preventDefault();
      if (resetForm.password.value !== resetForm.confirm.value) {
        showToast('Passwords do not match', 'error');
        return;
      }
      showToast('Password reset successfully!', 'success');
      authView = 'login';
      renderAuth();
    });
  }
}

export function initAuth() {
  renderAuth();
}
