// Content script for MSG extension

// Track keypress timing for "/" key double press detection
let lastSlashPressTime = 0;
const DOUBLE_PRESS_THRESHOLD = 500; // milliseconds

// Chat panel elements
let chatPanel;
let chatContainer;
let inputField;
let sendButton;

// Chat messages array
let chatMessages = [];

// Global state variables for chat persistence
window.msgContextPrepared = false;   // Has the context been prepared?
window.msgAutoSummarized = false;    // Has auto-summary been performed?
window.msgPageInfo = null;           // Extracted page content
window.msgIconAdded = false;         // Tracks if the floating icon has been added

// Initialize i18n support
let i18n = null;

// Initialize i18n when the page loads
function initializeI18n() {
  if (typeof I18n !== 'undefined') {
    i18n = new I18n();
    
    // Get the current language from storage
    chrome.storage.sync.get(['msgSettings'], function(result) {
      const settings = result.msgSettings || {};
      const language = settings.language || 'en';
      i18n.setLanguage(language);
    });
  } else {
    // If I18n class is not available, create a fallback
    i18n = {
      t: function(key) {
        // Fallback translations for content script
        const fallback = {
          'chat_title': 'MSG Chat',
          'ask_placeholder': 'Ask anything about this page...',
          'welcome_message': 'Hi there! I\'m MSG, your website assistant. I\'ve analyzed this page and can help you understand its content with intelligent search.',
          'grounding_enabled_all': 'Web search is enabled for all queries.',
          'grounding_enabled_auto': 'Web search will be used automatically when needed.',
          'grounding_enabled_explicit': 'Web search is available when you explicitly ask for it (e.g., "search for...")',
          'content_loaded': 'Content loaded ({size}KB). {grounding} Type "summarize" for a quick overview.',
          'content_loaded_simple': 'Content loaded ({size}KB). Type "summarize" for a quick overview.',
          'web_search_indicator': 'Web Search',
          'api_key_error': 'Error: Please check your API key in settings.'
        };
        return fallback[key] || key;
      }
    };
  }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeI18n);
} else {
  initializeI18n();
}

// Listen for language changes
chrome.storage.onChanged.addListener(function(changes, namespace) {
  if (namespace === 'sync' && changes.msgSettings) {
    const newSettings = changes.msgSettings.newValue || {};
    const oldSettings = changes.msgSettings.oldValue || {};
    
    if (newSettings.language !== oldSettings.language && i18n) {
      i18n.setLanguage(newSettings.language || 'en');
      updateContentTranslations();
      
      // Update system message in chat history if context is already prepared
      if (window.msgContextPrepared && window.msgPageInfo && chatMessages.length > 0) {
        // Find and update the system message (should be the first message)
        const systemMessageIndex = chatMessages.findIndex(msg => msg.role === 'system');
        if (systemMessageIndex !== -1) {
          // Determine if we should use full or minimal system message
          const isMinimalSystem = chatMessages[systemMessageIndex].content.includes('You will receive relevant content chunks');
          const newSystemMessage = isMinimalSystem ? 
            createMinimalSystemMessage(window.msgPageInfo) : 
            createSystemMessage(window.msgPageInfo);
          
          chatMessages[systemMessageIndex].content = newSystemMessage;
        }
      }
    }
  }
});

// Update translations for existing content
function updateContentTranslations() {
  // Update chat panel title if it exists
  if (chatPanel) {
    const titleElement = chatPanel.querySelector('.msg-panel-title');
    if (titleElement) {
      // Find the text node and update it
      const textNode = Array.from(titleElement.childNodes).find(node => node.nodeType === Node.TEXT_NODE);
      if (textNode) {
        textNode.textContent = ' ' + (i18n ? i18n.t('chat_title') : 'MSG Chat');
      }
    }
  }
  
  // Update input field placeholder if it exists
  if (inputField) {
    inputField.placeholder = i18n ? i18n.t('ask_placeholder') : 'Ask anything about this page...';
  }
}

// NEW: Performance optimization - Content cache with expiration
class ContentCache {
  constructor() {
    this.cache = new Map();
    this.maxSize = 10; // Maximum cached pages
    this.expiryTime = 30 * 60 * 1000; // 30 minutes
  }
  
  generateKey(url, title) {
    return `${url}:${title}`.substring(0, 100); // Limit key length
  }
  
  set(url, title, content, embeddings = null) {
    const key = this.generateKey(url, title);
    
    // Remove oldest entries if cache is full
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
    
    this.cache.set(key, {
      content,
      embeddings,
      timestamp: Date.now(),
      accessCount: 1
    });
  }
  
  get(url, title) {
    const key = this.generateKey(url, title);
    const cached = this.cache.get(key);
    
    if (!cached) return null;
    
    // Check if expired
    if (Date.now() - cached.timestamp > this.expiryTime) {
      this.cache.delete(key);
      return null;
    }
    
    // Update access count and timestamp
    cached.accessCount++;
    cached.timestamp = Date.now();
    
    return cached;
  }
  
  clear() {
    this.cache.clear();
  }
}

// NEW: RAG System for temporary webpage database with performance optimizations
class WebpageRAG {
  constructor() {
    this.chunks = [];
    this.embeddings = [];
    this.isInitialized = false;
    this.isInitializing = false;
    this.abortController = null; // For cancelling ongoing operations
  }

  async initializeRAG(pageContent) {
    if (this.isInitializing) return;
    this.isInitializing = true;
    
    // Cancel any previous initialization
    if (this.abortController) {
      this.abortController.abort();
    }
    this.abortController = new AbortController();
    
    console.log("MSG RAG: Starting initialization...");
    
    try {
      // Check cache first
      const cached = window.msgContentCache?.get(window.location.href, document.title);
      if (cached && cached.embeddings) {
        console.log("MSG RAG: Using cached embeddings");
        this.chunks = cached.content.chunks || this.createSemanticChunks(pageContent);
        this.embeddings = cached.embeddings;
        this.isInitialized = true;
        console.log(`MSG RAG: Cache hit - initialized with ${this.chunks.length} chunks`);
        return;
      }
      
      // Split content into semantic chunks (optimized)
      this.chunks = this.createSemanticChunks(pageContent);
      console.log(`MSG RAG: Created ${this.chunks.length} content chunks`);
      
      // Create embeddings for each chunk
      const chunkTexts = this.chunks.map(chunk => chunk.text);
      const embeddings = await this.getBatchEmbeddings(chunkTexts, this.abortController.signal);
      
      // Check if operation was aborted
      if (this.abortController.signal.aborted) {
        console.log("MSG RAG: Initialization aborted");
        return;
      }
      
      this.embeddings = embeddings;
      
      // Cache the results
      if (window.msgContentCache) {
        window.msgContentCache.set(
          window.location.href, 
          document.title, 
          { chunks: this.chunks, content: pageContent }, 
          embeddings
        );
      }
      
      this.isInitialized = true;
      console.log(`MSG RAG: Initialization complete with ${this.chunks.length} chunks`);
    } catch (error) {
      if (error.name !== 'AbortError') {
        console.error('MSG RAG: Initialization failed:', error);
      }
      this.isInitialized = false;
    } finally {
      this.isInitializing = false;
    }
  }

  createSemanticChunks(content) {
    const chunks = [];
    
    // Strategy 1: Split by headings and sections
    const sections = content.split(/\n(?=(?:TITLE:|META:|HEADINGS:|PAGE CONTENT:|H[1-6]:))/);
    
    sections.forEach(section => {
      if (section.trim().length < 100) return;
      
      // If section is very long, split by paragraphs
      if (section.length > 1500) {
        const paragraphs = section.split(/\n\s*\n/);
        let currentChunk = '';
        
        paragraphs.forEach(para => {
          if (para.trim().length < 50) return;
          
          if (currentChunk.length + para.length > 1200) {
            if (currentChunk.trim()) {
              chunks.push({
                text: currentChunk.trim(),
                type: 'paragraph_group',
                length: currentChunk.length,
                priority: this.calculateChunkPriority(currentChunk)
              });
            }
            currentChunk = para;
          } else {
            currentChunk += (currentChunk ? '\n\n' : '') + para;
          }
        });
        
        if (currentChunk.trim()) {
          chunks.push({
            text: currentChunk.trim(),
            type: 'paragraph_group',
            length: currentChunk.length,
            priority: this.calculateChunkPriority(currentChunk)
          });
        }
      } else {
        chunks.push({
          text: section.trim(),
          type: 'section',
          length: section.length,
          priority: this.calculateChunkPriority(section)
        });
      }
    });
    
    // Sort by priority and limit to top chunks for efficiency
    const sortedChunks = chunks
      .sort((a, b) => b.priority - a.priority)
      .slice(0, 10); // Reduced from 15 to 10 for better performance
    
    console.log(`MSG RAG: Optimized to ${sortedChunks.length} high-priority chunks`);
    return sortedChunks;
  }
  
  // NEW: Calculate chunk priority based on content characteristics
  calculateChunkPriority(text) {
    let priority = 0;
    
    // Higher priority for chunks with headings
    if (text.match(/^(H[1-6]:|TITLE:|META:)/m)) priority += 3;
    
    // Higher priority for longer, substantive content
    if (text.length > 800) priority += 2;
    if (text.length > 1200) priority += 1;
    
    // Higher priority for content with structured information
    if (text.match(/\d+\.|•|-|\*/g)) priority += 1;
    
    // Lower priority for repetitive or navigation content
    if (text.toLowerCase().includes('navigation') || 
        text.toLowerCase().includes('menu') ||
        text.toLowerCase().includes('footer')) priority -= 2;
    
    return priority;
  }

