// Background script for MSG extension

// Listen for installation
chrome.runtime.onInstalled.addListener(function(details) {
  if (details.reason === 'install') {
    // Open options page on install
    chrome.tabs.create({
      url: 'options.html'
    });
  }
});

// Listen for messages from content script
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  if (request.action === 'fetchGeminiResponse') {
    // Get API key and settings from storage
    chrome.storage.sync.get(['geminiApiKey', 'msgSettings'], function(result) {
      if (!result.geminiApiKey) {
        sendResponse({
          success: false,
          error: 'API key not found. Please set your Gemini API key in the extension options.'
        });
        return;
      }
      
      // Get grounding settings
      const settings = result.msgSettings || {};
      const enableGrounding = settings.enableGrounding || false;
      const groundingMode = settings.groundingMode || 'auto';
      
      // Call Gemini API with appropriate grounding settings
      fetchGeminiResponse(request.messages, result.geminiApiKey, enableGrounding, groundingMode, request.url)
        .then(response => {
          sendResponse({
            success: true,
            response: response
          });
        })
        .catch(error => {
          sendResponse({
            success: false,
            error: error.message
          });
        });
    });
    
    // Return true to indicate that the response will be sent asynchronously
    return true;
  }
});

// Function to call Gemini API
async function fetchGeminiResponse(messages, apiKey, enableGrounding, groundingMode, pageUrl) {
  // Determine which Gemini model to use
  // For grounding, we use gemini-2.0-pro which supports the grounding feature
  const modelSuffix = enableGrounding ? 'pro' : 'flash';
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-${modelSuffix}:generateContent`;
  
  // Format messages for Gemini API - handle system prompt separately
  let systemPrompt = '';
  const filteredMessages = messages.filter(msg => {
    if (msg.role === 'system') {
      systemPrompt = msg.content;
      return false;
    }
    return true;
  });
  
  // Make sure we have at least one user message - if not, create a default one
  if (filteredMessages.length === 0 || filteredMessages[0].role !== 'user') {
    filteredMessages.unshift({
      role: 'user',
      content: 'Please summarize this webpage using the content you already have.'
    });
  }
  
  // Always include system prompt with the first user message
  if (systemPrompt) {
    filteredMessages[0] = {
      role: 'user',
      content: `${systemPrompt}\n\n${filteredMessages[0].content}`
    };
  }
  
  const formattedMessages = filteredMessages.map(msg => ({
    role: msg.role === 'assistant' ? 'model' : 'user', // Convert roles to Gemini format
    parts: [{ text: msg.content }]
  }));
  
  // Build the request data
  const requestData = {
    contents: formattedMessages.length > 0 ? formattedMessages : [{ role: 'user', parts: [{ text: systemPrompt || 'Hello' }] }],
    generationConfig: {
      temperature: 0.7,
      topK: 40,
      topP: 0.95,
      maxOutputTokens: 2048
    }
  };
  
  // Add grounding configuration if enabled
  if (enableGrounding) {
    // Determine if grounding should be used based on mode
    const shouldGround = 
      groundingMode === 'always' || 
      (groundingMode === 'auto' && shouldUseGroundingForQuery(filteredMessages[filteredMessages.length - 1]