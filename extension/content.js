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

// NEW: RAG System for temporary webpage database
class WebpageRAG {
  constructor() {
    this.chunks = [];
    this.embeddings = [];
    this.isInitialized = false;
    this.isInitializing = false;
  }

  async initializeRAG(pageContent) {
    if (this.isInitializing) return;
    this.isInitializing = true;
    
    console.log("MSG RAG: Starting initialization...");
    
    try {
      // Split content into semantic chunks
      this.chunks = this.createSemanticChunks(pageContent);
      console.log(`MSG RAG: Created ${this.chunks.length} content chunks`);
      
      // Create embeddings for each chunk
      const chunkTexts = this.chunks.map(chunk => chunk.text);
      const embeddings = await this.getBatchEmbeddings(chunkTexts);
      this.embeddings = embeddings;
      
      this.isInitialized = true;
      console.log(`MSG RAG: Initialization complete with ${this.chunks.length} chunks`);
    } catch (error) {
      console.error('MSG RAG: Initialization failed:', error);
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
                length: currentChunk.length
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
            length: currentChunk.length
          });
        }
      } else {
        chunks.push({
          text: section.trim(),
          type: 'section',
          length: section.length
        });
      }
    });
    
    // Ensure we don't have too many chunks (limit for free tier)
    return chunks.slice(0, 15); // Limit to 15 chunks for efficiency
  }

  async getBatchEmbeddings(texts) {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage({
        action: 'getBatchEmbeddings',
        texts: texts
      }, (response) => {
        if (response && response.success) {
          resolve(response.embeddings);
        } else {
          console.warn('Failed to get batch embeddings:', response?.error);
          resolve(texts.map(() => new Array(768).fill(0))); // Fallback
        }
      });
    });
  }

  async getTextEmbedding(text) {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage({
        action: 'getEmbedding',
        text: text.substring(0, 500) // Limit for embedding
      }, (response) => {
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
      const queryEmbedding = await this.getTextEmbedding(query);
      
      // Calculate cosine similarity with all chunks
      const similarities = this.embeddings.map((embedding, index) => ({
        index,
        similarity: this.cosineSimilarity(queryEmbedding, embedding),
        chunk: this.chunks[index]
      }));
      
      // Return top K most similar chunks
      const results = similarities
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, topK)
        .filter(item => item.similarity > 0.1) // Minimum similarity threshold
        .map(item => item.chunk);
      
      console.log(`MSG RAG: Found ${results.length} relevant chunks for query`);
      return results;
    } catch (error) {
      console.error('MSG RAG: Search failed:', error);
      return [];
    }
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

// Initialize everything
function initialize() {
  // Create chat panel if it doesn't exist
  if (!document.getElementById('msg-chat-panel')) {
    createChatPanel();
  }
  
  // Add floating icon if it doesn't exist
  if (!document.getElementById('msg-floating-icon')) {
    addFloatingIcon();
  }
  
  // Set up keyboard event listener
  document.addEventListener('keydown', handleKeyDown);
  
  // Set up resize functionality
  setupResizeHandler();
}

// Handle keyboard events
function handleKeyDown(event) {
  // Check for '/' key (slash)
  if (event.key === '/') {
    const currentTime = Date.now();
    
    // Check if it's a double press
    if (currentTime - lastSlashPressTime < DOUBLE_PRESS_THRESHOLD) {
      // Toggle chat panel
      toggleChatPanel();
      event.preventDefault();
    }
    
    lastSlashPressTime = currentTime;
  }
}

// Create the chat panel
function createChatPanel() {
  // Create main container
  chatPanel = document.createElement('div');
  chatPanel.id = 'msg-chat-panel';
  
  // Explicitly set initial width and style
  chatPanel.style.setProperty('width', '380px', 'important');
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
    title.appendChild(document.createTextNode(' MSG Chat'));
    console.log("Using logo URL:", logoURL);
  } catch (e) {
    console.error("Error setting logo:", e);
    // Create a fallback colored circle with M
    const fallbackLogo = document.createElement('span');
    fallbackLogo.className = 'msg-logo-fallback';
    fallbackLogo.textContent = 'M';
    title.appendChild(fallbackLogo);
    title.appendChild(document.createTextNode(' MSG Chat'));
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
  inputField.placeholder = 'Ask anything about this page...';
  inputField.addEventListener('keydown', function(event) {
    // Submit on Enter (without shift)
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      sendMessage();
    }
    
    // Auto-resize textarea with minimum height matching the button
    setTimeout(() => {
      inputField.style.height = '36px'; // Reset to default height (matches button)
      const newHeight = Math.max(36, Math.min(inputField.scrollHeight, 120));
      inputField.style.height = newHeight + 'px';
    }, 0);
  });
  
  // Also handle input event for dynamic resizing while typing
  inputField.addEventListener('input', function() {
    inputField.style.height = '36px'; // Reset to default height
    const newHeight = Math.max(36, Math.min(inputField.scrollHeight, 120));
    inputField.style.height = newHeight + 'px';
  });
  
  sendButton = document.createElement('button');
  sendButton.className = 'msg-send-btn';
  sendButton.innerHTML = '→';
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
      addVisualMessage('assistant', 'Hi there! I\'m MSG, your website assistant. I\'ve analyzed this page and can help you understand its content with intelligent search.');
      
      // Check if grounding is enabled and add a status message
      chrome.storage.sync.get(['msgSettings'], function(result) {
        const settings = result.msgSettings || {};
        if (settings.enableGrounding) {
          const groundingMode = settings.groundingMode || 'auto';
          let groundingMsg = '';
          
          switch(groundingMode) {
            case 'always':
              groundingMsg = 'Web search is enabled for all queries.';
              break;
            case 'auto':
              groundingMsg = 'Web search will be used automatically when needed.';
              break;
            case 'explicit':
              groundingMsg = 'Web search is available when you explicitly ask for it (e.g., "search for...")';
              break;
          }
          
          // Update status to show context is loaded and grounding status
          addVisualMessage('assistant', `Content loaded (${Math.round(window.msgPageInfo.content.length / 1000)}KB). ${groundingMsg} Type "summarize" for a quick overview.`);
        } else {
          // Update status to show context is loaded (visual only, not sent to API)
          addVisualMessage('assistant', `Content loaded (${Math.round(window.msgPageInfo.content.length / 1000)}KB). Type "summarize" for a quick overview.`);
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

// Create system message for the LLM
function createSystemMessage(pageInfo) {
  return `You are MSG, a helpful AI assistant for user to understand the content of a webpage.

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

   Note: Format exactly as shown with quotes around the title, bold headers (using ** on both sides), and bullet points (-) for summaries. Keep the format compact with no unnecessary empty lines.
   
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
}

// NEW: Create minimal system message for RAG-enhanced queries
function createMinimalSystemMessage(pageInfo) {
  return `You are MSG, a helpful AI assistant for analyzing webpage content.

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
      groundingIndicator.textContent = 'Web Search';
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
      groundingIndicator.textContent = 'Web Search';
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
  inputField.style.height = '36px'; // Reset to default height that matches button
  
  // Send to Gemini without re-adding the message to chat
  sendToGemini(message, true); // Pass true to indicate message is already added
}

// Extract page content for context
function extractPageContent() {
  // Get page metadata
  const title = document.title;
  const url = window.location.href;
  const metaDescription = document.querySelector('meta[name="description"]')?.content || '';
  
  // Get raw HTML (stripped of script tags for security)
  const htmlClone = document.documentElement.cloneNode(true);
  // Remove scripts, styles, and other non-content elements for security and size
  const nonContentTags = htmlClone.querySelectorAll('script, style, link[rel="stylesheet"], iframe');
  nonContentTags.forEach(tag => tag.remove());
  const rawHtml = htmlClone.outerHTML;
  
  // Initialize content extraction
  let mainContent = '';
  let fullText = '';
  
  // Force immediate content extraction - ensure we have the latest DOM content
  document.body.getBoundingClientRect(); // Force layout reflow to ensure content is up to date
  
  // STRATEGY 1: Try known content containers first
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
  }
  
  // STRATEGY 2: Use readable content extraction algorithm
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
  fullText = bodyClone.innerText;
  
  // STRATEGY 3: Get all paragraph text as a fallback
  let paragraphText = '';
  const paragraphs = Array.from(document.querySelectorAll('p'));
  
  // Sort paragraphs by length (descending) to prioritize content paragraphs
  paragraphs.sort((a, b) => b.innerText.length - a.innerText.length);
  
  // Take top paragraphs (likely content paragraphs rather than UI elements)
  paragraphText = paragraphs.slice(0, 20).map(p => p.innerText.trim()).filter(t => t.length > 40).join('\n\n');
  
  // STRATEGY 4: Extract headings for structure
  const headings = Array.from(document.querySelectorAll('h1, h2, h3'))
    .map(h => `${h.tagName}: ${h.innerText.trim()}`)
    .join('\n');
  
  // Choose the best content source (longest meaningful text)
  let content = mainContent;
  
  if (fullText.length > mainContent.length * 1.2) {
    content = fullText;
  }
  
  if (content.length < 500 && paragraphText.length > content.length) {
    content = paragraphText;
  }
  
  // If we still don't have good content, use the full page text
  if (content.length < 200) {
    content = document.body.innerText;
  }
  
  // Clean up the content
  content = content
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
  enhancedContent += `PAGE CONTENT:\n${content}\n\n`;
  
  // Add the raw HTML (with scripts/styles removed) for structure analysis
  // This ensures the model has access to the full HTML structure if needed
  enhancedContent += `PAGE HTML STRUCTURE (for reference):\n${rawHtml.substring(0, 15000)}`;
  
  // Set final content to enhanced version
  content = enhancedContent;
  
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
  
  if (content.length > maxContentLength) {
    // Smart truncation: try to end at a sentence or paragraph boundary
    let truncatedContent = content.substring(0, maxContentLength);
    
    // Find the last sentence boundary within the limit
    const lastSentence = truncatedContent.lastIndexOf('. ');
    const lastParagraph = truncatedContent.lastIndexOf('\n\n');
    
    // Use the boundary that's closer to the end but still reasonable
    const cutoff = Math.max(lastSentence, lastParagraph);
    if (cutoff > maxContentLength * 0.8) {
      truncatedContent = content.substring(0, cutoff + (lastSentence > lastParagraph ? 2 : 2));
    }
    
    content = truncatedContent + '... (content continues - RAG system will provide relevant chunks for specific queries)';
  }
  
  // Log extraction information for debugging
  console.log("Content extraction stats:", {
    titleLength: title.length,
    metaDescriptionLength: metaDescription.length,
    mainContentLength: mainContent.length,
    fullTextLength: fullText.length,
    paragraphTextLength: paragraphText.length,
    finalContentLength: content.length,
    htmlLength: rawHtml.length
  });
  
  return {
    url: url,
    title: title,
    content: content,
    // Store only essential HTML structure for token efficiency
    html: rawHtml.substring(0, 2000)
  };
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
          .map((chunk, index) => `[${index + 1}] ${chunk.text}`)
          .join('\n\n');
        
        enhancedMessage = `[RAG] ${userMessage}\n\nRELEVANT CONTEXT:\n${contextText}`;
        useRAG = true;
        console.log(`MSG RAG: Enhanced query with ${relevantChunks.length} relevant chunks`);
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
  
  // For summary 