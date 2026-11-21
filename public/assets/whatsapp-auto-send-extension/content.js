// Kidzee School - WhatsApp Web Auto-Send & Auto-Close Extension
// Detects incoming send requests, clicks Send button, and closes tab automatically

(function () {
  'use strict';

  console.log('[Kidzee Extension] Content script loaded on WhatsApp Web');

  const url = window.location.href;
  const isAutoSend = url.includes('autosend=1') || url.includes('autoclick=1') || url.includes('send=1');

  // Floating notification badge
  const badge = document.createElement('div');
  badge.style.cssText = `
    position: fixed;
    top: 14px;
    left: 50%;
    transform: translateX(-50%);
    background: #047857;
    color: #ffffff;
    padding: 8px 18px;
    border-radius: 9999px;
    font-family: system-ui, -apple-system, sans-serif;
    font-size: 13px;
    font-weight: 700;
    z-index: 9999999;
    box-shadow: 0 8px 30px rgba(0,0,0,0.3);
    display: flex;
    align-items: center;
    gap: 8px;
  `;
  badge.innerHTML = '<span>⚡ Kidzee School Auto-Sender Active...</span>';
  document.body.appendChild(badge);

  let timer = null;
  let attempts = 0;

  function findSendButton() {
    return (
      document.querySelector('button[aria-label="Send"]') ||
      document.querySelector('span[data-icon="send"]')?.closest('button') ||
      document.querySelector('[data-testid="send"]') ||
      document.querySelector('button[data-tab="11"]')
    );
  }

  timer = setInterval(() => {
    attempts++;

    // Check invalid phone number alert
    const invalidDialog = document.querySelector('[data-testid="popup-controls-ok"] button, [data-animate-modal-popup] button');
    if (invalidDialog && invalidDialog.textContent?.includes('OK')) {
      badge.style.background = '#e11d48';
      badge.innerHTML = '<span>⚠️ Invalid phone number. Closing tab...</span>';
      clearInterval(timer);
      setTimeout(() => window.close(), 3000);
      return;
    }

    const sendBtn = findSendButton();
    if (sendBtn) {
      clearInterval(timer);
      badge.style.background = '#059669';
      badge.innerHTML = '<span>🚀 Found Send Button! Auto-Clicking now...</span>';

      setTimeout(() => {
        try {
          sendBtn.click();
          badge.innerHTML = '<span>✅ Message Sent! Closing tab in 2s...</span>';

          setTimeout(() => {
            window.close();
            badge.innerHTML = '<span>✅ Sent! Please close this tab.</span>';
          }, 2000);
        } catch (e) {
          console.error('[Kidzee Extension] Click error:', e);
          badge.innerHTML = '<span>⚠️ Hit Enter to send message. Tab closes soon.</span>';
          setTimeout(() => window.close(), 4000);
        }
      }, 700);
    } else if (attempts > 50) {
      clearInterval(timer);
      badge.style.background = '#64748b';
      badge.innerHTML = '<span>ℹ️ Auto-Sender: Chat ready. Press Enter to send.</span>';
      setTimeout(() => badge.remove(), 4000);
    }
  }, 500);
})();