  async getBatchEmbeddings(texts, abortSignal = null) {
    return new Promise((resolve, reject) => {
      // Check if operation was aborted
      if (abortSignal?.aborted) {
        reject(new Error('Operation aborted'));
        return;
      }
      
      const timeoutId = setTimeout(() => {
        reject(new Error('Embedding request timeout'));
      }, 30000); // 30 second timeout
      
      chrome.runtime.sendMessage({
        action: 'getBatchEmbeddings',
        texts: texts
      }, (response) => {
        clearTimeout(timeoutId);
        
        if (abortSignal?.aborted) {
          reject(new Error('Operation aborted'));
          return;
        }
        
        if (response && response.success) {
          resolve(response.embeddings);
        } else {
          console.warn('Failed to get batch embeddings:', response?.error);
          resolve(texts.map(() => new Array(768).fill(0))); // Fallback
        }
      });
    });
  }

  async getTextEmbedding(text, abortSignal = null) {
    return new Promise((resolve, reject) => {
      // Check if operation was aborted
      if (abortSignal?.aborted) {
        reject(new Error('Operation aborted'));
        return;
      }
      
      const timeoutId = setTimeout(() => {
        reject(new Error('Embedding request timeout'));
      }, 10000); // 10 second timeout
      
      chrome.runtime.sendMessage({
        action: 'getEmbedding',
        text: text.substring(0, 500) // Limit for embedding
      }, (response) => {
        clearTimeout(timeoutId);
        
        if (abortSignal?.aborted) {
          reject(new Error('Operation aborted'));
          return;
        }
        
        if (response && response.success) {
          resolve(response.embedding);
        } else {
          resolve(new Array(768).fill(0)); // Fallback
        }
      });
    });
  }

  async searchRelevantChunks(query, topK = 3) {
    if (!this.isInitialized) {
      console.log('MSG RAG: Not initialized, returning empty results');
      return [];
    }
    
    try {
      // Get query embedding
      const queryEmbedding = await this.getTextEmbedding(query, this.abortController?.signal);
      
      // Calculate cosine similarity with all chunks
      const similarities = this.embeddings.map((embedding, index) => ({
        index,
        similarity: this.cosineSimilarity(queryEmbedding, embedding),
        chunk: this.chunks[index]
      }));
      
      // Return top K most similar chunks with improved filtering
      const results = similarities
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, topK)
        .filter(item => item.similarity > 0.15) // Increased threshold for better quality
        .map(item => ({
          ...item.chunk,
          similarity: item.similarity
        }));
      
      console.log(`MSG RAG: Found ${results.length} relevant chunks for query (avg similarity: ${(results.reduce((sum, r) => sum + r.similarity, 0) / results.length || 0).toFixed(3)})`);
      return results;
    } catch (error) {
      if (error.name !== 'AbortError') {
        console.error('MSG RAG: Search failed:', error);
      }
      return [];
    }
  }
  
  // Clean up resources
  cleanup() {
    if (this.abortController) {
      this.abortController.abort();
    }
    this.chunks = [];
    this.embeddings = [];
    this.isInitialized = false;
    this.isInitializing = false;
  }

  cosineSimilarity(a, b) {
    if (a.length !== b.length) return 0;
    
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    
    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }
    
    const norm = Math.sqrt(normA) * Math.sqrt(normB);
    return norm > 0 ? dotProduct / norm : 0;
  }
}

// Global RAG instance
window.msgRAG = new WebpageRAG();

// Global content cache instance
window.msgContentCache = new ContentCache();

// NEW: Cleanup manager for proper resource management
class CleanupManager {
  constructor() {
    this.cleanupTasks = new Set();
    this.eventListeners = new Map();
    this.timeouts = new Set();
    this.intervals = new Set();
  }
  
  addCleanupTask(fn) {
    this.cleanupTasks.add(fn);
  }
  
  removeCleanupTask(fn) {
    this.cleanupTasks.delete(fn);
  }
  
  addEventListener(element, event, handler, options) {
    if (!this.eventListeners.has(element)) {
      this.eventListeners.set(element, new Map());
    }
    this.eventListeners.get(element).set(event, { handler, options });
    element.addEventListener(event, handler, options);
  }
  
  removeEventListener(element, event) {
    const elementListeners = this.eventListeners.get(element);
    if (elementListeners && elementListeners.has(event)) {
      const { handler } = elementListeners.get(event);
      element.removeEventListener(event, handler);
      elementListeners.delete(event);
    }
  }
  
  setTimeout(fn, delay) {
    const id = setTimeout(fn, delay);
    this.timeouts.add(id);
    return id;
  }
  
  setInterval(fn, delay) {
    const id = setInterval(fn, delay);
    this.intervals.add(id);
    return id;
  }
  
  cleanup() {
    // Execute cleanup tasks
    this.cleanupTasks.forEach(fn => {
      try {
        fn();
      } catch (error) {
        console.error('Cleanup task failed:', error);
      }
    });
    
    // Remove event listeners
    this.eventListeners.forEach((events, element) => {
      events.forEach(({ handler }, event) => {
        try {
          element.removeEventListener(event, handler);
        } catch (error) {
          console.error('Failed to remove event listener:', error);
        }
      });
    });
    
    // Clear timeouts and intervals
    this.timeouts.forEach(id => clearTimeout(id));
    this.intervals.forEach(id => clearInterval(id));
    
    // Clear collections
    this.cleanupTasks.clear();
    this.eventListeners.clear();
    this.timeouts.clear();
    this.intervals.clear();
  }
}

// Global cleanup manager
window.msgCleanup = new CleanupManager();

// Handle keyboard events with debouncing for performance
function handleKeyDown(event) {
  // Check for '/' key (slash)
  if (event.key === '/') {
    const currentTime = Date.now();
    
    // Check if it's a double press
    if (currentTime - lastSlashPressTime < DOUBLE_PRESS_THRESHOLD) {
      // Toggle chat panel
      toggleChatPanel();
      event.preventDefault();
      
      // Reset the timing to prevent triple-press issues
      lastSlashPressTime = 0;
    } else {
      lastSlashPressTime = currentTime;
    }
  }
}

// Create the chat panel
function createChatPanel() {
  // Create main container
  chatPanel = document.createElement('div');
  chatPanel.id = 'msg-chat-panel';
  
  // Get user's preferred panel width from settings
  chrome.storage.sync.get(['msgSettings'], function(result) {
    const settings = result.msgSettings || {};
    const panelWidthSetting = settings.panelWidth || 'medium';
    
    let width;
    switch(panelWidthSetting) {
      case 'narrow':
        width = '300px';
        break;
      case 'wide':
        width = '450px';
        break;
      case 'medium':
      default:
        width = '380px';
        break;
    }
    
    // Apply the user's preferred width
    chatPanel.style.setProperty('width', width, 'important');
  });
  
  // Set other styles
  chatPanel.style.setProperty('min-width', '300px', 'important');
  chatPanel.style.setProperty('max-width', '80vw', 'important');
  chatPanel.style.setProperty('resize', 'none', 'important');
  
  // Add resize handle
  const resizeHandle = document.createElement('div');
  resizeHandle.className = 'msg-resize-handle';
  chatPanel.appendChild(resizeHandle);
  
  // Create header
  const header = document.createElement('div');
  header.className = 'msg-panel-header';
  
  const title = document.createElement('div');
  title.className = 'msg-panel-title';
  try {
    const logoURL = chrome.runtime.getURL('images/msg_logo.png');
    // Create the logo image element properly
    const logoImg = document.createElement('img');
    logoImg.src = logoURL;
    logoImg.alt = 'MSG';
    
    // Add error handling directly to the image element
    logoImg.onerror = function() {
      console.error("Failed to load chat panel logo image");
      this.style.display = 'none';
      // Add a fallback colored circle with M
      const fallbackLogo = document.createElement('span');
      fallbackLogo.className = 'msg-logo-fallback';
      fallbackLogo.textContent = 'M';
      title.insertBefore(fallbackLogo, title.firstChild);
    };
    
    // Add the image to the title
    title.appendChild(logoImg);
    title.appendChild(document.createTextNode(' ' + (i18n ? i18n.t('chat_title') : 'MSG Chat')));
    console.log("Using logo URL:", logoURL);
  } catch (e) {
    console.error("Error setting logo:", e);
    // Create a fallback colored circle with M
    const fallbackLogo = document.createElement('span');
    fallbackLogo.className = 'msg-logo-fallback';
    fallbackLogo.textContent = 'M';
    title.appendChild(fallbackLogo);
    title.appendChild(document.createTextNode(' ' + (i18n ? i18n.t('chat_title') : 'MSG Chat')));
  }
  
  const closeBtn = document.createElement('button');
  closeBtn.className = 'msg-close-btn';
  closeBtn.textContent = '×';
  closeBtn.addEventListener('click', toggleChatPanel);
  
  header.appendChild(title);
  header.appendChild(closeBtn);
  
  // Create chat container
  chatContainer = document.createElement('div');
  chatContainer.className = 'msg-chat-container';
  
  // Create input container
  const inputContainer = document.createElement('div');
  inputContainer.className = 'msg-input-container';
  
  inputField = document.createElement('textarea');
  inputField.className = 'msg-input';
  inputField.placeholder = i18n ? i18n.t('ask_placeholder') : 'Ask anything about this page...';
  inputField.addEventListener('keydown', function(event) {
    // Submit on Enter (without shift)
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      sendMessage();
    }
    
    // Auto-resize textarea with minimum height matching the new design
    setTimeout(() => {
      inputField.style.height = '48px'; // Reset to default height (matches new design)
      const newHeight = Math.max(48, Math.min(inputField.scrollHeight, 120));
      inputField.style.height = newHeight + 'px';
    }, 0);
  });
  
  // Also handle input event for dynamic resizing while typing
  inputField.addEventListener('input', function() {
    inputField.style.height = '48px'; // Reset to default height
    const newHeight = Math.max(48, Math.min(inputField.scrollHeight, 120));
    inputField.style.height = newHeight + 'px';
  });
  
  sendButton = document.createElement('button');
  sendButton.className = 'msg-send-btn';
  sendButton.innerHTML = '→';
  sendButton.setAttribute('aria-label', 'Send message');
  sendButton.setAttribute('title', 'Send message (Enter)');
  sendButton.addEventListener('click', sendMessage);
  
  inputContainer.appendChild(inputField);
  inputContainer.appendChild(sendButton);
  
  // Assemble the panel
  chatPanel.appendChild(header);
  chatPanel.appendChild(chatContainer);
  chatPanel.appendChild(inputContainer);
  
  // Add to document - use this approach to ensure our styles take precedence
  document.body.appendChild(chatPanel);
  
  // Force a redraw/reflow to ensure all styles are applied
  void chatPanel.offsetHeight;
  
  // Restore panel size with saved width from current session
  setTimeout(() => {
    // Small delay to ensure the panel is fully rendered
    restorePanelSize(false); // Pass false to NOT reset to default width
    
    // Force setup of resize handler after sizes are properly initialized
    setupResizeHandler();
    
    // Apply appearance settings
    applyAppearanceSettings();
  }, 100);
}

