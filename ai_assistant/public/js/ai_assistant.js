/**
 * AI Assistant JavaScript Library
 * Provides functionality for the AI Assistant interface
 */

class AIAssistant {
    constructor() {
        this.isInitialized = false;
        this.chatHistory = [];
        this.currentQuery = null;
        this.fileUploadQueue = [];
        this.processingFiles = new Map();
        
        // Bind methods to the instance to ensure 'this' context is correct
        this.setupEventListeners = this.setupEventListeners.bind(this);
        this.handleFileSelect = this.handleFileSelect.bind(this);
        this.toggleFileUpload = this.toggleFileUpload.bind(this);
        this.sendQuery = this.sendQuery.bind(this);
        this.sendComplexQuery = this.sendComplexQuery.bind(this);
        this.sendQuickQuery = this.sendQuickQuery.bind(this);
        this.displayMessage = this.displayMessage.bind(this);
        this.showTypingIndicator = this.showTypingIndicator.bind(this);
        this.hideTypingIndicator = this.hideTypingIndicator.bind(this);
        this.getCSRFToken = this.getCSRFToken.bind(this);
        this.loadChatHistory = this.loadChatHistory.bind(this);
        this.addMessageToHistory = this.addMessageToHistory.bind(this);
        this.saveChatHistory = this.saveChatHistory.bind(this);
    }

    init() {
        if (this.isInitialized) return;
        
        this.setupEventListeners();
        this.loadChatHistory();
        this.isInitialized = true;
        
        console.log('AI Assistant initialized');
    }

