// Professional interactive OAuth dialog & flow for Google and Microsoft
(() => {
  const GOOGLE_ACCOUNTS = [
    { name: 'Akhilesh Hallolli', email: 'akhileshhallolli@gmail.com', avatar: 'A', color: '#1a73e8' },
    { name: 'Stackly Demo Account', email: 'demo.stackly@gmail.com', avatar: 'S', color: '#ea4335' }
  ];

  const MICROSOFT_ACCOUNTS = [
    { name: 'Akhilesh Hallolli', email: 'akhilesh@outlook.com', avatar: 'A', color: '#0078d4' },
    { name: 'Stackly Team', email: 'stackly@microsoft.com', avatar: 'S', color: '#107c41' }
  ];

  function createModal() {
    let overlay = document.getElementById('social-auth-modal');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'social-auth-modal';
      overlay.className = 'oauth-modal-overlay';
      overlay.setAttribute('aria-hidden', 'true');
      overlay.innerHTML = `
        <div class="oauth-modal-dialog" role="dialog" aria-modal="true" aria-labelledby="oauth-dialog-title">
          <div class="oauth-modal-header">
            <div class="oauth-brand-badge" id="oauth-brand-badge"></div>
            <button type="button" class="oauth-modal-close" id="oauth-modal-close" aria-label="Close dialog">&times;</button>
          </div>
          <div class="oauth-modal-body">
            <h3 class="oauth-title" id="oauth-dialog-title">Choose an account</h3>
            <p class="oauth-subtitle" id="oauth-dialog-subtitle">to continue to <strong>Stackly</strong></p>
            <div class="oauth-account-list" id="oauth-account-list"></div>
            <div class="oauth-custom-section">
              <button type="button" class="oauth-use-another-btn" id="oauth-use-another-btn">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><line x1="20" y1="8" x2="20" y2="14"/><line x1="23" y1="11" x2="17" y2="11"/></svg>
                <span>Use another account</span>
              </button>
              <form class="oauth-custom-form" id="oauth-custom-form" hidden>
                <div class="oauth-form-row">
                  <input type="text" id="oauth-custom-name" placeholder="Full Name" required autocomplete="name">
                </div>
                <div class="oauth-form-row">
                  <input type="email" id="oauth-custom-email" placeholder="Email address" required autocomplete="email">
                </div>
                <div class="oauth-form-actions">
                  <button type="button" class="oauth-cancel-btn" id="oauth-cancel-custom">Cancel</button>
                  <button type="submit" class="oauth-continue-btn" id="oauth-confirm-custom">Sign in</button>
                </div>
              </form>
            </div>
          </div>
          <div class="oauth-modal-footer">
            <p id="oauth-modal-disclaimer">To continue, Google will share your name, email address, and profile picture with Stackly.</p>
          </div>
        </div>
      `;
      document.body.appendChild(overlay);

      overlay.querySelector('#oauth-modal-close').addEventListener('click', closeModal);
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) closeModal();
      });

      const useAnotherBtn = overlay.querySelector('#oauth-use-another-btn');
      const customForm = overlay.querySelector('#oauth-custom-form');
      const cancelCustomBtn = overlay.querySelector('#oauth-cancel-custom');

      useAnotherBtn.addEventListener('click', () => {
        useAnotherBtn.hidden = true;
        customForm.hidden = false;
        overlay.querySelector('#oauth-custom-name').focus();
      });

      cancelCustomBtn.addEventListener('click', () => {
        customForm.hidden = true;
        useAnotherBtn.hidden = false;
        customForm.reset();
      });

      customForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const name = overlay.querySelector('#oauth-custom-name').value.trim();
        const email = overlay.querySelector('#oauth-custom-email').value.trim();
        if (!email) return;
        await completeOAuth({ name, email }, activeProvider);
      });
    }
    return overlay;
  }

  let activeProvider = 'google';

  function openModal(provider) {
    activeProvider = provider;
    const modal = createModal();
    const isGoogle = provider === 'google';
    const badge = modal.querySelector('#oauth-brand-badge');
    const subtitle = modal.querySelector('#oauth-dialog-subtitle');
    const disclaimer = modal.querySelector('#oauth-modal-disclaimer');
    const list = modal.querySelector('#oauth-account-list');
    const useAnotherBtn = modal.querySelector('#oauth-use-another-btn');
    const customForm = modal.querySelector('#oauth-custom-form');

    useAnotherBtn.hidden = false;
    customForm.hidden = true;
    customForm.reset();

    if (isGoogle) {
      badge.innerHTML = `
        <svg viewBox="0 0 24 24" width="28" height="28" aria-hidden="true">
          <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"/>
          <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"/>
          <path fill="#FBBC05" d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.98 0 12s.45 3.82 1.25 5.42l4.03-3.15z"/>
          <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"/>
        </svg>
        <span class="oauth-brand-text">Google</span>
      `;
      subtitle.innerHTML = 'to continue to <strong>Stackly</strong>';
      disclaimer.textContent = 'To continue, Google will share your name, email address, and profile picture with Stackly.';
    } else {
      badge.innerHTML = `
        <svg viewBox="0 0 23 23" width="24" height="24" aria-hidden="true">
          <path fill="#f35325" d="M1 1h10v10H1z"/>
          <path fill="#81bc06" d="M12 1h10v10H12z"/>
          <path fill="#05a6f0" d="M1 12h10v10H1z"/>
          <path fill="#ffba08" d="M12 12h10v10H12z"/>
        </svg>
        <span class="oauth-brand-text">Microsoft</span>
      `;
      subtitle.innerHTML = 'to continue to <strong>Stackly</strong>';
      disclaimer.textContent = 'To continue, Microsoft will share your name, email address, and account permissions with Stackly.';
    }

    const accounts = isGoogle ? GOOGLE_ACCOUNTS : MICROSOFT_ACCOUNTS;
    list.innerHTML = accounts.map((acc, index) => `
      <button type="button" class="oauth-account-item" data-index="${index}">
        <span class="oauth-avatar" style="background-color: ${acc.color};">${acc.avatar}</span>
        <span class="oauth-account-details">
          <span class="oauth-account-name">${acc.name}</span>
          <span class="oauth-account-email">${acc.email}</span>
        </span>
        <svg class="oauth-chevron" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="9 18 15 12 9 6"/></svg>
      </button>
    `).join('');

    list.querySelectorAll('.oauth-account-item').forEach(btn => {
      btn.addEventListener('click', async () => {
        const idx = Number(btn.dataset.index);
        const selected = accounts[idx];
        if (selected) {
          btn.classList.add('oauth-account-loading');
          await completeOAuth(selected, provider);
        }
      });
    });

    modal.classList.add('is-open');
    modal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
  }

  function closeModal() {
    const modal = document.getElementById('social-auth-modal');
    if (modal) {
      modal.classList.remove('is-open');
      modal.setAttribute('aria-hidden', 'true');
      document.body.style.overflow = '';
    }
  }

  async function completeOAuth(account, provider) {
    const status = document.querySelector('#account-status');
    const providerName = provider === 'google' ? 'Google' : 'Microsoft';
    if (status) {
      status.textContent = `Authenticating with ${providerName}...`;
      status.className = 'status-success';
    }

    try {
      if (!window.StacklyAccounts || typeof window.StacklyAccounts.socialLogin !== 'function') {
        throw new Error('Account system is not loaded. Please refresh the page.');
      }
      
      const res = await window.StacklyAccounts.socialLogin({
        email: account.email,
        name: account.name,
        provider: provider
      });

      closeModal();

      if (status) {
        status.textContent = `Signed in as ${res.user.name} via ${providerName}! Redirecting...`;
        status.className = 'status-success';
      }

      setTimeout(() => {
        window.location.assign('location-permission.html');
      }, 500);

    } catch (err) {
      closeModal();
      if (status) {
        status.textContent = err.message || 'Authentication failed. Please try again.';
        status.className = 'status-invalid';
      }
    }
  }

  function initSocialAuth() {
    const googleBtn = document.getElementById('btn-social-google');
    const msBtn = document.getElementById('btn-social-microsoft');

    if (googleBtn) {
      googleBtn.addEventListener('click', (e) => {
        e.preventDefault();
        openModal('google');
      });
    }

    if (msBtn) {
      msBtn.addEventListener('click', (e) => {
        e.preventDefault();
        openModal('microsoft');
      });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initSocialAuth);
  } else {
    initSocialAuth();
  }

  window.StacklySocialAuth = { open: openModal, close: closeModal };
})();
