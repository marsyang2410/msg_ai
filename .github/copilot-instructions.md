# Copilot Instructions for MSG Project

## Overview
This repository enables chat interactions with any website, using primarily JavaScript, CSS, and HTML.

## General Coding Guidelines
- **JavaScript:** Use ES6+ syntax. Prefer modular code (use `import`/`export`). Write clear comments for all exported functions.
- **CSS:** Use descriptive class names and group related styles together. Consider using CSS variables for theme consistency.
- **HTML:** Keep markup semantic and accessible. Use ARIA attributes where appropriate.

## Copilot Usage Instructions
### Code Suggestions
- Prioritize code completion for UI components, chat logic, and API integrations.
- Suggest reusable functions and components.
- Prefer code that is compatible with major browsers (Chrome, Firefox, Safari, Edge).

### File Organization
- all files are - ./extension/

### Naming Conventions
- Use camelCase for variables and functions.
- Use PascalCase for component names.
- CSS classes should be kebab-case.

### Documentation and Comments
- Every function and component must have a JSDoc-style comment.
- Major logic blocks should include brief inline comments.

### Commit and PR Guidance
- Generate commit messages in the format: `<type>: <short description>`.
  - Types: `feat`, `fix`, `docs`, `refactor`, `test`, `style`, `chore`
- When creating PRs, automatically include a summary of changes and reference related issues.

## Example Prompts for Copilot
- "Generate a chat bubble React component with customizable styles."
- "Create a utility function for sanitizing user input."
- "Suggest CSS for a responsive chat window."

## Exclusions
- Do not suggest code for third-party integrations unless explicitly prompted.
- Avoid generating code that stores sensitive data in plain text.

---

**For efficient code management and generation, follow these instructions when using Copilot or requesting code.**