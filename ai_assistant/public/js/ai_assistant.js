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
        
        this.init();
    }

    init() {
        if (this.isInitialized) return;
        
        this.setupEventListeners();
        this.loadChatHistory();
        this.isInitialized = true;
        
        console.log(\'AI Assistant initialized\');
    }

    setupEventListeners() {
        // Chat widget toggle
        document.addEventListener(\'click\', (e) => {
            if (e.target.closest(\.ai-chat-toggle\')) {
                this.toggleChatWidget();
            }
        });

        // File upload handling
        document.addEventListener(\'change\', (e) => {
            if (e.target.matches(\'#ai-file-input\')) {
                this.handleFileSelect(e.target.files);
            }
        });

        // Drag and drop
        document.addEventListener(\'dragover\', (e) => {
            if (e.target.closest(\.ai-upload-zone\')) {
                e.preventDefault();
                e.target.closest(\.ai-upload-zone\').classList.add(\'dragover\');
            }
        });

        document.addEventListener(\'dragleave\', (e) => {
            if (e.target.closest(\.ai-upload-zone\')) {
                e.target.closest(\.ai-upload-zone\').classList.remove(\'dragover\');
            }
        });

        document.addEventListener(\'drop\', (e) => {
            if (e.target.closest(\.ai-upload-zone\')) {
                e.preventDefault();
                e.target.closest(\.ai-upload-zone\').classList.remove(\'dragover\');
                this.handleFileSelect(e.dataTransfer.files);
            }
        });

        // Example query clicks
        document.addEventListener(\'click\', (e) => {
            if (e.target.matches(\.ai-example-query\')) {
                this.sendQuery(e.target.textContent.trim());
            }
        });

        // Script generation button click
        document.addEventListener(\'click\', (e) => {
            if (e.target.matches(\'#generateScriptBtn\')) {
                const prompt = document.getElementById(\'scriptPrompt\').value;
                const scriptType = document.getElementById(\'scriptType\').value;
                this.generateScript(prompt, scriptType);
            }
        });

        // Send button click
        document.addEventListener(\'click\', (e) => {
            if (e.target.matches(\'#ai-send-button\')) {
                const input = document.getElementById(\'ai-chat-input\');
                this.sendQuery(input.value);
                input.value = \'\'; // Clear input after sending
            }
        });

        // Enter key press in input field
        document.addEventListener(\'keypress\', (e) => {
            if (e.target.matches(\'#ai-chat-input\') && e.key === \'Enter\') {
                const input = document.getElementById(\'ai-chat-input\');
                this.sendQuery(input.value);
                input.value = \'\'; // Clear input after sending
            }
        });

        // Voice-to-text (Speech Recognition API)
        if (\'SpeechRecognition\' in window || \'webkitSpeechRecognition\' in window) {
            const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
            const recognition = new SpeechRecognition();
            recognition.continuous = false;
            recognition.lang = \'en-US\'; // Default language, will be dynamic

            recognition.onresult = (event) => {
                const transcript = event.results[0][0].transcript;
                document.getElementById(\'ai-chat-input\').value = transcript;
                this.sendQuery(transcript);
            };

            recognition.onerror = (event) => {
                console.error(\'Speech recognition error:\', event.error);
                this.addChatMessage(\'Voice input error. Please try typing.\', \'ai\');
            };

            document.addEventListener(\'click\', (e) => {
                if (e.target.matches(\'#ai-voice-input-button\')) {
                    recognition.start();
                    this.addChatMessage(\'Listening...\', \'ai\');
                }
            });
        }
    }

    toggleChatWidget() {
        const popup = document.querySelector(\.ai-chat-popup\');
        if (popup) {
            popup.classList.toggle(\'active\');
        }
    }

    async sendQuery(query, options = {}) {
        if (!query.trim()) return;

        try {
            // Add user message to chat
            this.addChatMessage(query, \'user\');
            
            // Show typing indicator
            this.showTypingIndicator();

            // Determine query type (this will be more sophisticated with NLP)
            const queryType = this.determineQueryType(query);
            
            // Send to appropriate endpoint
            let response;
            if (queryType === \'quick\') {
                response = await this.sendQuickQuery(query);
            } else {
                response = await this.sendComplexQuery(query, queryType);
            }

            // Hide typing indicator
            this.hideTypingIndicator();

            // Handle navigation commands from backend
            if (response && response.status === \'navigate\' && response.path) {
                this.addChatMessage(response.message || \'Navigating...\', \'ai\');
                window.location.href = response.path; // Redirect to the specified path
                return; // Stop further processing
            }

            // Add AI response
            if (response.message) {
                this.addChatMessage(response.message, \'ai\');
            } else if (response.data) {
                // Handle structured data responses (e.g., from ERP commands)
                let formattedData = JSON.stringify(response.data, null, 2);
                if (response.summary) {
                    this.addChatMessage(`${response.summary}\n\n<pre><code>${formattedData}</code></pre>`, \'ai\');
                } else {
                    this.addChatMessage(`<pre><code>${formattedData}</code></pre>`, \'ai\');
                }
            } else {
                this.addChatMessage(`Sorry, I encountered an error: ${response.error || \'Unknown error\'}`, \'ai\');
            }

            // Save to history
            this.saveChatHistory();

        } catch (error) {
            this.hideTypingIndicator();
            this.addChatMessage(\'Sorry, I\\\'m having trouble connecting. Please try again.\', \'ai\');
            console.error(\'Query error:\', error);
        }
    }

    async sendQuickQuery(query) {
        const response = await fetch(\'/api/method/ai_assistant.ontime_ai_assistant.api.chat.quick_query\', {
            method: \'POST\',
            headers: {
                \'Content-Type\': \'application/json\',
                \'X-Frappe-CSRF-Token\': this.getCSRFToken()
            },
            body: JSON.stringify({ query_text: query })
        });

        const data = await response.json();
        return data;
    }

    async sendComplexQuery(query, queryType) {
        const response = await fetch(\'/api/method/ai_assistant.ontime_ai_assistant.api.chat.get_chat_response\', {
            method: \'POST\',
            headers: {
                \'Content-Type\': \'application/json\',
                \'X-Frappe-CSRF-Token\': this.getCSRFToken()
            },
            body: JSON.stringify({ 
                user_query: query,
                query_type: queryType
            })
        });

        const data = await response.json();
        return data;
    }

    async generateScript(prompt, scriptType) {
        if (!prompt.trim()) return;

        try {
            this.addChatMessage(`Generating ${scriptType} for: ${prompt}...`, \'user\');
            this.showTypingIndicator();

            const response = await fetch(\'/api/method/ai_assistant.ontime_ai_assistant.api.chat.generate_script_from_prompt\', {
                method: \'POST\',
                headers: {
                    \'Content-Type\': \'application/json\',
                    \'X-Frappe-CSRF-Token\': this.getCSRFToken()
                },
                body: JSON.stringify({ prompt: prompt, script_type: scriptType })
            });

            const data = await response.json();
            this.hideTypingIndicator();

            if (data.message) {
                this.addChatMessage(`Generated ${scriptType}:\n\n<pre><code>${data.message}</code></pre>`, \'ai\');
            } else {
                this.addChatMessage(`Sorry, I encountered an error generating script: ${data.error || \'Unknown error\'}`, \'ai\');
            }

        } catch (error) {
            this.hideTypingIndicator();
            this.addChatMessage(\'Sorry, I\\\'m having trouble generating the script. Please try again.\', \'ai\');
            console.error(\'Script generation error:\', error);
        }
    }

    determineQueryType(query) {
        const queryLower = query.toLowerCase();
        
        // Simple queries that can be handled quickly
        const quickPatterns = [
            /how many.*today/,
            /how many.*this week/,
            /how many.*this month/,
            /show.*pending/,
            /list.*today/,
            /count.*today/
        ];

        if (quickPatterns.some(pattern => pattern.test(queryLower))) {
            return \'quick\';
        }

        // Determine specific query types
        if (queryLower.includes(\'create\') || queryLower.includes(\'add\') || queryLower.includes(\'new\')) {
            return \'Record Creation\';
        }
        
        if (queryLower.includes(\'analyze\') || queryLower.includes(\'process\') || queryLower.includes(\'extract\')) {
            return \'Document Analysis\';
        }
        
        if (queryLower.includes(\'insight\') || queryLower.includes(\'trend\') || queryLower.includes(\'recommend\')) {
            return \'Insight Generation\';
        }

        return \'Natural Language\'; // Default to natural language for general chat
    }

    addChatMessage(text, sender, metadata = {}) {
        const chatContainer = document.querySelector(\.ai-popup-messages\') || 
                            document.querySelector(\.chat-messages\') ||
                            document.querySelector(\'#chatMessages\');
        
        if (!chatContainer) return;

        const messageDiv = document.createElement(\'div\');
        messageDiv.className = `ai-message ${sender}`;

        const avatar = document.createElement(\'div\');
        avatar.className = \'ai-message-avatar\';
        avatar.innerHTML = sender === \'user\' ? 
            \'<i class="fas fa-user"></i>\' : 
            \'<i class="fas fa-robot"></i>\';

        const content = document.createElement(\'div\');
        content.className = \'ai-message-content\';
        content.innerHTML = this.formatMessage(text);

        // Add confidence indicator for AI responses
        if (sender === \'ai\' && metadata.confidence) {
            const confidence = document.createElement(\'div\');
            confidence.className = \'ai-confidence\';
            confidence.textContent = `Confidence: ${(metadata.confidence * 100).toFixed(0)}%`;
            content.appendChild(confidence);
        }

        messageDiv.appendChild(avatar);
        messageDiv.appendChild(content);
        chatContainer.appendChild(messageDiv);

        // Scroll to bottom
        chatContainer.scrollTop = chatContainer.scrollHeight;

        // Add to history
        this.chatHistory.push({
            text,
            sender,
            timestamp: new Date().toISOString(),
            metadata
        });
    }

    formatMessage(text) {
        // Convert newlines to <br>
        let formatted = text.replace(/\n/g, \'<br>\');
        
        // Format JSON data nicely
        try {
            const parsed = JSON.parse(text);
            formatted = \'<pre>\'+ JSON.stringify(parsed, null, 2) + \'</pre>\';
        } catch (e) {
            // Not JSON, keep original formatting
        }

        return formatted;
    }

    showTypingIndicator() {
        const indicator = document.querySelector(\.ai-typing-indicator\') ||
                         document.querySelector(\'#typingIndicator\');
        
        if (indicator) {
            indicator.style.display = \'flex\';
        } else {
            // Create typing indicator if it doesn\\\'t exist
            this.createTypingIndicator();
        }
    }

    hideTypingIndicator() {
        const indicator = document.querySelector(\.ai-typing-indicator\') ||
                         document.querySelector(\'#typingIndicator\');
        
        if (indicator) {
            indicator.style.display = \'none\';
        }
    }

    createTypingIndicator() {
        const chatContainer = document.querySelector(\.ai-popup-messages\') || 
                            document.querySelector(\.chat-messages\');
        
        if (!chatContainer) return;

        const indicator = document.createElement(\'div\');
        indicator.className = \'ai-typing-indicator\';
        indicator.innerHTML = `
            <div class="ai-message-avatar">
                <i class="fas fa-robot"></i>
            </div>
            <div class="ai-typing-dots">
                <div class="ai-typing-dot"></div>
                <div class="ai-typing-dot"></div>
                <div class="ai-typing-dot"></div>
            </div>
            <span>AI is thinking...</span>
        `;
        
        chatContainer.appendChild(indicator);
    }

    async handleFileSelect(files) {
        for (let file of files) {
            await this.uploadFile(file);
        }
    }

    async uploadFile(file) {
        try {
            // Add to UI
            this.addFileToUI(file);
            this.addChatMessage(`Uploading ${file.name}...`, \'user\');
            this.showTypingIndicator();

            // Upload file
            const formData = new FormData();
            formData.append(\'file\', file);
            formData.append(\'is_private\', 0);

            const uploadResponse = await fetch(\'/api/method/upload_file\', {
                method: \'POST\',
                headers: {
                    \'X-Frappe-CSRF-Token\': this.getCSRFToken()
                },
                body: formData
            });

            const uploadData = await uploadResponse.json();
            
            if (uploadData.message) {
                // Process document
                const processResponse = await fetch(\'/api/method/ai_assistant.ontime_ai_assistant.api.chat.upload_and_analyze_document\', {
                    method: \'POST\',
                    headers: {
                        \'Content-Type\': \'application/json\',
                        \'X-Frappe-CSRF-Token\': this.getCSRFToken()
                    },
                    body: JSON.stringify({
                        file_url: uploadData.message.file_url,
                        document_name: file.name,
                        document_type: this.detectDocumentType(file.name)
                    })
                });

                const processData = await processResponse.json();
                this.hideTypingIndicator();

                if (processData.message && processData.message.success) {
                    this.addChatMessage(
                        `Document "${file.name}" uploaded successfully! Processing...`, 
                        \'ai\'
                    );
                    
                    // Monitor processing
                    this.monitorProcessing(processData.message.processor_id, file.name);
                } else {
                    this.addChatMessage(`Failed to process "${file.name}".`, \'ai\');
                    this.updateFileStatus(file.name, \'failed\');
                }
            } else {
                this.hideTypingIndicator();
                this.addChatMessage(`Failed to upload "${file.name}".`, \'ai\');
                this.updateFileStatus(file.name, \'failed\');
            }

        } catch (error) {
            this.hideTypingIndicator();
            this.addChatMessage(`Error uploading "${file.name}": ${error.message}`, \'ai\');
            this.updateFileStatus(file.name, \'failed\');
            console.error(\'Upload error:\', error);
        }
    }

    async monitorProcessing(processorId, fileName) {
        const maxAttempts = 20;
        let attempts = 0;

        const checkStatus = async () => {
            try {
                const response = await fetch(\'/api/method/ai_assistant.ontime_ai_assistant.api.chat.get_document_analysis_status\', {
                    method: \'POST\',
                    headers: {
                        \'Content-Type\': \'application/json\',
                        \'X-Frappe-CSRF-Token\': this.getCSRFToken()
                    },
                    body: JSON.stringify({ processor_id: processorId })
                });

                const data = await response.json();
                
                if (data.message && data.message.success) {
                    const status = data.message.status;
                    
                    if (status === \'Completed\') {
                        this.updateFileStatus(fileName, \'completed\');
                        
                        let message = `Document "${fileName}" processed successfully!`;
                        if (data.message.extracted_data) {
                            message += \'\\n\\nExtracted data:\\n\'+ 
                                     JSON.stringify(data.message.extracted_data, null, 2);
                        }
                        if (data.message.created_records) {
                            message += \'\\n\\nCreated records:\\n\'+ 
                                     JSON.stringify(data.message.created_records, null, 2);
                        }
                        
                        this.addChatMessage(message, \'ai\', {
                            confidence: data.message.confidence_score
                        });
                        
                    } else if (status === \'Failed\') {
                        this.updateFileStatus(fileName, \'failed\');
                        this.addChatMessage(
                            `Processing failed for "${fileName}": ${data.message.error || \'Unknown error\'}`, 
                            \'ai\'
                        );
                    } else {
                        // Still processing, check again after a delay
                        if (attempts < maxAttempts) {
                            attempts++;
                            setTimeout(checkStatus, 3000); // Check every 3 seconds
                        } else {
                            this.updateFileStatus(fileName, \'failed\');
                            this.addChatMessage(
                                `Document "${fileName}" processing timed out.`, 
                                \'ai\'
                            );
                        }
                    }
                } else {
                    this.updateFileStatus(fileName, \'failed\');
                    this.addChatMessage(`Error monitoring processing for "${fileName}": ${data.message.error || \'Unknown error\'}`, \'ai\');
                }
            } catch (error) {
                this.updateFileStatus(fileName, \'failed\');
                this.addChatMessage(`Error checking processing status for "${fileName}": ${error.message}`, \'ai\');
                console.error(\'Monitor processing error:\', error);
            }
        };

        setTimeout(checkStatus, 3000); // Initial check after 3 seconds
    }

    addFileToUI(file) {
        const fileList = document.getElementById(\'ai-file-list\');
        if (!fileList) return;

        const fileItem = document.createElement(\'div\');
        fileItem.className = \'ai-file-item\';
        fileItem.id = `file-${file.name.replace(/\s/g, \'-\' )}`;
        fileItem.innerHTML = `
            <span>${file.name}</span>
            <span class="ai-file-status">Pending...</span>
        `;
        fileList.appendChild(fileItem);
    }

    updateFileStatus(fileName, status) {
        const fileItem = document.getElementById(`file-${fileName.replace(/\s/g, \'-\' )}`);
        if (fileItem) {
            const statusSpan = fileItem.querySelector(\.ai-file-status\');
            if (statusSpan) {
                statusSpan.textContent = status.charAt(0).toUpperCase() + status.slice(1);
                fileItem.classList.remove(\'pending\', \'processing\', \'completed\', \'failed\');
                fileItem.classList.add(status);
            }
        }
    }

    detectDocumentType(fileName) {
        const ext = fileName.split(\'.\').pop().toLowerCase();
        switch (ext) {
            case \'pdf\': return \'PDF\';
            case \'docx\':
            case \'doc\': return \'Word Document\';
            case \'xlsx\':
            case \'xls\': return \'Excel Spreadsheet\';
            case \'png\':
            case \'jpg\':
            case \'jpeg\':
            case \'gif\':
            case \'bmp\': return \'Image\';
            default: return \'Unknown\';
        }
    }

    loadChatHistory() {
        // Load from local storage or Frappe user settings
        const storedHistory = localStorage.getItem(\'aiAssistantChatHistory\');
        if (storedHistory) {
            this.chatHistory = JSON.parse(storedHistory);
            this.chatHistory.forEach(msg => this.addChatMessage(msg.text, msg.sender, msg.metadata));
        }
    }

    saveChatHistory() {
        localStorage.setItem(\'aiAssistantChatHistory\', JSON.stringify(this.chatHistory));
    }

    getCSRFToken() {
        return frappe.csrf_token;
    }
}

// Initialize the assistant when the document is ready
frappe.ready(() => {
    window.aiAssistant = new AIAssistant();
});


