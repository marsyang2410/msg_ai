# MSG: Chat with Any Websites

<img src="extension/images/msg_logo.png" alt="MSG Logo" width="120">

> Knowledge is easier to consume with MSG — just like food.

MSG is a Chrome extension that helps you chat with any webpage using the power of Gemini AI. Just double press the "/" key to open a chat panel, and start asking questions about the content. No need to copy-paste or share URLs - MSG automatically extracts and processes the content for you.

## ✨ Features

- **🔄 Instant Access**: Double press `/` to summon the MSG Chat panel
- **🔘 Floating Icon**: Convenient access via a draggable icon that sticks to the side of your window
- **🍲 Smart Content Extraction**: Automatically extracts and processes the page content
- **🌟 Minimal UI**: Clean, flavor-inspired sidebar with soft animations
- **🤖 Gemini Integration**: Powered by Google's Gemini AI (requires your API key)
- **🔐 Privacy First**: Your API key stays on your device, no data sent to our servers
- **💬 Formatted Responses**: Enjoy well-structured responses with formatting, lists, and more
- **📏 Adjustable Panel**: Resize the chat panel to your preferred width
- **🌓 Dark Mode**: Automatically adapts to your system's dark/light preference

## 📋 Installation

1. Clone this repository or download the ZIP file
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode" (toggle in the top-right corner)
4. Click "Load unpacked" and select the `extension` folder from this project
5. The MSG extension icon should now appear in your Chrome toolbar

## 🔧 Setup

1. Click on the MSG icon in your toolbar
2. Enter your Gemini API key ([Get one here](https://makersuite.google.com/app/apikey))
3. Optional: Sign in with your Google account to save preferences
4. Configure appearance and behavior settings as desired
5. Start browsing and press `/` twice on any webpage to open MSG

## 💬 Usage

1. Navigate to any webpage you want to chat about
2. Double press the `/` key to open the MSG chat panel or click the floating icon
3. Ask questions about the content, request summaries, or any other queries
4. Type "summarize" to get a quick overview of the page
5. Double press `/` again, click the close button, or click the floating icon to dismiss the panel
6. You can reposition the floating icon by holding Shift while dragging it vertically

## 🛠️ Development

The extension is built with vanilla JavaScript, HTML, and CSS to keep it lightweight and fast.

### Project Structure

- `/extension`: Main extension folder
  - `manifest.json`: Extension configuration
  - `background.js`: Background service worker
  - `content.js`: Content script for webpage interaction
  - `content.css`: Styling for the chat panel
  - `popup.html/js`: Extension popup UI
  - `options.html/js`: Settings page
  - `/images`: Icons and graphics

### Building and Testing

No build step required! Simply load the `/extension` folder as an unpacked extension in Chrome's developer mode.

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Powered by [Google Gemini API](https://ai.google.dev/)
- Inspired by tools like Immersive Translate and ChatGPT