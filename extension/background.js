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
      (groundingMode === 'auto' && shouldUseGroundingForQuery(filteredMessages[filteredMessages.length - 1].content)) ||
      (groundingMode === 'explicit' && explicitlyRequestedGrounding(filteredMessages[filteredMessages.length - 1].content));
    
    if (shouldGround) {
      requestData.systemInstruction = {
        parts: [{
          text: "You are an AI assistant with web grounding capabilities. Use web searches to provide accurate, up-to-date information when answering questions. Cite your sources inline. For webpage content analysis, focus on the content provided by the user and only use grounding when questions extend beyond the provided content."
        }]
      };
      
      // Add the grounding config
      requestData.tools = [{
        googleSearchRetrieval: {
          disableAttribution: false
        }
      }];
    }
  }
  
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-goog-api-key': apiKey
      },
      body: JSON.stringify(requestData)
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error?.message || 'API request failed');
    }
    
    const data = await response.json();
    
    // Extract the response text
    if (data.candidates && data.candidates.length > 0 && 
        data.candidates[0].content && data.candidates[0].content.parts && 
        data.candidates[0].content.parts.length > 0) {
      return data.candidates[0].content.parts[0].text;
    } else {
      throw new Error('Invalid response format from Gemini API');
    }
  } catch (error) {
    console.error('Gemini API error:', error);
    throw error;
  }
}

// Helper function to determine if a query would benefit from grounding
function shouldUseGroundingForQuery(query) {
  // List of keywords that suggest the query would benefit from current information
  const groundingKeywords = [
    'current', 'latest', 'recent', 'today', 'news', 'update', 
    'what is happening', 'this year', 'this month', 'this week',
    'tell me about', 'who is', 'where is', 'when did', 'how many',
    'search for', 'look up', 'find information', 'research',
    'stock price', 'weather', 'event', 'fact check', 'verify'
  ];
  
  // Check if any of the keywords are in the query
  return groundingKeywords.some(keyword => 
    query.toLowerCase().includes(keyword.toLowerCase())
  );
}

// Helper function to check if the user explicitly requested grounding
function explicitlyRequestedGrounding(query) {
  const explicitGroundingPhrases = [
    'search', 'look up', 'find online', 'google', 'web search',
    'search the web', 'find information about', 'use grounding',
    'check online', 'search for', 'use web search', 'search the internet'
  ];
  
  return explicitGroundingPhrases.some(phrase => 
    query.toLowerCase().includes(phrase.toLowerCase())
  );
}
