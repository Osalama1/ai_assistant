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

            // Determine query type
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

            // Add AI response
            if (response.message) {
                this.addChatMessage(response.message, \'ai\');
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
            if (text.trim().startsWith(\'{\') || text.trim().startsWith(\'[\')) {
                const parsed = JSON.parse(text);
                formatted = \'<pre>\'+ JSON.stringify(parsed, null, 2) + \'</pre>\';
            }
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
                const processResponse = await fetch(\'/api/method/ai_assistant.ontime_ai_assistant.api.document_analysis.upload_document\', {
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
                const response = await fetch(\'/api/method/ai_assistant.ontime_ai_assistant.api.document_analysis.get_processing_status\', {
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
                            message += \'\\n\\nExtracted data:\\n\' + 
                                     JSON.stringify(data.message.extracted_data, null, 2);
                        }
                        if (data.message.created_records) {
                            message += \'\\n\\nCreated records:\\n\' + 
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
                        
                    } else if (status === \'Processing\' && attempts < maxAttempts) {
                        attempts++;
                        setTimeout(checkStatus, 3000);
                    } else {
                        this.updateFileStatus(fileName, \'failed\');
                        this.addChatMessage(`Processing timeout for "${fileName}".`, \'ai\');
                    }
                }
            } catch (error) {
                console.error(\'Status check error:\', error);
                if (attempts < maxAttempts) {
                    attempts++;
                    setTimeout(checkStatus, 3000);
                }
            }
        };

        checkStatus();
    }

    addFileToUI(file) {
        const fileList = document.getElementById(\'ai-file-list\');
        if (!fileList) return;

        const fileItem = document.createElement(\'div\');
        fileItem.className = \'ai-file-item\';
        fileItem.id = `file-${file.name.replace(/\\s/g, \'-\' )}`;
        fileItem.innerHTML = `
            <i class="fas fa-file ai-file-icon"></i>
            <div class="ai-file-info">
                <div class="ai-file-name">${file.name}</div>
                <div class="ai-file-size">${(file.size / 1024).toFixed(2)} KB</div>
            </div>
            <div class="ai-file-status processing">Processing</div>
        `;
        fileList.appendChild(fileItem);
    }

    updateFileStatus(fileName, status) {
        const fileItem = document.getElementById(`file-${fileName.replace(/\\s/g, \'-\' )}`);
        if (fileItem) {
            const statusDiv = fileItem.querySelector(\.ai-file-status\');
            if (statusDiv) {
                statusDiv.className = `ai-file-status ${status}`;
                statusDiv.textContent = status.charAt(0).toUpperCase() + status.slice(1);
            }
        }
    }

    detectDocumentType(fileName) {
        const ext = fileName.split(\'.\').pop().toLowerCase();
        if ([\'pdf\'].includes(ext)) return \'PDF\';
        if ([\'jpg\', \'jpeg\', \'png\', \'gif\', \'bmp\'].includes(ext)) return \'Image\';
        if ([\'docx\', \'doc\'].includes(ext)) return \'Word Document\';
        if ([\'xlsx\', \'xls\'].includes(ext)) return \'Excel Spreadsheet\';
        return \'Other\';
    }

    getCSRFToken() {
        return frappe.csrf_token;
    }

    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    loadChatHistory() {
        // Load from localStorage or server
        const history = localStorage.getItem(\'ai_chat_history\');
        if (history) {
            this.chatHistory = JSON.parse(history);
            this.chatHistory.forEach(msg => {
                this.addChatMessage(msg.text, msg.sender, msg.metadata);
            });
        }
    }

    saveChatHistory() {
        localStorage.setItem(\'ai_chat_history\', JSON.stringify(this.chatHistory));
    }
}

// Initialize the AI Assistant when the DOM is ready
document.addEventListener(\'DOMContentLoaded\', () => {
    window.aiAssistant = new AIAssistant();
});


