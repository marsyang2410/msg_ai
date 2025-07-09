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
  
  // NEW: Handle embedding requests for RAG
  if (request.action === 'getEmbedding') {
    chrome.storage.sync.get(['geminiApiKey'], function(result) {
      if (!result.geminiApiKey) {
        sendResponse({
          success: false,
          error: 'API key not found. Please set your Gemini API key in the extension options.'
        });
        return;
      }
      
      getTextEmbedding(request.text, result.geminiApiKey)
        .then(embedding => {
          sendResponse({
            success: true,
            embedding: embedding
          });
        })
        .catch(error => {
          sendResponse({
            success: false,
            error: error.message
          });
        });
    });
    
    return true;
  }
  
  // NEW: Handle batch embedding requests for efficiency
  if (request.action === 'getBatchEmbeddings') {
    chrome.storage.sync.get(['geminiApiKey'], function(result) {
      if (!result.geminiApiKey) {
        sendResponse({
          success: false,
          error: 'API key not found'
        });
        return;
      }
      
      getBatchEmbeddings(request.texts, result.geminiApiKey)
        .then(embeddings => {
          sendResponse({
            success: true,
            embeddings: embeddings
          });
        })
        .catch(error => {
          sendResponse({
            success: false,
            error: error.message
          });
        });
    });
    
    return true;
  }
});

// Function to call Gemini API
async function fetchGeminiResponse(messages, apiKey, enableGrounding, groundingMode, pageUrl) {
  // Determine which Gemini model to use based on complexity and RAG context
  // gemini-2.0-flash-lite: Ultra-fast, most cost-effective for RAG queries and simple tasks
  // gemini-2.5-flash: Enhanced capabilities for complex reasoning and summaries
  const lastMessage = messages[messages.length - 1]?.content || '';
  
  // Check if this is a RAG-enhanced query (contains relevant context)
  const hasRAGContext = lastMessage.includes('RELEVANT CONTEXT:') || lastMessage.includes('[RAG]');
  
  // Check if this is a summary query that needs more tokens
  const isSummaryQuery = lastMessage.toLowerCase().includes('summarize') ||
                        lastMessage.toLowerCase().includes('summary') ||
                        lastMessage.toLowerCase().includes('overview') ||
                        lastMessage.toLowerCase().includes('what is this about') ||
                        lastMessage.toLowerCase().includes('main points');
  
  const isComplexQuery = !hasRAGContext && isComplexReasoningQuery(lastMessage);
  
  let modelName;
  if (hasRAGContext) {
    // Use ultra-fast lite model for RAG queries since context is pre-filtered
    modelName = 'gemini-2.0-flash-lite';
  } else if (isComplexQuery || isSummaryQuery) {
    modelName = 'gemini-2.5-flash'; // Use 2.5 Flash for complex queries and summaries
  } else {
    modelName = 'gemini-2.0-flash-lite'; // Use lite model for standard queries
  }
  
  console.log(`MSG: Using ${modelName} (RAG: ${hasRAGContext}, Complex: ${isComplexQuery}, Summary: ${isSummaryQuery})`);
  
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent`;
  
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
  
  // Build the request data with optimized settings for Gemini 2.0/2.5 Flash models
  const requestData = {
    contents: formattedMessages.length > 0 ? formattedMessages : [{ role: 'user', parts: [{ text: systemPrompt || 'Hello' }] }],
    generationConfig: {
      temperature: 0.7,
      topK: modelName === 'gemini-2.5-flash' ? 64 : 40, // Higher for 2.5 Flash
      topP: 0.95,
      // Optimize output tokens based on query type and model capabilities
      maxOutputTokens: hasRAGContext ? 4096 : (isSummaryQuery ? 8192 : 6144)
    }
  };
  
  // Add grounding configuration if enabled
  if (enableGrounding)