document.addEventListener('DOMContentLoaded', function() {
  // Elements
  const apiKeyInput = document.getElementById('api-key-input');
  const saveApiKeyButton = document.getElementById('save-api-key');
  const loginButton = document.getElementById('login-button');
  const statusMessage = document.getElementById('status-message');
  
  // Check if API key is already saved
  chrome.storage.sync.get(['geminiApiKey'], function(result) {
    if (result.geminiApiKey) {
      apiKeyInput.value = '••••••••••••••••••••••';
      showStatus('API key is set', 'success');
    }
  });
  
  // Save API key
  saveApiKeyButton.addEventListener('click', function() {
    const apiKey = apiKeyInput.value.trim();
    
    if (!apiKey) {
      showStatus('Please enter a valid API key', 'error');
      return;
    }
    
    chrome.storage.sync.set({ geminiApiKey: apiKey }, function() {
      showStatus('API key saved successfully!', 'success');
      apiKeyInput.value = '••••••••••••••••••••••';
    });
  });
  
  // Handle Google Sign In
  loginButton.addEventListener('click', function() {
    chrome.identity.getAuthToken({ interactive: true }, function(token) {
      if (chrome.runtime.lastError) {
        showStatus('Sign in failed: ' + chrome.runtime.lastError.message, 'error');
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
          showStatus('Signed in as ' + data.email, 'success');
        });
      })
      .catch(error => {
        showStatus('Failed to get user info: ' + error, 'error');
      });
    });
  });
  
  function showStatus(message, type) {
    statusMessage.textContent = message;
    statusMessage.className = 'status ' + type;
    statusMessage.style.display = 'block';
    
    setTimeout(function() {
      statusMessage.style.display = 'none';
    }, 3000);
  }
});