// Toggle chat panel visibility
function toggleChatPanel() {
  if (!chatPanel) {
    createChatPanel();
  }
  
  chatPanel.classList.toggle('visible');
  
  // Toggle floating icon visibility (hide when panel is visible)
  const floatingIcon = document.getElementById('msg-floating-icon');
  if (floatingIcon) {
    if (chatPanel.classList.contains('visible')) {
      floatingIcon.style.opacity = '0';
      floatingIcon.style.pointerEvents = 'none';
    } else {
      floatingIcon.style.opacity = '1';
      floatingIcon.style.pointerEvents = 'auto';
    }
  }
  
  if (chatPanel.classList.contains('visible')) {
    inputField.focus();
    
    // Only use the saved panel width if available from current session
    // (not triggering restorePanelSize which resets to default)
    try {
      const savedWidth = localStorage.getItem('msgChatPanelWidth');
      if (savedWidth) {
        // Apply saved width without resetting to default
        chatPanel.style.setProperty('width', savedWidth, 'important');
        console.log("MSG: Restored saved panel width:", savedWidth);
      }
    } catch (e) {
      console.error("MSG: Error restoring panel width:", e);
    }
    
    // Extract page content when panel is opened the first time
    if (!window.msgPageInfo) {
      console.log("MSG: Extracting page content...");
      const pageInfo = extractPageContent();
      console.log("MSG: Content extraction complete. Length:", pageInfo.content.length);
      
      // Store page content in a global variable for easy access
      window.msgPageInfo = pageInfo;
      
      // Initialize RAG database with the page content
      console.log("MSG: Initializing RAG database...");
      window.msgRAG.initializeRAG(pageInfo.content).then(() => {
        console.log("MSG: RAG database initialization complete");
      }).catch(error => {
        console.error("MSG: RAG initialization failed:", error);
      });
      
      // Log content length for debugging
      console.log("MSG: Extracted content length:", pageInfo.content.length);
      console.log("MSG: Content sample:", pageInfo.content.substring(0, 200) + "...");
    }
    
    // Add a hidden system message to prepare the context (only first time)
    if (!window.msgContextPrepared) {
      // For initial context, use full system message to ensure good summaries
      // RAG will optimize follow-up queries
      const contextMessage = createSystemMessage(window.msgPageInfo);
      
      // Reset chat history and add the context
      chatMessages = []; // Reset chat history for fresh context
      chatMessages.push({ role: 'system', content: contextMessage });
      window.msgContextPrepared = true;
      
      // Add welcome message (visual only, not sent to API)
      addVisualMessage('assistant', i18n ? i18n.t('welcome_message') : 'Hi there! I\'m MSG, your website assistant. I\'ve analyzed this page and can help you understand its content with intelligent search.');
      
      // Check if grounding is enabled and add a status message
      chrome.storage.sync.get(['msgSettings'], function(result) {
        const settings = result.msgSettings || {};
        if (settings.enableGrounding) {
          const groundingMode = settings.groundingMode || 'auto';
          let groundingMsg = '';
          
          switch(groundingMode) {
            case 'always':
              groundingMsg = i18n ? i18n.t('grounding_enabled_all') : 'Web search is enabled for all queries.';
              break;
            case 'auto':
              groundingMsg = i18n ? i18n.t('grounding_enabled_auto') : 'Web search will be used automatically when needed.';
              break;
            case 'explicit':
              groundingMsg = i18n ? i18n.t('grounding_enabled_explicit') : 'Web search is available when you explicitly ask for it (e.g., "search for...")';
              break;
          }
          
          // Update status to show context is loaded and grounding status
          const contentLoadedMsg = i18n ? i18n.t('content_loaded').replace('{size}', Math.round(window.msgPageInfo.content.length / 1000)).replace('{grounding}', groundingMsg) : `Content loaded (${Math.round(window.msgPageInfo.content.length / 1000)}KB). ${groundingMsg} Type "summarize" for a quick overview.`;
          addVisualMessage('assistant', contentLoadedMsg);
        } else {
          // Update status to show context is loaded (visual only, not sent to API)
          const contentLoadedSimpleMsg = i18n ? i18n.t('content_loaded_simple').replace('{size}', Math.round(window.msgPageInfo.content.length / 1000)) : `Content loaded (${Math.round(window.msgPageInfo.content.length / 1000)}KB). Type "summarize" for a quick overview.`;
          addVisualMessage('assistant', contentLoadedSimpleMsg);
        }
      });
    }
    
    // Check if auto-summarize is enabled
    chrome.storage.sync.get(['msgSettings'], function(result) {
      const settings = result.msgSettings || {};
      
      if (settings.autoSummarize && !window.msgAutoSummarized) {          // Auto suggest a summary (only once per page visit)
          window.msgAutoSummarized = true;
          setTimeout(() => {
            // Add user message directly to chatMessages array
            // This will prevent it from showing in the UI, but it will be sent to the API
            const summarizePrompt = 'Summarize this page with a quoted title, bold section headers, and bullet points with one sentence summaries. Keep the format compact with no unnecessary empty lines.';
            chatMessages.push({ role: 'user', content: summarizePrompt });
            
            // Send to Gemini with flag to indicate message is already added
            sendToGemini(summarizePrompt, true);
          }, 500); // Small delay to ensure context is loaded first
      }
    });
  }
}

// Helper function to get language instruction for system messages
function getLanguageInstruction() {
  if (!i18n) return '';
  
  const languageNames = {
    'en': 'English',
    'es': 'Spanish',
    'fr': 'French', 
    'de': 'German',
    'zh': 'Chinese',
    'it': 'Italian',
    'pt': 'Portuguese',
    'ja': 'Japanese',
    'ko': 'Korean',
    'ru': 'Russian'
  };
  
  const currentLang = i18n.currentLanguage || 'en';
  const languageName = languageNames[currentLang] || 'English';
  
  if (currentLang === 'en') {
    return ''; // No need to specify for English
  }
  
  return `\n\nIMPORTANT: Always respond in ${languageName} language.`;
}

// Create system message for the LLM
function createSystemMessage(pageInfo) {
  const baseMessage = `You are MSG, a helpful AI assistant for user to understand the content of a webpage.

PAGE INFO:
Title: "${pageInfo.title}"
URL: ${pageInfo.url}

CONTENT:
${pageInfo.content}

INSTRUCTIONS:
1. You have ALL the page content above - never ask for more.
2. Never ask for URLs or text - you already have everything.
3. Your task is to understand the content of the webpage and allow user to ask questions about it.
4. You may have access to web search (grounding) capabilities to answer questions that go beyond the content on the page. If you use this, cite your sources.
5. For summaries, follow this EXACT format structure in any language:

   "[Create a short, high-level title summarizing the overall content]"
   Then extract 2–4 major themes from the content. For each:
   **[Descriptive heading for this key theme or section]**
   - [One sentence summary for this key point]
   - [One sentence summary for this key point]

   Note: Format exactly as shown with quotes around the title, bold headers (using ** on both sides), and bullet points (-) for summaries. Keep the format compact with no unnecessary empty lines between sections.
   
   - Start with a quoted title: "Summarized Title"
   - Use bold section headers: **Sub Topic**
   - Include bullet points with one-sentence summaries under each section
   - Keep the format compact with no unnecessary empty lines between sections
   - Adapt the number of topics and bullet points based on the content's complexity
   - Avoid repeating the original article title in Heading1. Rephrase it to reflect the purpose, theme, or angle of the content.
   - Focus on core points, not side notes or navigation elements
   - Avoid table of contents, ads, or unrelated page elements
   - Use plain and helpful language for quick scanning
   - For articles/blogs: summarize main arguments and conclusions
   - For recipes: key ingredients and steps
   - For product pages: key features and selling points
7. Never start responses with phrases like "Here is a summary" or "Here's what the page is about".
8. Never answer a question that is unrelated to the theme of webpage, if asked reply with "Please only ask questions about the Website."
9. Maintain context between messages - if a user asks a follow-up question, understand it in the context of the previous messages and webpage content.
10. Always answer questions about the content you've analyzed, even if they seem like follow-up questions or references to previous messages.
11. If you use web search (grounding), always cite your sources. You can use footnote style [1] or inline mentions with URLs.`;

  return baseMessage + getLanguageInstruction();
}

