// ==UserScript==
// @name         Kidzee School - WhatsApp Web Auto-Send & Auto-Close
// @namespace    https://kidzee.school/
// @version      1.2
// @description  Automatically clicks the green Send button on WhatsApp Web for Kidzee School parent notices and closes the tab after dispatch.
// @author       Kidzee School Administration
// @match        https://web.whatsapp.com/*
// @grant        window.close
// @run-at       document-idle
// ==/UserScript==

(function() {
  'use strict';

  console.log('[Kidzee Auto-Sender] Initialized on WhatsApp Web.');

  // Check if auto-send requested via hash or if pre-filled text is waiting
  const url = window.location.href;
  const isAutoSendRequested = url.includes('autosend=1') || url.includes('autoclick=1') || url.includes('send=1');

  // Inject a small status badge at the top of the WhatsApp screen
  const statusBadge = document.createElement('div');
  statusBadge.id = 'kidzee-autosend-badge';
  statusBadge.style.cssText = `
    position: fixed;
    top: 12px;
    left: 50%;
    transform: translateX(-50%);
    background: #047857;
    color: #ffffff;
    padding: 8px 16px;
    border-radius: 9999px;
    font-family: system-ui, -apple-system, sans-serif;
    font-size: 13px;
    font-weight: bold;
    z-index: 999999;
    box-shadow: 0 10px 25px rgba(0,0,0,0.3);
    display: flex;
    align-items: center;
    gap: 8px;
    transition: all 0.3s ease;
  `;
  statusBadge.innerHTML = '<span>⚡ Kidzee Auto-Sender: Waiting for chat to load...</span>';
  document.body.appendChild(statusBadge);

  let attempts = 0;
  const maxAttempts = 60; // 30 seconds max timeout

  const checkAndSendInterval = setInterval(() => {
    attempts++;

    // Look for WhatsApp Web's Send button
    // 1. Standard button with aria-label="Send"
    // 2. Button containing span with data-icon="send"
    // 3. data-testid="send"
    const sendButton = document.querySelector('button[aria-label="Send"]')
                    || document.querySelector('span[data-icon="send"]')?.closest('button')
                    || document.querySelector('[data-testid="send"]')
                    || document.querySelector('button[data-tab="11"]');

    // Also check if invalid number dialog is shown
    const okButton = document.querySelector('[data-testid="popup-controls-ok"] button, [data-animate-modal-popup] button');
    if (okButton && okButton.textContent?.includes('OK')) {
      statusBadge.style.background = '#e11d48';
      statusBadge.innerHTML = '<span>⚠️ Phone number invalid or not on WhatsApp. Closing in 3s...</span>';
      clearInterval(checkAndSendInterval);
      setTimeout(() => {
        window.close();
      }, 3000);
      return;
    }

    if (sendButton) {
      clearInterval(checkAndSendInterval);
      statusBadge.style.background = '#059669';
      statusBadge.innerHTML = '<span>🚀 Send button detected! Clicking Send now...</span>';

      // Small delay so WhatsApp Web finishes populating input
      setTimeout(() => {
        try {
          sendButton.click();
          console.log('[Kidzee Auto-Sender] Clicked Send button successfully.');
          statusBadge.innerHTML = '<span>✅ Message Sent! Closing tab in 2 seconds...</span>';

          // Wait 2.2 seconds for message to reach server / display double tick then close tab
          setTimeout(() => {
            window.close();
            // Fallback if window.close was restricted by browser
            statusBadge.innerHTML = '<span>✅ Message Sent! Please close this tab.</span>';
          }, 2200);
        } catch (err) {
          console.error('[Kidzee Auto-Sender] Error clicking send:', err);
          statusBadge.style.background = '#d97706';
          statusBadge.innerHTML = '<span>⚠️ Press ENTER to send message. Tab will close shortly.</span>';
          setTimeout(() => window.close(), 4000);
        }
      }, 800);
    } else if (attempts >= maxAttempts) {
      clearInterval(checkAndSendInterval);
      statusBadge.style.background = '#475569';
      statusBadge.innerHTML = '<span>ℹ️ Auto-Sender: Chat ready. Press Enter to send manually.</span>';
      setTimeout(() => {
        if (statusBadge.parentNode) statusBadge.remove();
      }, 5000);
    }
  }, 500);

})();
