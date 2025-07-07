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
  
  // Restore saved panel width if available
  setTimeout(() => {
    // Small delay to ensure the panel is fully rendered
    restorePanelSize();
    
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
    
    // Restore saved panel width if available
    restorePanelSize();
    
    // Extract page content when panel is opened the first time
    if (!window.msgPageInfo) {
      console.log("Extracting page content...");
      const pageInfo = extractPageContent();
      console.log("Content extraction complete. Length:", pageInfo.content.length);
      
      // Store page content in a global variable for easy access
      window.msgPageInfo = pageInfo;
      
      // Log content length for debugging
      console.log("Extracted content length:", pageInfo.content.length);
      console.log("Content sample:", pageInfo.content.substring(0, 200) + "...");
    }
    
    // Add a hidden system message to prepare the context (only first time)
    if (!window.msgContextPrepared) {
      // Prepare system message with page context
      const contextMessage = createSystemMessage(window.msgPageInfo);
      
      // Reset chat history and add the context
      chatMessages = []; // Reset chat history for fresh context
      chatMessages.push({ role: 'system', content: contextMessage });
      window.msgContextPrepared = true;
      
      // Add welcome message (visual only, not sent to API)
      addVisualMessage('assistant', 'Hi there! I\'m MSG, your website assistant. I\'ve fully analyzed this page and can help you understand its content.');
      
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
  
  // Format source citations - [1] or [2], etc.
  safeContent = safeContent.replace(
    /\[(\d+)\]/g, 
    '<sup class="msg-citation">[$1]</sup>'
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
  enhancedContent += `PAGE HTML STRUCTURE (for reference):\n${rawHtml.substring(0, 10000)}`;
  
  // Set final content to enhanced version
  content = enhancedContent;
  
  // Limit the content length (optimized for token efficiency)
  const maxContentLength = 10000; // Reduced for better token efficiency
  if (content.length > maxContentLength) {
    content = content.substring(0, maxContentLength) + '... (truncated)';
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
function sendToGemini(userMessage, messageAlreadyAdded = false) {
  // Show loading indicator
  showLoading();
  
  // Use the preloaded page content that we stored when the panel was opened
  // If it doesn't exist for some reason, extract it now
  if (!window.msgContextPrepared || !window.msgPageInfo) {
    // This might be a direct call (like auto-summarize) before context is prepared
    const pageInfo = extractPageContent();
    window.msgPageInfo = pageInfo;
    
    // Prepare system message with page context if needed
    const contextMessage = `You are MSG, a helpful AI assistant for webpage content.

PAGE INFO:
Title: "${pageInfo.title}"
URL: ${pageInfo.url}

CONTENT:
${pageInfo.content}

INSTRUCTIONS:
1. You have ALL the page content above - never ask for more.
2. Never ask for URLs or text - you already have everything.
3. You may have access to web search (grounding) capabilities to answer questions that go beyond the content on the page. If you use this, cite your sources.
4. For summarize requests, follow this EXACT format structure:

   "[Create a short, high-level title summarizing the overall content]"
   
   Then extract major themes from the content. For each:
   
   **[Descriptive heading for this key theme or section]**
   - [One sentence summary for this key point] add more if necessary


   Note: Format exactly as shown with quotes around the title, bold headers (using ** on both sides), and bullet points (-) for summaries.
   
   - Avoid repeating the original article title in Heading1. Rephrase it to reflect the purpose, theme, or angle of the content.
   - Focus on core points, not side notes or navigation elements
   - Avoid table of contents, ads, or unrelated page elements
   - Use plain and helpful language for quick scanning
5. Format your responses in this EXACT format:
   - Start with a quoted title: "Summarized Title"
   - Use bold section headers: **Sub Topic**
   - Include bullet points with one-sentence summaries under each section
   - Keep the format compact with no unnecessary empty lines between sections
   - Adapt the number of topics and bullet points based on the content's complexity
6. Never start responses with phrases like "Here is a summary" or "Here's what the page is about".
7. Format with markdown: **bold**, *italic*, \`code\`, bullet lists (•), numbered lists, #headings.
8. Maintain context between messages - if a user asks a follow-up question, understand it in the context of the previous messages and webpage content.
9. Always answer questions about the content you've analyzed, even if they seem like follow-up questions or references to previous messages.
10. If you use web search (grounding), always cite your sources. You can use footnote style [1] or inline mentions with URLs.`;

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
  
  // Prepare messages for API - always include all messages
  const messages = [...chatMessages];
  
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
      const errorMsg = response?.error || 'Error: Please check your API key in settings.';
      addMessage('assistant', errorMsg);
    }
  });
}

// Create and add floating icon
function addFloatingIcon() {
  if (window.msgIconAdded) return; // Prevent adding multiple icons
  
  const iconContainer = document.createElement('div');
  iconContainer.id = 'msg-floating-icon';
  
  // Add icon image
  try {
    const logoURL = chrome.runtime.getURL('images/msg_logo.png');
    const iconImg = document.createElement('img');
    iconImg.src = logoURL;
    iconImg.alt = 'MSG';
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
  
  // Add click handler to toggle chat panel
  iconContainer.addEventListener('click', function(e) {
    // If shift key is pressed while clicking, don't toggle panel
    // This allows the user to drag the icon without opening the panel
    if (!e.shiftKey) {
      toggleChatPanel();
    }
  });
  
  // Make the icon draggable vertically
  let isDragging = false;
  let startY = 0;
  let startTop = 0;
  
  iconContainer.addEventListener('mousedown', function(e) {
    // Only enable dragging when shift key is pressed
    if (e.shiftKey) {
      isDragging = true;
      startY = e.clientY;
      const computedStyle = window.getComputedStyle(this);
      startTop = parseInt(computedStyle.top) || window.innerHeight / 2; // Default to middle if not set
      this.classList.add('dragging');
      e.preventDefault(); // Prevent text selection while dragging
    }
  });
  
  // Add the icon container to the document body
  document.body.appendChild(iconContainer);
  
  document.addEventListener('mousemove', function(e) {
    if (isDragging) {
      const newTop = startTop + (e.clientY - startY);
      // Constrain to window boundaries
      const maxTop = window.innerHeight - 40; // Icon height
      const constrainedTop = Math.max(20, Math.min(newTop, maxTop));
      iconContainer.style.top = constrainedTop + 'px';
      
      // Store position in localStorage
      try {
        localStorage.setItem('msgIconPosition', constrainedTop);
      } catch (e) {
        // Handle localStorage errors silently
      }
    }
  });
  
  document.addEventListener('mouseup', function() {
    if (isDragging) {
      isDragging = false;
      iconContainer.classList.remove('dragging');
    }
  });
  
  // Restore saved position if available
  try {
    const savedPosition = localStorage.getItem('msgIconPosition');
    if (savedPosition) {
      iconContainer.style.top = parseInt(savedPosition) + 'px';
      // When using a specific top position, remove the default transform
      iconContainer.style.transform = 'none';
    }
  } catch (e) {
    // Handle localStorage errors silently
  }
  
  // Append to document body only once
  document.body.appendChild(iconContainer);
  
  // Mark icon as added
  window.msgIconAdded = true;
}

// Set up resize handler for the chat panel
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
    chatPanel.style.width = '380px';
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
  
  // Add event listeners
  resizeHandle.addEventListener('mousedown', onMouseDown);
  document.addEventListener('mousemove', onMouseMove);
  document.addEventListener('mouseup', onMouseUp);
  
  // Store cleanup function for later
  resizeHandle._cleanupFn = function() {
    resizeHandle.removeEventListener('mousedown', onMouseDown);
    document.removeEventListener('mousemove', onMouseMove);
    document.removeEventListener('mouseup', onMouseUp);
  };
}

// Always reset panel to default width on page refresh
function restorePanelSize() {
  if (!chatPanel) return;
  
  try {
    // Always use default width (380px) regardless of saved value
    const defaultWidth = 380;
    
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
    
    console.log("MSG: Reset panel width to default", width + "px");
  } catch (e) {
    console.error("MSG: Error resetting panel size:", e);
  }
}

// Initialize everything
function initialize() {
  console.log("MSG: Initializing...");
  
  // Create chat panel if it doesn't exist
  if (!document.getElementById('msg-chat-panel')) {
    createChatPanel();
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

// Reset variables when page is reloaded or closed
window.addEventListener('beforeunload', function() {
  // Reset state variables so a new session starts fresh
  window.msgContextPrepared = false;
  window.msgAutoSummarized = false;
  window.msgPageInfo = null;
});