// NEW: Create minimal system message for RAG-enhanced queries
function createMinimalSystemMessage(pageInfo) {
  const baseMessage = `You are MSG, a helpful AI assistant for analyzing webpage content.

PAGE INFO:
Title: "${pageInfo.title}"
URL: ${pageInfo.url}

INSTRUCTIONS:
1. You will receive relevant content chunks based on user queries via RAG search.
2. Use the provided RELEVANT CONTEXT to answer questions accurately.
3. If you use web search (grounding), cite your sources with [1], [2] format.
4. For summaries, use this format: "[Title]" then **Section Headers** with bullet points.
5. Stay focused on the webpage content and provided context.
6. Never ask for additional information - work with what's provided.`;

  return baseMessage + getLanguageInstruction();
}

// Add a message to the chat
function addMessage(role, content) {
  // Add to messages array
  chatMessages.push({ role, content });
  
  // Create message element
  const messageElement = document.createElement('div');
  messageElement.className = 'msg-message msg-' + role + '-message';
  
  // Format content if it's from the assistant
  if (role === 'assistant') {
    // Process formatting
    const formattedContent = formatMessageContent(content);
    messageElement.innerHTML = formattedContent;
    
    // Check if this is a grounded response
    const isGrounded = content.includes('[1]') || 
                       content.includes('[source:') || 
                       content.includes('Source:') ||
                       (content.includes('(http') && content.includes(')'));
    
    if (isGrounded) {
      messageElement.classList.add('msg-message-grounded');
      
      // Add grounding indicator
      const groundingIndicator = document.createElement('span');
      groundingIndicator.className = 'msg-grounding-indicator';
      groundingIndicator.textContent = i18n ? i18n.t('web_search_indicator') : 'Web Search';
      messageElement.querySelector('h1, h2, p, li')?.appendChild(groundingIndicator);
    }
  } else {
    // For user messages, just use text content (no formatting)
    messageElement.textContent = content;
  }
  
  // Add to container
  chatContainer.appendChild(messageElement);
  
  // Scroll to bottom
  chatContainer.scrollTop = chatContainer.scrollHeight;
}

// Add a message to the UI only (not added to chat history sent to API)
function addVisualMessage(role, content) {
  // Create message element
  const messageElement = document.createElement('div');
  messageElement.className = 'msg-message msg-' + role + '-message';
  
  // Format content if it's from the assistant
  if (role === 'assistant') {
    // Process formatting
    const formattedContent = formatMessageContent(content);
    messageElement.innerHTML = formattedContent;
    
    // Check if this is a grounded response
    const isGrounded = content.includes('[1]') || 
                       content.includes('[source:') || 
                       content.includes('Source:') ||
                       (content.includes('(http') && content.includes(')'));
    
    if (isGrounded) {
      messageElement.classList.add('msg-message-grounded');
      
      // Add grounding indicator
      const groundingIndicator = document.createElement('span');
      groundingIndicator.className = 'msg-grounding-indicator';
      groundingIndicator.textContent = i18n ? i18n.t('web_search_indicator') : 'Web Search';
      messageElement.querySelector('h1, h2, p, li')?.appendChild(groundingIndicator);
    }
  } else {
    // For user messages, just use text content (no formatting)
    messageElement.textContent = content;
  }
  
  // Add to container
  chatContainer.appendChild(messageElement);
  
  // Scroll to bottom
  chatContainer.scrollTop = chatContainer.scrollHeight;
}

// Helper function to format tables from markdown-like syntax
function formatTables(content) {
  const lines = content.split('\n');
  let result = [];
  let inTable = false;
  let tableRows = [];
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    // Check if this line looks like a table row (contains |)
    if (line.includes('|') && line.split('|').length >= 3) {
      if (!inTable) {
        inTable = true;
        tableRows = [];
      }
      tableRows.push(line);
    } else {
      // If we were in a table and this line doesn't look like a table row
      if (inTable) {
        // Process the collected table rows
        const tableHTML = processTableRows(tableRows);
        result.push(tableHTML);
        inTable = false;
        tableRows = [];
      }
      
      // Add the non-table line
      if (line.length > 0) {
        result.push(line);
      }
    }
  }
  
  // Handle any remaining table at the end
  if (inTable && tableRows.length > 0) {
    const tableHTML = processTableRows(tableRows);
    result.push(tableHTML);
  }
  
  return result.join('\n');
}

