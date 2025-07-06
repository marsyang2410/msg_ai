# MSG: Chat with Any Websites

A Chrome extension that allows users to instantly chat with the content of any webpage.

## Overview

MSG is a beautifully minimalist Chrome extension that helps users summarize and ask questions about any website, making knowledge easier to consume — just like flavor-enhanced food.

## Features

- **🔄 MSG Quick Access**: Double press `/` to summon the MSG Chat panel
- **🍲 Context Extraction**: Extracts main content of page for smart replies
- **🌟 Minimal Overlay UI**: Clean, flavor-inspired sidebar with soft animations
- **🤖 Gemini Brain**: Uses Gemini API (user-provided key)
- **🔐 Your Key, Your Rules**: API key stored securely, no 3rd-party server
- **💬 Conversational Memory**: Scrollable message history during chat session
- **🔓 Google Account Login**: Optional login with Google account

## Installation

1. Download the extension files
2. Go to `chrome://extensions/` in your Chrome browser
3. Enable "Developer mode" (toggle in top right)
4. Click "Load unpacked" and select the extension directory
5. The MSG icon will appear in your browser toolbar

## Getting Started

1. Click the MSG icon in your Chrome toolbar
2. Enter your Gemini API key (get one from [Google AI Studio](https://ai.google.dev/))
3. Optionally, sign in with your Google account
4. Browse to any website
5. Press `/` twice quickly to open the MSG panel
6. Start chatting about the webpage content!

## Usage Tips

- Ask for summaries: "Give me a quick summary of this page"
- Extract key points: "What are the main points of this article?"
- Get explanations: "Explain this concept in simpler terms"
- Find specifics: "What does this page say about [topic]?"

## Privacy & Security

- Your Gemini API key is stored locally in your browser
- No data is sent to any servers except Google's Gemini API
- Page content is processed only when you interact with the extension

## Development

### Project Structure
- `manifest.json`: Extension configuration
- `popup.html/js/css`: Extension popup UI
- `options.html/js`: Settings page
- `content.js/css`: Content script for webpage integration
- `background.js`: Background service worker

### Building & Testing
1. Make changes to the code
2. Reload the extension in Chrome (`chrome://extensions/`)
3. Test the functionality on various websites

## License

This project is licensed under the terms specified in the LICENSE file.
