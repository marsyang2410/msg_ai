document.addEventListener('DOMContentLoaded', function() {
  // Elements
  const apiKeyInput = document.getElementById('api-key');
  const saveApiKeyButton = document.getElementById('save-api-key');
  const loginButton = document.getElementById('login-button');
  const logoutButton = document.getElementById('logout-button');
  const loginStatus = document.getElementById('login-status');
  const logoutSection = document.getElementById('logout-section');
  const userEmail = document.getElementById('user-email');
  const darkModeCheckbox = document.getElementById('dark-mode');
  const transparentBgCheckbox = document.getElementById('transparent-bg');
  const panelWidthSelect = document.getElementById('panel-width');
  const autoSummarizeCheckbox = document.getElementById('auto-summarize');
  const saveSettingsButton = document.getElementById('save-settings');
  const statusMessage = document.getElementById('status-message');
  const enableGroundingCheckbox = document.getElementById('enable-grounding');
  const groundingModeSelect = document.getElementById('grounding-mode');
  const groundingSettings = document.getElementById('grounding-settings');
  const languageSelect = document.getElementById('language-select');

  // Load saved settings
  loadSettings();

  // Handle language change
  if (languageSelect) {
    languageSelect.addEventListener('change', function() {
      const selectedLanguage = this.value;
      window.i18n.setLanguage(selectedLanguage);
      window.i18n.updatePageTranslations();
      
      // Save language preference immediately
      chrome.storage.sync.get(['msgSettings'], function(result) {
        const existingSettings = result.msgSettings || {};
        const mergedSettings = { ...existingSettings, language: selectedLanguage };
        chrome.storage.sync.set({ msgSettings: mergedSettings });
      });
    });
  }

  // Listen for storage changes to sync with popup
  chrome.storage.onChanged.addListener(function(changes, namespace) {
    if (namespace === 'sync' && changes.msgSettings) {
      loadSettings();
    }
    if (namespace === 'sync' && changes.userInfo) {
      chrome.storage.sync.get(['userInfo'], function(result) {
        updateLoginState(result.userInfo);
      });
    }
  });

  // Save API key
  saveApiKeyButton.addEventListener('click', function() {
    const apiKey = apiKeyInput.value.trim();
    
    if (!apiKey) {
      showStatus(window.i18n.t('invalid_api_key'), 'error');
      return;
    }
    
    chrome.storage.sync.set({ geminiApiKey: apiKey }, function() {
      showStatus(window.i18n.t('api_key_saved'), 'success');
    });
  });

  // Save all settings
  saveSettingsButton.addEventListener('click', function() {
    const settings = {
      darkMode: darkModeCheckbox.checked,
      transparentBg: transparentBgCheckbox.checked,
      panelWidth: panelWidthSelect.value,
      autoSummarize: autoSummarizeCheckbox.checked,
      enableGrounding: enableGroundingCheckbox.checked,
      groundingMode: groundingModeSelect.value,
      language: languageSelect ? languageSelect.value : 'en'
    };
    
    // Get existing settings and merge with new ones to preserve any other settings
    chrome.storage.sync.get(['msgSettings'], function(result) {
      const existingSettings = result.msgSettings || {};
      const mergedSettings = { ...existingSettings, ...settings };
      
      chrome.storage.sync.set({ msgSettings: mergedSettings }, function() {
        showStatus(window.i18n.t('settings_saved'), 'success');
      });
    });
  });

  // Handle Google Sign In
  loginButton.addEventListener('click', function() {
    chrome.identity.getAuthToken({ interactive: true }, function(token) {
      if (chrome.runtime.lastError) {
        showStatus(window.i18n.t('signin_failed') + ': ' + chrome.runtime.lastError.message, 'error');
        return;
      }
      
      // Use the token to get user info
      fetch('https://www.googleapis.com/oauth2/v1/userinfo?alt=json', {
        headers: {
          'Authorization': 'Bearer ' + token
        }
      })
      .then(response => response.json())
      .then(data => {
        chrome.storage.sync.set({ userInfo: data }, function() {
          updateLoginState(data);
          showStatus(window.i18n.t('signin_successful'), 'success');
        });
      })
      .catch(error => {
        showStatus(window.i18n.t('signin_failed') + ': ' + error, 'error');
      });
    });
  });

  // Handle logout
  logoutButton.addEventListener('click', function() {
    chrome.identity.getAuthToken({ interactive: false }, function(token) {
      if (token) {
        // Revoke token
        fetch('https://accounts.google.com/o/oauth2/revoke?token=' + token)
          .then(() => {              chrome.identity.removeCachedAuthToken({ token: token }, function() {
                chrome.storage.sync.remove('userInfo', function() {
                  updateLoginState(null);
                  showStatus(window.i18n.t('signout_successful'), 'success');
                });
              });
            })
            .catch(error => {
              showStatus(window.i18n.t('signout_failed') + ': ' + error, 'error');
            });
      }
    });
  });

  // Toggle grounding settings visibility based on checkbox
  enableGroundingCheckbox.addEventListener('change', function() {
    groundingSettings.style.display = this.checked ? 'block' : 'none';
  });

  // Load settings from storage
  function loadSettings() {
    chrome.storage.sync.get(['geminiApiKey', 'userInfo', 'msgSettings'], function(result) {
      // API Key
      if (result.geminiApiKey) {
        apiKeyInput.value = '••••••••••••••••••••••';
      }
      
      // User info
      if (result.userInfo) {
        updateLoginState(result.userInfo);
      }
      
      // App settings
      if (result.msgSettings) {
        darkModeCheckbox.checked = result.msgSettings.darkMode || false;
        transparentBgCheckbox.checked = result.msgSettings.transparentBg || true;
        panelWidthSelect.value = result.msgSettings.panelWidth || 'medium';
        autoSummarizeCheckbox.checked = result.msgSettings.autoSummarize || false;
        enableGroundingCheckbox.checked = result.msgSettings.enableGrounding || false;
        groundingModeSelect.value = result.msgSettings.groundingMode || 'auto';
        
        if (languageSelect) {
          languageSelect.value = result.msgSettings.language || 'en';
        }
        
        // Set language and update translations
        window.i18n.setLanguage(result.msgSettings.language || 'en');
        window.i18n.updatePageTranslations();
        
        // Set initial visibility of grounding settings
        groundingSettings.style.display = enableGroundingCheckbox.checked ? 'block' : 'none';
      } else {
        // Default state for grounding settings
        groundingSettings.style.display = 'none';
        // Default language
        window.i18n.setLanguage('en');
        window.i18n.updatePageTranslations();
      }
    });
  }

  // Update login state UI
  function updateLoginState(userInfo) {
    if (userInfo) {
      loginStatus.style.display = 'none';
      logoutSection.style.display = 'block';
      userEmail.textContent = userInfo.email;
    } else {
      loginStatus.style.display = 'block';
      logoutSection.style.display = 'none';
    }
  }

  // Show status message
  function showStatus(message, type) {
    statusMessage.textContent = message;
    statusMessage.className = 'status ' + type;
    statusMessage.style.display = 'block';
    
    setTimeout(function() {
      statusMessage.style.display = 'none';
    }, 3000);
  }
});