    setupEventListeners() {
        // Chat widget toggle (if applicable, assuming a floating widget)
        const chatToggle = document.querySelector('.ai-chat-toggle');
        if (chatToggle) {
            chatToggle.addEventListener('click', this.toggleChatWidget);
        }

        // File upload handling
        const fileInput = document.getElementById('fileInput');
        if (fileInput) {
            fileInput.addEventListener('change', (e) => {
                this.handleFileSelect(e.target.files);
            });
        }

        // Drag and drop
        const fileUploadArea = document.getElementById('fileUploadArea');
        if (fileUploadArea) {
            fileUploadArea.addEventListener('dragover', (e) => {
                e.preventDefault();
                fileUploadArea.classList.add('dragover');
            });

            fileUploadArea.addEventListener('dragleave', (e) => {
                e.preventDefault();
                fileUploadArea.classList.remove('dragover');
            });

            fileUploadArea.addEventListener('drop', (e) => {
                e.preventDefault();
                fileUploadArea.classList.remove('dragover');
                this.handleFileSelect(e.dataTransfer.files);
            });

            fileUploadArea.addEventListener('click', () => {
                fileInput.click();
            });
        }

        // Quick action buttons (delegated to document)
        document.addEventListener('click', (e) => {
            if (e.target.matches('.quick-action')) {
                const query = e.target.dataset.query;
                if (query) {
                    this.sendQuery(query);
                }
            }
        });

        // Send message button
        const sendMessageBtn = document.getElementById('sendMessageBtn');
        if (sendMessageBtn) {
            sendMessageBtn.addEventListener('click', () => {
                const input = document.getElementById('chatInput');
                this.sendQuery(input.value);
                input.value = ''; // Clear input after sending
            });
        }

        // Chat input keypress (Enter to send)
        const chatInput = document.getElementById('chatInput');
        if (chatInput) {
            chatInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    this.sendQuery(chatInput.value);
                    chatInput.value = ''; // Clear input after sending
                }
            });

            // Auto-resize textarea
            chatInput.addEventListener('input', function() {
                this.style.height = 'auto';
                this.style.height = Math.min(this.scrollHeight, 120) + 'px';
            });
        }

        // Toggle file upload buttons
        const toggleFileUploadBtn = document.getElementById('toggleFileUploadBtn');
        if (toggleFileUploadBtn) {
            toggleFileUploadBtn.addEventListener('click', this.toggleFileUpload);
        }
        const toggleFileUploadBtn2 = document.getElementById('toggleFileUploadBtn2');
        if (toggleFileUploadBtn2) {
            toggleFileUploadBtn2.addEventListener('click', this.toggleFileUpload);
        }
    }

    async sendQuery(query) {
        if (!query.trim()) return;

        this.displayMessage(query, 'user');
        this.showTypingIndicator();

        try {
            // Determine if it's a quick query or complex query
            const quickActionButtons = document.querySelectorAll('.quick-action');
            let isQuickQuery = false;
            for (let i = 0; i < quickActionButtons.length; i++) {
                if (quickActionButtons[i].dataset.query === query) {
                    isQuickQuery = true;
                    break;
                }
            }

            let response;
            if (isQuickQuery) {
                response = await this.sendQuickQuery(query);
            } else {
                response = await this.sendComplexQuery(query);
            }

            this.hideTypingIndicator();
            if (response.status === 'error') {
                this.displayMessage(`Error: ${response.message}`, 'ai', 'error');
            } else if (response.status === 'navigate') {
                this.displayMessage(`Navigating to: ${response.message}`, 'ai');
                // Frappe.go_to(response.path); // Uncomment if Frappe.go_to is available
                window.location.href = response.path; // Fallback for direct navigation
            } else {
                // Ensure the response is handled correctly, especially if it's a direct string
                this.displayMessage(response.message || response, 'ai');
            }
        } catch (error) {
            this.hideTypingIndicator();
            console.error('Error sending query:', error);
            this.displayMessage(`Sorry, I encountered an error: ${error.message || error}`, 'ai', 'error');
        }
    }

    async sendComplexQuery(query) {
        const response = await fetch('/api/method/ai_assistant.ontime_ai_assistant.api.chat.get_chat_response', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Frappe-CSRF-Token': this.getCSRFToken()
            },
            body: JSON.stringify({ user_query: query })
        });
        
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
        }
        return response.json();
    }

    async sendQuickQuery(query) {
        const response = await fetch('/api/method/ai_assistant.ontime_ai_assistant.api.chat.quick_query', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Frappe-CSRF-Token': this.getCSRFToken()
            },
            body: JSON.stringify({ query_text: query }) // Ensure parameter name matches backend
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
        }
        return response.json();
    }

    toggleFileUpload() {
        const fileUploadArea = document.getElementById('fileUploadArea');
        if (fileUploadArea) {
            fileUploadArea.style.display = fileUploadArea.style.display === 'none' || fileUploadArea.style.display === '' ? 'block' : 'none';
        }
    }

    handleFileSelect(files) {
        if (files.length === 0) return;

        for (const file of files) {
            this.fileUploadQueue.push(file);
            this.displayMessage(`File selected: ${file.name}`, 'user');
            this.uploadFile(file);
        }
    }

    async uploadFile(file) {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('document_name', file.name);
        formData.append('document_type', file.type);
        // Add analysis_prompt if needed, e.g., from a hidden input or default
        formData.append('analysis_prompt', 'Analyze this document for key information.');

        this.processingFiles.set(file.name, 'uploading');
        this.displayMessage(`Uploading ${file.name}...`, 'ai');

        try {
            const response = await fetch('/api/method/ai_assistant.ontime_ai_assistant.api.chat.upload_and_analyze_document', {
                method: 'POST',
                headers: {
                    'X-Frappe-CSRF-Token': this.getCSRFToken()
                },
                body: formData
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
            }

            const result = await response.json();
            this.processingFiles.set(file.name, 'analyzing');
            this.displayMessage(`File ${file.name} uploaded. Analysis initiated.`, 'ai');
            // Optionally, poll for analysis status using result.processor_id

        } catch (error) {
            console.error('Error uploading file:', error);
            this.processingFiles.set(file.name, 'failed');
            this.displayMessage(`Failed to upload ${file.name}: ${error.message || error}`, 'ai', 'error');
        }
    }

    displayMessage(message, sender, type = 'text') {
        const chatMessages = document.getElementById('chatMessages');
        const messageDiv = document.createElement('div');
        messageDiv.classList.add('message', sender);

        let avatarContent = '';
        if (sender === 'user') {
            avatarContent = '<i class="fas fa-user"></i>';
        } else if (sender === 'ai') {
            avatarContent = '<i class="fas fa-robot"></i>';
        }

        let messageText = message;
        if (typeof message === 'object' && message !== null) {
            if (message.status === 'error') {
                messageText = `Error: ${message.message || 'An unknown error occurred.'}`;
            } else if (message.status === 'navigate') {
                messageText = `Navigating to: ${message.message || message.path}`;
            } else if (message.message) { // Check for a 'message' property in the object
                messageText = message.message;
            } else {
                // Default to stringify if it's an object but not an error/navigate status or a simple message
                messageText = JSON.stringify(message, null, 2);
            }
        }

        messageDiv.innerHTML = `\n            <div class="message-avatar">${avatarContent}</div>\n            <div class="message-content">\n                <div class="message-text">${messageText}</div>\n            </div>\n        `;

        chatMessages.appendChild(messageDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight;
        this.addMessageToHistory(message, sender, type);
    }

    showTypingIndicator() {
        const typingIndicator = document.getElementById('typingIndicator');
        if (typingIndicator) {
            typingIndicator.style.display = 'flex';
            const chatMessages = document.getElementById('chatMessages');
            chatMessages.scrollTop = chatMessages.scrollHeight;
        }
    }

    hideTypingIndicator() {
        const typingIndicator = document.getElementById('typingIndicator');
        if (typingIndicator) {
            typingIndicator.style.display = 'none';
        }
    }

    getCSRFToken() {
        // Frappe specific: get CSRF token from cookie or meta tag
        return frappe.csrf_token || document.querySelector('meta[name="csrf-token"]').getAttribute('content');
    }

    loadChatHistory() {
        // Implement loading chat history from local storage or server
        const history = localStorage.getItem('aiAssistantChatHistory');
        if (history) {
            this.chatHistory = JSON.parse(history);
            this.chatHistory.forEach(msg => this.displayMessage(msg.message, msg.sender, msg.type));
        }
    }

    addMessageToHistory(message, sender, type) {
        this.chatHistory.push({ message, sender, type, timestamp: new Date().toISOString() });
        this.saveChatHistory();
    }

    saveChatHistory() {
        localStorage.setItem('aiAssistantChatHistory', JSON.stringify(this.chatHistory));
    }
}

// Global initialization
document.addEventListener("DOMContentLoaded", function() {
    // Ensure Frappe is loaded before initializing AIAssistant
    if (typeof frappe !== 'undefined' && frappe.ready) {
        frappe.ready(() => {
            window.aiAssistant = new AIAssistant();
            window.aiAssistant.init();
        });
    } else {
        // Fallback for non-Frappe environments or if frappe is not yet ready
        window.aiAssistant = new AIAssistant();
        window.aiAssistant.init();
    }
});