// Helper function to process table rows into HTML
function processTableRows(rows) {
  if (rows.length === 0) return '';
  
  let html = '<div class="msg-table-wrapper"><table class="msg-table">';
  let isFirstRow = true;
  
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i].trim();
    
    // Skip separator rows (like |---|---|)
    if (row.match(/^\|[\s\-\|:]+\|$/)) {
      continue;
    }
    
    // Split the row by | and clean up
    const cells = row.split('|')
      .map(cell => cell.trim())
      .filter((cell, index, array) => {
        // Remove empty cells at start and end (from leading/trailing |)
        return !(cell === '' && (index === 0 || index === array.length - 1));
      });
    
    if (cells.length === 0) continue;
    
    // Determine if this is a header row (first non-separator row)
    const isHeader = isFirstRow;
    const cellTag = isHeader ? 'th' : 'td';
    
    html += '<tr>';
    for (const cell of cells) {
      // Process any markdown formatting within the cell
      let processedCell = cell
        .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
        .replace(/\*([^*]+)\*/g, '<em>$1</em>')
        .replace(/`([^`]+)`/g, '<code>$1</code>');
      
      html += `<${cellTag}>${processedCell}</${cellTag}>`;
    }
    html += '</tr>';
    
    if (isFirstRow) {
      isFirstRow = false;
    }
  }
  
  html += '</table></div>';
  return html;
}

  // Format message content with basic Markdown-like syntax
function formatMessageContent(content) {
  if (!content) return '';
  
  // Basic sanitization - prevent XSS
  let safeContent = content
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
  
  // Check if this is a grounded response
  const isGrounded = safeContent.includes('[1]') || 
                    safeContent.includes('[source:') || 
                    safeContent.includes('(http') || 
                    safeContent.includes('(www.');
  
  // Format links - [text](url)
  safeContent = safeContent.replace(
    /\[([^\]]+)\]\(([^)]+)\)/g,
    '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>'
  );
  
  // Format source citations - [1] or [2], etc. (enhanced for grounding)
  safeContent = safeContent.replace(
    /\[(\d+(?:,\d+)*)\]/g, 
    '<sup class="msg-citation" data-citation="$1">[$1]</sup>'
  );
  
  // Format **Sources:** section specially
  safeContent = safeContent.replace(
    /\*\*Sources:\*\*([\s\S]*?)(?=\n\n|\n*$)/g,
    '<div class="msg-sources"><strong>Sources:</strong>$1</div>'
  );
  
  // Within Sources section, format as a clean inline list
  safeContent = safeContent.replace(
    /<div class="msg-sources">([\s\S]*?)<\/div>/g,
    function(match, content) {
      // Extract all source entries and format them as a clean inline list
      const sourceMatches = content.match(/\[(\d+)\]\s*([^:]+):\s*(https?:\/\/[^\s\n]+)/g);
      const fallbackMatches = content.match(/\[(\d+)\]\s*(https?:\/\/[^\s\n]+)/g);
      
      let formattedSources = '';
      
      if (sourceMatches) {
        formattedSources = sourceMatches.map(match => {
          const parts = match.match(/\[(\d+)\]\s*([^:]+):\s*(https?:\/\/[^\s\n]+)/);
          if (parts) {
            const [, num, title, url] = parts;
            return `<a href="${url.trim()}" target="_blank" rel="noopener noreferrer">[${num}] ${title.trim()}</a>`;
          }
          return '';
        }).filter(Boolean).join('  ');
      }
      
      if (fallbackMatches && !formattedSources) {
        formattedSources = fallbackMatches.map(match => {
          const parts = match.match(/\[(\d+)\]\s*(https?:\/\/[^\s\n]+)/);
          if (parts) {
            const [, num, url] = parts;
            const domain = url.replace(/https?:\/\//, '').replace(/\/.*/, '');
            return `<a href="${url.trim()}" target="_blank" rel="noopener noreferrer">[${num}] ${domain}</a>`;
          }
          return '';
        }).filter(Boolean).join('  ');
      }
      
      return `<div class="msg-sources"><strong>Sources:</strong> ${formattedSources}</div>`;
    }
  );
  
  // Format source URLs at the end of response
  safeContent = safeContent.replace(
    /\[(\d+)\]:\s*(https?:\/\/[^\s]+)/g,
    '<div class="msg-source-link">[<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>] $2</div>'
  );
  
  // Handle "Source: URL" format
  safeContent = safeContent.replace(
    /Source:\s*(https?:\/\/[^\s]+)/gi,
    '<div class="msg-source-link">Source: <a href="$1" target="_blank" rel="noopener noreferrer">$1</a></div>'
  );
  
  // Format bold - **text**
  safeContent = safeContent.replace(
    /\*\*([^*]+)\*\*/g,
    '<strong>$1</strong>'
  );
  
  // Format italic - *text*
  safeContent = safeContent.replace(
    /(?<!\*)\*([^*]+)\*(?!\*)/g,
    '<em>$1</em>'
  );
  
  // Format code blocks - ```code```
  safeContent = safeContent.replace(
    /```([^`]+)```/g,
    '<pre><code>$1</code></pre>'
  );
  
  // Format inline code - `code`
  safeContent = safeContent.replace(
    /`([^`]+)`/g,
    '<code>$1</code>'
  );
  
  // Format tables - Markdown table syntax
  safeContent = formatTables(safeContent);
  
  // Additional formatting for blockquotes
  safeContent = safeContent.replace(
    /^\s*>\s+(.+)$/gm,
    '<blockquote>$1</blockquote>'
  );
  
  // Handle the custom format structure - updated for new format
  
  // Handle quotes for title (treat any quoted text at beginning of content as title)
  safeContent = safeContent.replace(
    /^"([^"]+)"/m,
    '<h1>$1</h1>'
  );
  
  // Handle bold section headers (any text between ** and **)
  safeContent = safeContent.replace(
    /\*\*([^*]+)\*\*/g,
    '<h2>$1</h2>'
  );
  
  // Handle bullet points (lines starting with - or • or *)
  safeContent = safeContent.replace(
    /(?:^|\n)\s*[-•*]\s+(.+)(?:\n|$)/gm,
    '\n<li>$1</li>\n'
  );
  
  // Handle legacy format patterns just in case
  safeContent = safeContent.replace(
    /(?:")?Heading1-\s*([^"]+)(?:")?/g,
    '<h1>$1</h1>'
  );
  
  safeContent = safeContent.replace(
    /(?:")?Heading2-\s*([^"]+)(?:")?/g,
    '<h2>$1</h2>'
  );
  
  // Split content into lines for list processing
  const lines = safeContent.split('\n');
  let formattedLines = [];
  let inList = false;
  let listType = '';
  let consecutiveLiCount = 0;
  
  // First pass: Collect all <li> elements and wrap them with proper list tags
  let processedContent = [];
  let collectingList = false;
  let currentListItems = [];
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    if (line.match(/<li>.+<\/li>/)) {
      // Found a list item
      if (!collectingList) {
        collectingList = true;
      }
      currentListItems.push(line);
    } else {
      if (collectingList && currentListItems.length > 0) {
        // End of list, add the collected items wrapped in ul tags
        processedContent.push('<ul>' + currentListItems.join('') + '</ul>');
        currentListItems = [];
        collectingList = false;
      }
      // Add non-list content, but skip empty lines
      if (line.length > 0) {
        processedContent.push(line);
      }
    }
  }
  
  // Don't forget any remaining list items
  if (collectingList && currentListItems.length > 0) {
    processedContent.push('<ul>' + currentListItems.join('') + '</ul>');
  }
  
  // Now process the content with lists already properly formed
  safeContent = processedContent.join('\n');
  
  // Continue with regular formatting for other elements
  const processedLines = safeContent.split('\n').filter(line => line.trim() !== ''); // Remove empty lines
  for (let i = 0; i < processedLines.length; i++) {
    const line = processedLines[i].trim();
    
    // Check for ordered list item (1. Item)
    if (line.match(/^\d+\.\s+.+/)) {
      if (!inList || listType !== 'ol') {
        if (inList) {
          // Close previous list if it exists
          formattedLines.push(`</${listType}>`);
        }
        // Start a new ordered list
        formattedLines.push('<ol>');
        inList = true;
        listType = 'ol';
      }
      // Add list item, stripping the number and dot
      formattedLines.push(`<li>${line.replace(/^\d+\.\s+/, '')}</li>`);
    } 
    // Already formed lists with <ul> tags (from first pass)
    else if (line.match(/<ul>/) || line.match(/<\/ul>/) || line.match(/<li>.+<\/li>/)) {
      if (line.match(/<ul>/)) {
        formattedLines.push(line);
      } else if (line.match(/<\/ul>/)) {
        formattedLines.push(line);
      } else {
        formattedLines.push(line);
      }
    }
    // Check for unordered list item (- Item or • Item or * Item)
    else if (line.match(/^[-•*]\s+.+/)) {
      if (!inList || listType !== 'ul') {
        if (inList) {
          // Close previous list if it exists
          formattedLines.push(`</${listType}>`);
        }
        // Start a new unordered list
        formattedLines.push('<ul>');
        inList = true;
        listType = 'ul';
      }
      
      // Add list item, stripping the dash, bullet or asterisk
      formattedLines.push(`<li>${line.replace(/^[-•*]\s+/, '')}</li>`);
    } 
    // Check for headings (# Heading) or our custom <h1> and <h2> tags
    else if (line.match(/^#+\s+.+/) || line.match(/<h[12]>.+<\/h[12]>/)) {
      if (inList) {
        // Close any open list
        formattedLines.push(`</${listType}>`);
        inList = false;
      }
      
      if (line.match(/<h[12]>.+<\/h[12]>/)) {
        // It's already a heading tag, add it as is
        formattedLines.push(line);
      } else {
        // Convert markdown heading
        const level = Math.min(line.match(/^#+/)[0].length, 3); // Limit to h1-h3
        const headingText = line.replace(/^#+\s+/, '');
        formattedLines.push(`<h${level}>${headingText}</h${level}>`);
      }
    } 
    // Regular paragraph text
    else {
      if (inList) {
        // Close any open list when a non-list item is encountered
        formattedLines.push(`</${listType}>`);
        inList = false;
      }
      
      if (line.length > 0) {
        formattedLines.push(`<p>${line}</p>`);
      }
      // Removed the else condition that added <br> for empty lines
    }
  }
  
  // Close any open list at the end
  if (inList) {
    formattedLines.push(`</${listType}>`);
  }
  
  // Join all formatted lines and remove any potential empty HTML elements
  return formattedLines.join('')
    .replace(/<p>\s*<\/p>/g, '') // Remove empty paragraphs
    .replace(/<br><br>/g, '<br>') // Remove consecutive breaks
    .replace(/>\s+</g, '><'); // Remove whitespace between tags
}

// Show loading indicator
function showLoading() {
  const loadingElement = document.createElement('div');
  loadingElement.className = 'msg-loading';
  loadingElement.id = 'msg-loading-indicator';
  
  const dotsContainer = document.createElement('div');
  dotsContainer.className = 'msg-loading-dots';
  
  for (let i = 0; i < 3; i++) {
    const dot = document.createElement('div');
    dot.className = 'msg-loading-dot';
    dotsContainer.appendChild(dot);
  }
  
  loadingElement.appendChild(dotsContainer);
  chatContainer.appendChild(loadingElement);
  chatContainer.scrollTop = chatContainer.scrollHeight;
}

// Hide loading indicator
function hideLoading() {
  const loadingElement = document.getElementById('msg-loading-indicator');
  if (loadingElement) {
    loadingElement.remove();
  }
}

// Send message from input field
function sendMessage() {
  const message = inputField.value.trim();
  
  if (!message) return;
  
  // Add user message to chat - show the original user input
  addMessage('user', message);
  
  // Clear input field
  inputField.value = '';
  inputField.style.height = '48px'; // Reset to default height that matches new design
  
  // Send to Gemini without re-adding the message to chat
  sendToGemini(message, true); // Pass true to indicate message is already added
}

// Extract page content for context with performance optimizations
function extractPageContent() {
  // Check cache first
  const cached = window.msgContentCache.get(window.location.href, document.title);
  if (cached && cached.content) {
    console.log("MSG: Using cached content");
    return {
      url: window.location.href,
      title: document.title,
      content: cached.content.content || cached.content,
      html: cached.content.html || ''
    };
  }
  
  const startTime = performance.now();
  
  // Get page metadata
  const title = document.title;
  const url = window.location.href;
  const metaDescription = document.querySelector('meta[name="description"]')?.content || '';
  
  // Initialize content extraction
  let mainContent = '';
  let bestContent = '';
  let contentFound = false;
  
  // Force immediate content extraction - ensure we have the latest DOM content
  document.body.getBoundingClientRect(); // Force layout reflow to ensure content is up to date
  
  // STRATEGY 1: Try known content containers first (OPTIMIZED - early termination)
  const mainContentElements = [
    document.querySelector('main'),
    document.querySelector('article'),
    document.querySelector('#content'),
    document.querySelector('.content'),
    document.querySelector('.main'),
    document.querySelector('.post-content'),
    document.querySelector('.entry-content'),
    document.querySelector('.article-content'),
    document.querySelector('[role="main"]'),
    document.querySelector('[itemprop="mainContentOfPage"]')
  ].filter(Boolean);
  
  if (mainContentElements.length > 0) {
    // Use the largest content element by text length
    let largestElement = mainContentElements[0];
    let largestLength = largestElement.innerText.length;
    
    for (let i = 1; i < mainContentElements.length; i++) {
      const length = mainContentElements[i].innerText.length;
      if (length > largestLength) {
        largestElement = mainContentElements[i];
        largestLength = length;
      }
    }
    
    mainContent = largestElement.innerText;
    
    // Early termination if we have substantial content
    if (mainContent.length > 2000) {
      bestContent = mainContent;
      contentFound = true;
      console.log("MSG: Found substantial content via semantic containers, skipping other strategies");
    }
  }
  
  // STRATEGY 2: Use readable content extraction algorithm (only if needed)
  if (!contentFound) {
    // Clone the document to avoid modifying the original
    const documentClone = document.cloneNode(true);
    const bodyClone = documentClone.body;
    
    // Remove non-content elements
    const elementsToRemove = [
      'script', 'style', 'noscript', 'iframe', 'nav', 'header', 
      'footer', 'aside', 'form', '.nav', '.navigation', '.menu',
      '.header', '.footer', '.sidebar', '.ads', '.comments',
      '.social', '.share', '.related', '.recommended', 
      '[role="banner"]', '[role="navigation"]', '[role="complementary"]'
    ];
    
    elementsToRemove.forEach(selector => {
      try {
        bodyClone.querySelectorAll(selector).forEach(el => el.remove());
      } catch (e) {
        // Handle potential errors in selectors
      }
    });
    
    // Get text from remaining elements
    const fullText = bodyClone.innerText;
    
    // Check if this gives us better content
    if (fullText.length > mainContent.length * 1.2) {
      bestContent = fullText;
      contentFound = true;
    }
  }
  
  // STRATEGY 3: Get all paragraph text as a fallback (only if needed)
  if (!contentFound || bestContent.length < 500) {
    const paragraphs = Array.from(document.querySelectorAll('p'));
    
    // Sort paragraphs by length (descending) to prioritize content paragraphs
    paragraphs.sort((a, b) => b.innerText.length - a.innerText.length);
    
    // Take top paragraphs (likely content paragraphs rather than UI elements)
    const paragraphText = paragraphs.slice(0, 20).map(p => p.innerText.trim()).filter(t => t.length > 40).join('\n\n');
    
    if (paragraphText.length > bestContent.length) {
      bestContent = paragraphText;
    }
  }
  
  // STRATEGY 4: Extract headings for structure (always run - lightweight)
  const headings = Array.from(document.querySelectorAll('h1, h2, h3'))
    .map(h => `${h.tagName}: ${h.innerText.trim()}`)
    .join('\n');
  
  // Use fallback if still no good content
  if (bestContent.length < 200) {
    bestContent = document.body.innerText;
  }
  
  // Clean up the content
  bestContent = bestContent
    .replace(/\s+/g, ' ')               // Normalize whitespace
    .replace(/\n\s*\n\s*\n/g, '\n\n')   // Remove excessive line breaks
    .trim();
  
  // Add structural information for better context
  let enhancedContent = '';
  
  // Add meta description if available
  if (metaDescription) {
    enhancedContent += `PAGE DESCRIPTION: ${metaDescription}\n\n`;
  }
  
  // Add headings for structure
  if (headings) {
    enhancedContent += `PAGE STRUCTURE:\n${headings}\n\n`;
  }
  
  // Add the main content
  enhancedContent += `PAGE CONTENT:\n${bestContent}\n\n`;
  
  // Smart content length optimization based on query type and RAG availability
  let maxContentLength;
  
  // Check if this is for initial context preparation or a specific query
  const isInitialContext = !window.msgRAG || !window.msgRAG.isInitialized;
  
  if (isInitialContext) {
    // For initial context and summaries, use more content
    maxContentLength = 12000; // Reduced from 15000 but still comprehensive
  } else {
    // For RAG-enhanced queries, we can use less since RAG provides targeted chunks
    maxContentLength = 6000; // Moderate reduction for follow-up queries
  }
  
  if (enhancedContent.length > maxContentLength) {
    // Smart truncation: try to end at a sentence or paragraph boundary
    let truncatedContent = enhancedContent.substring(0, maxContentLength);
    
    // Find the last sentence boundary within the limit
    const lastSentence = truncatedContent.lastIndexOf('. ');
    const lastParagraph = truncatedContent.lastIndexOf('\n\n');
    
    // Use the boundary that's closer to the end but still reasonable
    const cutoff = Math.max(lastSentence, lastParagraph);
    if (cutoff > maxContentLength * 0.8) {
      truncatedContent = enhancedContent.substring(0, cutoff + (lastSentence > lastParagraph ? 2 : 2));
    }
    
    enhancedContent = truncatedContent + '... (content continues - RAG system will provide relevant chunks for specific queries)';
  }
  
  const extractionTime = performance.now() - startTime;
  
  // Log extraction information for debugging
  console.log("Content extraction stats:", {
    titleLength: title.length,
    metaDescriptionLength: metaDescription.length,
    mainContentLength: mainContent.length,
    finalContentLength: enhancedContent.length,
    extractionTime: Math.round(extractionTime),
    strategyUsed: contentFound ? 'semantic_containers' : 'full_extraction'
  });
  
  const result = {
    url: url,
    title: title,
    content: enhancedContent,
    html: '' // Removed HTML storage for performance
  };
  
  // Cache the result
  if (window.msgContentCache) {
    window.msgContentCache.set(url, title, result);
  }
  
  return result;
}

// Send message to Gemini API via background script
async function sendToGemini(userMessage, messageAlreadyAdded = false) {
  // Show loading indicator
  showLoading();
  
  // Use the preloaded page content that we stored when the panel was opened
  // If it doesn't exist for some reason, extract it now
  if (!window.msgContextPrepared || !window.msgPageInfo) {
    // This might be a direct call (like auto-summarize) before context is prepared
    const pageInfo = extractPageContent();
    window.msgPageInfo = pageInfo;
    
    // For fallback when RAG isn't ready, use minimal system message
    const contextMessage = createMinimalSystemMessage(pageInfo);

    // Add this context to chat messages if not already there
    if (!chatMessages.some(msg => msg.role === 'system')) {
      chatMessages.unshift({ role: 'system', content: contextMessage });
    }
    
    window.msgContextPrepared = true;
  }

  // If this is a direct call with a message parameter, add it to chat messages
  // But avoid duplicating the exact same message that was just added via addMessage
  if (userMessage && typeof userMessage === 'string' && !messageAlreadyAdded) {
    // We only add the message if it hasn't been added already
    // This avoids duplication when called from sendMessage()
    if (chatMessages.length === 0 || 
        chatMessages[chatMessages.length-1].role !== 'user' || 
        chatMessages[chatMessages.length-1].content !== userMessage) {
      addMessage('user', userMessage);
    }
  }
  
  // NEW: Use RAG for follow-up queries, but preserve full context for summaries
  let enhancedMessage = userMessage;
  let useRAG = false;
  
  // Determine if this query would benefit from RAG vs full context
  const isSummaryQuery = userMessage && (
    userMessage.toLowerCase().includes('summarize') ||
    userMessage.toLowerCase().includes('summary') ||
    userMessage.toLowerCase().includes('overview') ||
    userMessage.toLowerCase().includes('what is this about') ||
    userMessage.toLowerCase().includes('main points')
  );
  
  // Use RAG for specific questions, but not for summaries or when RAG isn't ready
  if (window.msgRAG && window.msgRAG.isInitialized && userMessage && !isSummaryQuery) {
    try {
      const relevantChunks = await window.msgRAG.searchRelevantChunks(userMessage, 3);
      
      if (relevantChunks.length > 0) {
        const contextText = relevantChunks
          .map((chunk, index) => `[${index + 1}] (Priority: ${chunk.priority || 0}, Similarity: ${chunk.similarity?.toFixed(3) || 'N/A'}) ${chunk.text}`)
          .join('\n\n');
        
        enhancedMessage = `[RAG] ${userMessage}\n\nRELEVANT CONTEXT:\n${contextText}`;
        useRAG = true;
        console.log(`MSG RAG: Enhanced query with ${relevantChunks.length} relevant chunks (avg similarity: ${(relevantChunks.reduce((sum, r) => sum + (r.similarity || 0), 0) / relevantChunks.length).toFixed(3)})`);
      } else {
        console.log('MSG RAG: No relevant chunks found, using full context');
      }
    } catch (error) {
      console.error('MSG RAG: Search failed, falling back to full context:', error);
    }
  } else if (userMessage) {
    if (isSummaryQuery) {
      console.log('MSG: Using full context for summary query');
    } else {
      console.log('MSG RAG: Not initialized, using full context');
    }
  }
  
  // For summary queries or when RAG isn't used, ensure we have full context
  if (!useRAG && isSummaryQuery) {
    // Update system message to use full context for summaries
    const systemMessageIndex = chatMessages.findIndex(msg => msg.role === 'system');
    if (systemMessageIndex !== -1 && chatMessages[systemMessageIndex].content.includes('You will receive relevant content chunks')) {
      // Replace minimal system message with full one for summary
      chatMessages[systemMessageIndex] = {
        role: 'system',
        content: createSystemMessage(window.msgPageInfo)
      };
    }
  }
  
  // Prepare messages for API - use enhanced message for the last user message
  const messages = [...chatMessages];
  if (enhancedMessage !== userMessage && messages.length > 0 && messages[messages.length - 1].role === 'user') {
    // Replace the last user message with the enhanced version for API call
    const enhancedMessages = [...messages];
    enhancedMessages[enhancedMessages.length - 1] = {
      ...enhancedMessages[enhancedMessages.length - 1],
      content: enhancedMessage
    };
    messages.splice(-1, 1, ...enhancedMessages.slice(-1));
  }
  
  // Send to background script
  chrome.runtime.sendMessage({
    action: 'fetchGeminiResponse',
    messages: messages,
    url: window.location.href
  }, function(response) {
    // Hide loading indicator
    hideLoading();
    
    if (response && response.success) {
      // Add assistant response to chat
      addMessage('assistant', response.response);
    } else {
      // Add error message
      const errorMsg = response?.error || (i18n ? i18n.t('api_key_error') : 'Error: Please check your API key in settings.');
      addMessage('assistant', errorMsg);
    }
  });
}

// Create and add floating icon
function addFloatingIcon() {
  if (window.msgIconAdded) return; // Prevent adding multiple icons
  
  const iconContainer = document.createElement('div');
  iconContainer.id = 'msg-floating-icon';
  
  // Default positioning - right side, centered vertically
  iconContainer.style.position = 'fixed';
  iconContainer.style.right = '10px';
  iconContainer.style.top = '50%';
  iconContainer.style.transform = 'translateY(-50%)';
  iconContainer.style.zIndex = '2147483646'; // Very high z-index
  
  // Add icon image
  try {
    const logoURL = chrome.runtime.getURL('images/msg_logo.png');
    const iconImg = document.createElement('img');
    iconImg.src = logoURL;
    iconImg.alt = 'MSG';
    iconImg.draggable = false; // Prevent image dragging
    iconImg.onerror = function() {
      console.error("Failed to load floating icon image");
      // Create a fallback colored div with text instead of image
      this.remove(); // Remove the broken image
      createFallbackIcon(iconContainer);
    };
    iconContainer.appendChild(iconImg);
    console.log("Using floating icon URL:", logoURL);
  } catch (e) {
    console.error("Error setting floating icon:", e);
    createFallbackIcon(iconContainer);
  }
  
  // Helper function to create a fallback icon
  function createFallbackIcon(container) {
    const fallbackIcon = document.createElement('div');
    fallbackIcon.className = 'msg-icon-fallback';
    fallbackIcon.textContent = 'M';
    container.appendChild(fallbackIcon);
  }
  
  // Add to document body first so we can set up events
  document.body.appendChild(iconContainer);
  
  // Create a separate drag handle overlay to avoid click/drag conflicts
  const dragHandle = document.createElement('div');
  dragHandle.className = 'msg-drag-handle';
  dragHandle.style.position = 'absolute';
  dragHandle.style.top = '0';
  dragHandle.style.left = '0';
  dragHandle.style.right = '0';
  dragHandle.style.bottom = '0';
  dragHandle.style.cursor = 'grab';
  dragHandle.style.zIndex = '2'; // Above the icon but below other elements
  iconContainer.appendChild(dragHandle);
  
  // Variables for drag state
  let isDragging = false;
  let startX, startY;
  let startLeft, startTop;
  let iconWidth, iconHeight;
  
  // Handle click (on the container, not the drag handle)
  iconContainer.addEventListener('click', function(e) {
    // Only toggle if we're not dragging
    if (!isDragging && !window.msgDragMoved) {
      toggleChatPanel();
    }
    window.msgDragMoved = false;
  });
  
  // Start drag (on the drag handle)
  dragHandle.addEventListener('mousedown', function(e) {
    // Only handle left mouse button
    if (e.button !== 0) return;
    
    // Prevent default to avoid text selection
    e.preventDefault();
    
    // Start dragging
    isDragging = true;
    window.msgDragMoved = false; // Reset drag detection
    
    // Get current dimensions
    const rect = iconContainer.getBoundingClientRect();
    iconWidth = rect.width;
    iconHeight = rect.height;
    
    // Record starting position (relative to viewport)
    startX = e.clientX;
    startY = e.clientY;
    startLeft = rect.left;
    startTop = rect.top;
    
    // Visual feedback
    dragHandle.style.cursor = 'grabbing';
    iconContainer.classList.add('dragging');
    
    // Remove any transition during dragging
    iconContainer.style.transition = 'none';
    
    // Add document-level event listeners for tracking the drag
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  });
  
  // Handle drag movement
  function onMouseMove(e) {
    if (!isDragging) return;
    
    // Calculate how far the mouse has moved
    const dx = e.clientX - startX;
    const dy = e.clientY - startY;
    
    // If moved more than 5px, consider it a drag not a click
    if (Math.abs(dx) > 5 || Math.abs(dy) > 5) {
      window.msgDragMoved = true;
    }
    
    // Calculate new position
    const newLeft = startLeft + dx;
    const newTop = startTop + dy;
    
    // Constrain to window boundaries
    const maxLeft = window.innerWidth - iconWidth;
    const maxTop = window.innerHeight - iconHeight;
    
    const constrainedLeft = Math.max(0, Math.min(newLeft, maxLeft));
    const constrainedTop = Math.max(0, Math.min(newTop, maxTop));
    
    // Update position with absolute values
    iconContainer.style.position = 'fixed';
    iconContainer.style.setProperty('top', constrainedTop + 'px', 'important');
    iconContainer.style.setProperty('left', constrainedLeft + 'px', 'important');
    iconContainer.style.right = 'auto'; // Clear right positioning during drag
    iconContainer.style.setProperty('transform', 'none', 'important'); // Remove centering transform with !important
  }
  
  // End drag
  function onMouseUp(e) {
    if (!isDragging) return;
    
    // Stop dragging
    isDragging = false;
    dragHandle.style.cursor = 'grab';
    iconContainer.classList.remove('dragging');
    
    // Get current position
    const rect = iconContainer.getBoundingClientRect();
    const currentLeft = rect.left;
    const currentTop = rect.top;
    
    // Add animation for snapping to sides (horizontal) while preserving vertical position
    iconContainer.style.transition = 'left 0.3s ease, right 0.3s ease';
    
    // Determine which side is closer (left or right)
    const distanceToLeft = currentLeft;
    const distanceToRight = window.innerWidth - (currentLeft + rect.width);
    
    // Snap to the closest edge horizontally but KEEP the vertical position
    if (distanceToLeft < distanceToRight) {
      // Stick to left
      iconContainer.style.left = '10px';
      iconContainer.style.right = 'auto';
      // Save to Chrome storage for global persistence across all websites
      chrome.storage.sync.set({ 'msgIconSide': 'left' }, function() {
        if (chrome.runtime.lastError) {
          console.error('MSG: Error saving icon side:', chrome.runtime.lastError);
        } else {
          console.log('MSG: Saved global icon side: left');
        }
      });
    } else {
      // Stick to right
      iconContainer.style.left = 'auto';
      iconContainer.style.right = '10px';
      // Save to Chrome storage for global persistence across all websites
      chrome.storage.sync.set({ 'msgIconSide': 'right' }, function() {
        if (chrome.runtime.lastError) {
          console.error('MSG: Error saving icon side:', chrome.runtime.lastError);
        } else {
          console.log('MSG: Saved global icon side: right');
        }
      });
    }
    
    // Important: Keep vertical position as is and ensure transform is removed
    iconContainer.style.setProperty('top', currentTop + 'px', 'important');
    iconContainer.style.setProperty('transform', 'none', 'important'); // Remove translateY(-50%) with !important
    
    // Save vertical position to Chrome storage for global persistence across all websites
    chrome.storage.sync.set({ 'msgIconPosition': currentTop.toString() }, function() {
      if (chrome.runtime.lastError) {
        console.error('MSG: Error saving icon position:', chrome.runtime.lastError);
      } else {
        console.log('MSG: Saved global icon position:', currentTop);
      }
    });
    
    // Clear transition after animation completes
    setTimeout(() => {
      iconContainer.style.transition = '';
    }, 300);
    
    // Remove document-level event listeners
    document.removeEventListener('mousemove', onMouseMove);
    document.removeEventListener('mouseup', onMouseUp);
  }
  
  // Restore saved position from Chrome storage (global across all websites)
  chrome.storage.sync.get(['msgIconPosition', 'msgIconSide'], function(result) {
    if (chrome.runtime.lastError) {
      console.error('MSG: Error retrieving icon position:', chrome.runtime.lastError);
      return;
    }
    
    try {
      const savedPosition = result.msgIconPosition;
      const savedSide = result.msgIconSide;
      
      if (savedPosition) {
        // Apply the saved vertical position
        iconContainer.style.setProperty('top', savedPosition + 'px', 'important');
        
        // Remove centering transform to ensure position is respected
        iconContainer.style.setProperty('transform', 'none', 'important');
        
        // Restore side preference
        if (savedSide === 'left') {
          iconContainer.style.left = '10px';
          iconContainer.style.right = 'auto';
        } else {
          // Default to right
          iconContainer.style.right = '10px';
          iconContainer.style.left = 'auto';
        }
        
        console.log('MSG: Restored global icon position:', savedPosition, 'side:', savedSide);
      } else {
        console.log('MSG: No saved icon position found, using default');
      }
    } catch (e) {
      console.error('MSG: Error restoring icon position:', e);
    }
  });
  
  // Mark as added to prevent duplicates
  window.msgIconAdded = true;
}

// Set up resize handler for the chat panel with proper cleanup
function setupResizeHandler() {
  // Get the resize handle or create it if it doesn't exist
  let resizeHandle = document.querySelector('.msg-resize-handle');
  if (!resizeHandle && chatPanel) {
    resizeHandle = document.createElement('div');
    resizeHandle.className = 'msg-resize-handle';
    chatPanel.appendChild(resizeHandle);
  }
  if (!resizeHandle || !chatPanel) return;
  
  // Clean up previous event listeners to avoid duplicates
  if (resizeHandle._cleanupFn) {
    resizeHandle._cleanupFn();
  }
  
  let isResizing = false;
  let startX, startWidth;
  
  // Initialize panel width explicitly
  if (!chatPanel.style.width || chatPanel.style.width === '') {
    // Get user's preferred panel width from settings
    chrome.storage.sync.get(['msgSettings'], function(result) {
      const settings = result.msgSettings || {};
      const panelWidthSetting = settings.panelWidth || 'medium';
      
      let width;
      switch(panelWidthSetting) {
        case 'narrow':
          width = '300px';
          break;
        case 'wide':
          width = '450px';
          break;
        case 'medium':
        default:
          width = '380px';
          break;
      }
      
      chatPanel.style.width = width;
    });
  }
  
  // Force disable transitions on width
  const originalTransition = chatPanel.style.transition;
  
  // Mouse down handler
  function onMouseDown(e) {
    // Only handle left mouse button
    if (e.button !== 0) return;
    
    // Prevent default browser behavior
    e.preventDefault();
    e.stopPropagation();
    
    // Start resizing
    isResizing = true;
    
    // Record starting position
    startX = e.clientX;
    
    // Explicitly set any inline styles that might be affecting width
    // First remove any existing width-related inline styles
    chatPanel.style.removeProperty('max-width');
    chatPanel.style.removeProperty('min-width');
    
    // Force layout calculation to ensure we get accurate width
    const rect = chatPanel.getBoundingClientRect();
    startWidth = rect.width;
    
    // Ensure the width is explicitly set as an inline style before resizing
    chatPanel.style.setProperty('width', startWidth + 'px', 'important');
    
    // Disable all transitions during resize
    const originalTransitionProp = chatPanel.style.getPropertyValue('transition');
    chatPanel.style.setProperty('transition', 'none', 'important');
    
    // Visual feedback
    resizeHandle.classList.add('active');
    
    // Create overlay to prevent text selection issues
    const overlay = document.createElement('div');
    overlay.className = 'msg-resize-overlay';
    overlay.style.position = 'fixed';
    overlay.style.top = '0';
    overlay.style.left = '0';
    overlay.style.right = '0';
    overlay.style.bottom = '0';
    overlay.style.zIndex = '2147483646';
    overlay.style.cursor = 'ew-resize';
    document.body.appendChild(overlay);
    
    console.log('MSG: Starting resize at', startX, 'with width', startWidth);
  }
  
  // Mouse move handler
  function onMouseMove(e) {
    if (!isResizing) return;
    
    // Calculate how far mouse has moved from start position
    const dx = e.clientX - startX;
    
    // Calculate new width based on mouse movement
    // Since panel is anchored to right side, moving mouse right (positive dx)
    // should make panel narrower (startWidth - dx)
    let newWidth = startWidth - dx;
    
    // Apply min/max constraints
    const minWidth = 300;
    const maxWidth = Math.min(window.innerWidth * 0.8, 800);
    newWidth = Math.max(minWidth, Math.min(newWidth, maxWidth));
    
    // Force panel to be resizable during this operation
    chatPanel.style.setProperty('width', newWidth + 'px', 'important');
    chatPanel.style.setProperty('max-width', newWidth + 'px', 'important');
    chatPanel.style.setProperty('min-width', Math.min(newWidth, 300) + 'px', 'important');
    
    // Force a reflow to apply the changes immediately
    void chatPanel.offsetWidth;
    
    console.log('MSG: Resizing to', newWidth, 'px');
  }
  
  // Mouse up handler
  function onMouseUp() {
    if (!isResizing) return;
    
    // Stop resizing
    isResizing = false;
    
    // Remove visual feedback
    resizeHandle.classList.remove('active');
    
    // Save the new width
    try {
      localStorage.setItem('msgChatPanelWidth', chatPanel.style.width);
      console.log('MSG: Saved new width:', chatPanel.style.width);
    } catch (e) {
      console.error('MSG: Error saving width:', e);
    }
    
    // Restore transition for other properties
    chatPanel.style.transition = originalTransition;
    
    // Remove overlay
    const overlay = document.querySelector('.msg-resize-overlay');
    if (overlay) {
      overlay.remove();
    }
  }
  
  // Use cleanup manager to properly manage event listeners
  window.msgCleanup.addEventListener(resizeHandle, 'mousedown', onMouseDown);
  window.msgCleanup.addEventListener(document, 'mousemove', onMouseMove);
  window.msgCleanup.addEventListener(document, 'mouseup', onMouseUp);
  
  // Store cleanup function for manual cleanup if needed
  resizeHandle._cleanupFn = function() {
    window.msgCleanup.removeEventListener(resizeHandle, 'mousedown');
    window.msgCleanup.removeEventListener(document, 'mousemove');
    window.msgCleanup.removeEventListener(document, 'mouseup');
  };
  
  // Register cleanup task
  window.msgCleanup.addCleanupTask(() => {
    if (resizeHandle._cleanupFn) {
      resizeHandle._cleanupFn();
    }
  });
}

// Always reset panel to default width on page refresh
function restorePanelSize(usePageRefresh = true) {
  if (!chatPanel) return;
  
  try {
    // Get user's preferred panel width from settings
    chrome.storage.sync.get(['msgSettings'], function(result) {
      const settings = result.msgSettings || {};
      const panelWidthSetting = settings.panelWidth || 'medium';
      
      let defaultWidth;
      switch(panelWidthSetting) {
        case 'narrow':
          defaultWidth = 300;
          break;
        case 'wide':
          defaultWidth = 450;
          break;
        case 'medium':
        default:
          defaultWidth = 380;
          break;
      }
    
      if (usePageRefresh) {
        // This is called on page refresh/load - reset to user's default and clear saved width
        try {
          localStorage.removeItem('msgChatPanelWidth');
        } catch (e) {
          // Handle localStorage errors silently
        }
        
        // Apply constraints (for consistency, though we're using default)
        const minWidth = 300;
        const maxWidth = window.innerWidth * 0.8;
        const width = Math.min(Math.max(defaultWidth, minWidth), maxWidth);
        
        // Save current transition state
        const originalTransition = chatPanel.style.getPropertyValue('transition');
        
        // Apply width directly with no transition - forced with !important
        chatPanel.style.setProperty('transition', 'none', 'important');
        chatPanel.style.setProperty('width', width + 'px', 'important');
        
        // For any site that might be applying conflicting styles:
        chatPanel.style.setProperty('max-width', '80vw', 'important');
        chatPanel.style.setProperty('min-width', '300px', 'important');
        
        // Force a reflow to apply the width immediately
        void chatPanel.offsetHeight;
        
        // Restore the original transition after a small delay
        setTimeout(() => {
          // Only restore the transform transition, not width
          chatPanel.style.setProperty('transition', 'transform 0.3s ease-in-out', 'important');
        }, 100);
        
        console.log("MSG: Reset panel width to user's default", width + "px");
      } else {
        // This is called when restoring from close/reopen - DON'T reset to default
        // The toggleChatPanel function will handle restoring the saved width if available
        console.log("MSG: Not resetting panel width - will use saved width if available");
      }
    });
  } catch (e) {
    console.error("MSG: Error in restorePanelSize:", e);
  }
}

// Apply appearance settings (dark mode and transparent background)
function applyAppearanceSettings() {
  chrome.storage.sync.get(['msgSettings'], function(result) {
    const settings = result.msgSettings || {};
    
    // Apply dark mode
    if (settings.darkMode) {
      document.body.classList.add('msg-dark-mode');
      if (chatPanel) {
        chatPanel.classList.add('msg-dark-mode');
      }
    } else {
      document.body.classList.remove('msg-dark-mode');
      if (chatPanel) {
        chatPanel.classList.remove('msg-dark-mode');
      }
    }
    
    // Apply transparent background
    if (settings.transparentBg) {
      if (chatPanel) {
        chatPanel.classList.add('msg-transparent-bg');
      }
    } else {
      if (chatPanel) {
        chatPanel.classList.remove('msg-transparent-bg');
      }
    }
  });
}

// Initialize everything
function initialize() {
  console.log("MSG: Initializing...");
  
  // Ensure content cache is initialized
  if (!window.msgContentCache) {
    window.msgContentCache = new ContentCache();
  }
  
  // Ensure cleanup manager is initialized
  if (!window.msgCleanup) {
    window.msgCleanup = new CleanupManager();
  }
  
  // Create chat panel if it doesn't exist
  if (!document.getElementById('msg-chat-panel')) {
    createChatPanel();
    
    // On initial page load, make sure we reset to default width
    setTimeout(() => {
      restorePanelSize(true); // Pass true to reset to default width on page load
    }, 200);
  }
  
  // Add floating icon if it doesn't exist and not already added
  if (!document.getElementById('msg-floating-icon') && !window.msgIconAdded) {
    addFloatingIcon();
  }
  
  // Set up keyboard event listener (remove any existing listeners first)
  document.removeEventListener('keydown', handleKeyDown);
  document.addEventListener('keydown', handleKeyDown);
  
  // Set up resize functionality
  setupResizeHandler();
  
  // Apply appearance settings
  applyAppearanceSettings();
}

// Initialize when DOM is fully loaded
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', function() {
    console.log("MSG: DOM Content Loaded");
    initialize();
  });
} else {
  console.log("MSG: Document already loaded");
  initialize();
}

// Ensure the extension works even after dynamic page loads (SPAs)
window.addEventListener('load', function() {
  console.log("MSG: Window loaded");
  if (!window.msgIconAdded) {
    initialize();
  }
});

// Reset variables when page is reloaded or closed with proper cleanup
window.addEventListener('beforeunload', function() {
  // Clean up all resources
  if (window.msgRAG) {
    window.msgRAG.cleanup();
  }
  
  if (window.msgCleanup) {
    window.msgCleanup.cleanup();
  }
  
  // Clear cache on page unload to prevent memory buildup
  if (window.msgContentCache) {
    window.msgContentCache.clear();
  }
  
  // Reset state variables so a new session starts fresh
  window.msgContextPrepared = false;
  window.msgAutoSummarized = false;
  window.msgPageInfo = null;
  
  // Clear any saved panel width to ensure it resets on refresh
  try {
    localStorage.removeItem('msgChatPanelWidth');
  } catch (e) {
    // Handle localStorage errors silently
  }
});

// NEW: Page visibility change handler for performance optimization
document.addEventListener('visibilitychange', function() {
  if (document.hidden) {
    // Page is hidden, pause expensive operations
    if (window.msgRAG && window.msgRAG.isInitializing) {
      console.log('MSG: Pausing RAG initialization due to page visibility change');
      window.msgRAG.cleanup();
    }
  } else {
    // Page is visible again, resume operations if needed
    if (window.msgPageInfo && !window.msgRAG.isInitialized) {
      console.log('MSG: Resuming RAG initialization');
      window.msgRAG.initializeRAG(window.msgPageInfo.content);
    }
  }
});

// NEW: Memory usage monitoring (development/debugging)
if (typeof window.performance !== 'undefined' && window.performance.memory) {
  const checkMemoryUsage = () => {
    const memory = window.performance.memory;
    const usedMB = Math.round(memory.usedJSHeapSize / 1048576);
    const limitMB = Math.round(memory.jsHeapSizeLimit / 1048576);
    
    console.log(`MSG Memory: ${usedMB}MB / ${limitMB}MB (${Math.round(usedMB/limitMB*100)}%)`);
    
    // If memory usage is high, clear cache
    if (usedMB > limitMB * 0.8) {
      console.warn('MSG: High memory usage detected, clearing cache');
      if (window.msgContentCache) {
        window.msgContentCache.clear();
      }
    }
  };
  
  // Check memory usage every 2 minutes
  window.msgCleanup.setInterval(checkMemoryUsage, 120000);
}
