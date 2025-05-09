# AI Chatbox

A modern web-based chat interface that supports both Gemini and ChatGPT APIs.

## Features

- Support for both Gemini and ChatGPT APIs
- Modern and responsive UI
- Secure API key storage in browser's local storage
- Real-time chat interface
- Easy switching between different AI models

## Setup

1. Install Python dependencies:
```bash
pip install -r requirements.txt
```

2. Run the Flask application:
```bash
python app.py
```

3. Open your browser and navigate to `http://localhost:5000`

## Usage

1. Select your preferred AI model (Gemini or ChatGPT) from the dropdown menu
2. Enter your API key in the input field
3. Click "Save API Key" to store your settings
4. Start chatting with the AI!

## Security Notes

- API keys are stored in your browser's local storage
- No API keys are stored on the server
- Always use HTTPS in production environments

## Requirements

- Python 3.7+
- Modern web browser
- Valid API key for either Gemini or ChatGPT 