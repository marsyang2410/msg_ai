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
      
      // Add the modern grounding config
      requestData.tools = [{
        googleSearch: {}
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
    
    // Extract the response text and grounding metadata
    if (data.candidates && data.candidates.length > 0 && 
        data.candidates[0].content && data.candidates[0].content.parts && 
        data.candidates[0].content.parts.length > 0) {
      
      let responseText = data.candidates[0].content.parts[0].text;
      const groundingMetadata = data.candidates[0].groundingMetadata;
      
      // Process grounding metadata and add inline citations
      if (groundingMetadata && groundingMetadata.groundingChunks) {
        const { citedText, citations } = processGroundingMetadata(responseText, groundingMetadata);
        responseText = citedText;
        
        // If we have citations, append them at the end
        if (citations.length > 0) {
          responseText += '\n\n**Sources:**\n' + citations.map((citation, index) => 
            `[${index + 1}] ${citation.title}: ${citation.uri}`
          ).join('\n');
        }
      }
      
      return responseText;
    } else {
      throw new Error('Invalid response format from Gemini API');
    }
  } catch (error) {
    console.error('Gemini API error:', error);
    throw error;
  }
}

// Helper function to process grounding metadata and add inline citations
function processGroundingMetadata(text, groundingMetadata) {
  if (!groundingMetadata || !groundingMetadata.groundingChunks) {
    return { citedText: text, citations: [] };
  }
  
  // Extract unique web sources from grounding chunks
  const webSources = new Map();
  const groundingSupports = groundingMetadata.groundingSupports || [];
  
  // Build a map of web sources
  groundingMetadata.groundingChunks.forEach((chunk, index) => {
    if (chunk.web && chunk.web.uri && chunk.web.title) {
      const sourceKey = chunk.web.uri;
      if (!webSources.has(sourceKey)) {
        webSources.set(sourceKey, {
          title: chunk.web.title,
          uri: chunk.web.uri,
          citationIndex: webSources.size + 1
        });
      }
    }
  });
  
  let citedText = text;
  const citations = Array.from(webSources.values());
  
  // Process grounding supports to add inline citations
  if (groundingSupports.length > 0 && citations.length > 0) {
    // Sort grounding supports by start index in descending order
    // This prevents index shifting when inserting citations
    const sortedSupports = groundingSupports
      .filter(support => support.segment && support.groundingChunkIndices)
      .sort((a, b) => (b.segment.startIndex || 0) - (a.segment.startIndex || 0));
    
    for (const support of sortedSupports) {
      const startIndex = support.segment.startIndex || 0;
      const endIndex = support.segment.endIndex || startIndex;
      
      // Get the chunk indices for this support
      const chunkIndices = support.groundingChunkIndices || [];
      
      // Map chunk indices to citation numbers
      const citationNumbers = chunkIndices
        .map(chunkIndex => {
          const chunk = groundingMetadata.groundingChunks[chunkIndex];
          if (chunk && chunk.web && chunk.web.uri) {
            const source = webSources.get(chunk.web.uri);
            return source ? source.citationIndex : null;
          }
          return null;
        })
        .filter(num => num !== null)
        .filter((num, index, arr) => arr.indexOf(num) === index) // Remove duplicates
        .sort((a, b) => a - b);
      
      // Insert citation markers
      if (citationNumbers.length > 0) {
        const citationMarker = `[${citationNumbers.join(',')}]`;
        citedText = citedText.slice(0, endIndex) + citationMarker + citedText.slice(endIndex);
      }
    }
  }
  
  return { citedText, citations };
}

// NEW: Function to get text embeddings using Gemini
async function getTextEmbedding(text, apiKey) {
  const url = 'https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent';
  
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-goog-api-key': apiKey
      },
      body: JSON.stringify({
        model: 'models/text-embedding-004',
        content: {
          parts: [{ text: text.substring(0, 2048) }] // Limit text length for embedding
        }
      })
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error?.message || 'Embedding API request failed');
    }
    
    const data = await response.json();
    return data.embedding.values; // Returns array of 768 numbers
  } catch (error) {
    console.error('Gemini Embedding API error:', error);
    throw error;
  }
}

// NEW: Batch embedding function for better efficiency with rate limiting
async function getBatchEmbeddings(texts, apiKey) {
  const embeddings = [];
  
  // Process in smaller batches with adaptive sizing based on text length
  const avgTextLength = texts.reduce((sum, text) => sum + text.length, 0) / texts.length;
  const batchSize = avgTextLength > 1000 ? 2 : 3; // Smaller batches for longer texts
  
  console.log(`Processing ${texts.length} embeddings in batches of ${batchSize}`);
  
  for (let i = 0; i < texts.length; i += batchSize) {
    const batch = texts.slice(i, i + batchSize);
    
    const batchPromises = batch.map(async (text, index) => {
      try {
        // Add small delay between requests in same batch to avoid rate limits
        if (index > 0) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
        return await getTextEmbedding(text, apiKey);
      } catch (error) {
        console.warn(`Failed to embed text ${i + index}:`, error.message);
        return new Array(768).fill(0); // Return zero vector as fallback
      }
    });
    
    const batchResults = await Promise.all(batchPromises);
    embeddings.push(...batchResults);
    
    // Progressive delay between batches to respect rate limits
    if (i + batchSize < texts.length) {
      const delay = Math.min(300 + (i / batchSize) * 50, 800); // Increasing delay
      await new Promise(resolve => setTimeout(resolve, delay));
    }
    
    // Log progress
    console.log(`Embedding progress: ${Math.min(i + batchSize, texts.length)}/${texts.length}`);
  }
  
  return embeddings;
}

// Helper function to determine if a query requires complex reasoning
function isComplexReasoningQuery(query) {
  // Keywords that suggest complex reasoning tasks
  const complexReasoningKeywords = [
    'analyze', 'comparison', 'compare', 'evaluate', 'assess', 'critique',
    'explain how', 'explain why', 'reasoning', 'logic', 'argument',
    'pros and cons', 'advantages', 'disadvantages', 'trade-offs',
    'strategy', 'plan', 'approach', 'methodology', 'framework',
    'complex', 'detailed analysis', 'in-depth', 'comprehensive',
    'multi-step', 'step by step', 'breakdown', 'systematically',
    'implications', 'consequences', 'impact', 'effects',
    'solve', 'problem', 'solution', 'troubleshoot', 'debug',
    'code review', 'architecture', 'design pattern', 'algorithm',
    'mathematical', 'calculation', 'formula', 'equation'
  ];
  
  // Check query length (longer queries often require more reasoning)
  const isLongQuery = query.length > 200;
  
  // Check for complex reasoning keywords
  const hasComplexKeywords = complexReasoningKeywords.some(keyword => 
    query.toLowerCase().includes(keyword.toLowerCase())
  );
  
  // Check for multiple questions or complex sentence structure
  const hasMultipleQuestions = (query.match(/\?/g) || []).length > 1;
  const hasComplexStructure = query.includes(';') || query.includes('however') || 
                             query.includes('furthermore') || query.includes('moreover');
  
  return isLongQuery || hasComplexKeywords || hasMultipleQuestions || hasComplexStructure;
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
