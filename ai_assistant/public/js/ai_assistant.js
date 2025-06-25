/**
 * AI Assistant JavaScript Library
 * Provides functionality for the AI Assistant interface
 */

// Define AIAssistant class globally or ensure it's accessible
class AIAssistant {
    constructor() {
        this.isInitialized = false;
        this.chatHistory = [];
        this.currentQuery = null;
        this.fileUploadQueue = [];
        this.processingFiles = new Map();
        
        // No direct init() call here, it will be called by the global function
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
            chatToggle.addEventListener('click', () => {
                this.toggleChatWidget();
            });
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

        // Example query clicks (delegated to document)
        document.addEventListener('click', (e) => {
            if (e.target.matches('.quick-action')) {
                // Check if it's the 

