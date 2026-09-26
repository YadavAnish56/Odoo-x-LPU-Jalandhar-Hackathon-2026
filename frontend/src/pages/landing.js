// Landing Page Module
export default function renderLanding(container) {
  container.innerHTML = `
    <div class="flex flex-col w-full -mt-4">
      <!-- Top banner linking to full landing page -->
      <div class="mb-6 p-4 rounded-2xl bg-primary-fixed/40 border border-primary-container/20 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div class="flex items-center gap-3">
          <span class="material-symbols-outlined text-primary text-[28px]">web</span>
          <div>
            <h3 class="font-headline-sm text-headline-sm font-semibold text-on-surface">Marketing Landing Page</h3>
            <p class="font-body-sm text-body-sm text-secondary">Exported & crafted from Stitch Project 2896543442181856482.</p>
          </div>
        </div>
        <div class="flex items-center gap-2">
          <a href="/landing.html" target="_blank" class="px-4 py-2 rounded-xl bg-primary-container text-on-primary font-label-md text-label-md font-semibold hover:bg-primary transition-all shadow-sm flex items-center gap-1.5">
            <span>Open Standalone Landing Page</span>
            <span class="material-symbols-outlined text-[16px]">open_in_new</span>
          </a>
        </div>
      </div>

      <!-- Hero Section Preview -->
      <section class="w-full rounded-3xl bg-surface-container-lowest p-6 sm:p-10 border border-surface-container-high/60 shadow-sm mb-8 text-center relative overflow-hidden">
        <div class="absolute -top-24 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-primary-fixed/30 rounded-full blur-3xl pointer-events-none"></div>
        <div class="relative z-10 max-w-3xl mx-auto flex flex-col items-center">
          <div class="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-surface-container text-primary font-label-sm text-label-sm font-semibold mb-4">
            <span class="w-2 h-2 rounded-full bg-primary animate-pulse"></span>
            Stitch Project 2896543442181856482
          </div>
          <h1 class="font-display text-display text-3xl sm:text-5xl text-on-surface font-semibold tracking-tight mb-4">
            The operating system for modern physical inventory.
          </h1>
          <p class="font-body-lg text-body-lg text-on-surface-variant max-w-2xl mb-6">
            Real-time multi-warehouse sync, immutable stock ledgers, and automated replenishment. Built for hyper-growth brands and distributed supply chains.
          </p>
          <div class="flex flex-wrap items-center justify-center gap-3">
            <a href="/landing.html" class="px-6 py-3 rounded-xl bg-primary-container text-on-primary font-label-md text-label-md font-semibold hover:bg-primary transition-all shadow-md flex items-center gap-2">
              <span>View Full Landing Page Experience</span>
              <span class="material-symbols-outlined text-[18px]">arrow_forward</span>
            </a>
            <button onclick="window.location.hash='#dashboard'" class="px-5 py-3 rounded-xl bg-surface-container text-on-surface font-label-md text-label-md font-semibold hover:bg-surface-container-high transition-all">
              Go to Workspace Dashboard
            </button>
          </div>
        </div>
      </section>

      <!-- Key Capabilities 3-Grid -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div class="bg-surface-container-lowest rounded-2xl p-6 border border-surface-container-high/60 shadow-sm flex flex-col justify-between">
          <div>
            <div class="w-10 h-10 rounded-xl bg-primary-fixed text-primary flex items-center justify-center mb-4">
              <span class="material-symbols-outlined text-[22px]">receipt_long</span>
            </div>
            <h3 class="font-headline-sm text-headline-sm font-semibold text-on-surface mb-2">Immutable Stock Ledger</h3>
            <p class="font-body-sm text-body-sm text-secondary">Every gram, unit, and pallet verified with cryptographic precision and audit trails.</p>
          </div>
          <button onclick="window.location.hash='#ledger'" class="mt-4 font-label-md text-label-md text-primary font-semibold flex items-center gap-1 hover:underline">
            Inspect Ledger <span class="material-symbols-outlined text-[14px]">arrow_forward</span>
          </button>
        </div>

        <div class="bg-surface-container-lowest rounded-2xl p-6 border border-surface-container-high/60 shadow-sm flex flex-col justify-between">
          <div>
            <div class="w-10 h-10 rounded-xl bg-surface-container text-primary flex items-center justify-center mb-4">
              <span class="material-symbols-outlined text-[22px]">route</span>
            </div>
            <h3 class="font-headline-sm text-headline-sm font-semibold text-on-surface mb-2">Corridor Transfer Tracking</h3>
            <p class="font-body-sm text-body-sm text-secondary">Real-time telemetry tracking materials moving from receiving bays to high-density racks.</p>
          </div>
          <button onclick="window.location.hash='#operations'" class="mt-4 font-label-md text-label-md text-primary font-semibold flex items-center gap-1 hover:underline">
            View Operations <span class="material-symbols-outlined text-[14px]">arrow_forward</span>
          </button>
        </div>

        <div class="bg-surface-container-lowest rounded-2xl p-6 border border-surface-container-high/60 shadow-sm flex flex-col justify-between">
          <div>
            <div class="w-10 h-10 rounded-xl bg-primary-fixed text-primary flex items-center justify-center mb-4">
              <span class="material-symbols-outlined text-[22px]">auto_mode</span>
            </div>
            <h3 class="font-headline-sm text-headline-sm font-semibold text-on-surface mb-2">Automated Replenishment</h3>
            <p class="font-body-sm text-body-sm text-secondary">Dynamic safety stock computes run-out rates and lead times to prevent stockouts.</p>
          </div>
          <button onclick="window.location.hash='#warehouses'" class="mt-4 font-label-md text-label-md text-primary font-semibold flex items-center gap-1 hover:underline">
            Check Warehouses <span class="material-symbols-outlined text-[14px]">arrow_forward</span>
          </button>
        </div>
      </div>

      <!-- Bento Showcase Section -->
      <div class="rounded-3xl bg-surface-container-low p-6 sm:p-8 border border-surface-container-high/60">
        <div class="max-w-2xl mb-6">
          <span class="font-label-sm text-label-sm uppercase tracking-wider text-primary font-semibold block mb-1">Architecture</span>
          <h2 class="font-headline-lg text-headline-lg text-2xl sm:text-3xl font-semibold text-on-surface">Total control over every physical node.</h2>
        </div>
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div class="p-4 rounded-xl bg-surface-container-lowest shadow-xs border border-surface-container-high/40">
            <span class="font-metric-val text-metric-val font-bold text-primary block mb-1">-78%</span>
            <span class="font-body-sm text-body-sm font-semibold text-on-surface block">Discrepancy & Shrink</span>
          </div>
          <div class="p-4 rounded-xl bg-surface-container-lowest shadow-xs border border-surface-container-high/40">
            <span class="font-metric-val text-metric-val font-bold text-on-surface block mb-1">3.4x</span>
            <span class="font-body-sm text-body-sm font-semibold text-on-surface block">Faster Receiving</span>
          </div>
          <div class="p-4 rounded-xl bg-surface-container-lowest shadow-xs border border-surface-container-high/40">
            <span class="font-metric-val text-metric-val font-bold text-primary block mb-1">$1.2M+</span>
            <span class="font-body-sm text-body-sm font-semibold text-on-surface block">Working Capital Saved</span>
          </div>
          <div class="p-4 rounded-xl bg-surface-container-lowest shadow-xs border border-surface-container-high/40">
            <span class="font-metric-val text-metric-val font-bold text-on-surface block mb-1">99.99%</span>
            <span class="font-body-sm text-body-sm font-semibold text-on-surface block">Audit Accuracy</span>
          </div>
        </div>
      </div>
    </div>
  `;
}
