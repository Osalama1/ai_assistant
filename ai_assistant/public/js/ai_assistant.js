frappe.ready(function() {
    console.log("AI Assistant app is ready!");

    const chatInput = document.getElementById("chat-input");
    const sendButton = document.getElementById("send-button");
    const chatMessages = document.getElementById("chat-messages");

    sendButton.addEventListener("click", sendMessage);
    chatInput.addEventListener("keypress", function(e) {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault(); // Prevent new line
            sendMessage();
        }
    });

    function sendMessage() {
        const message = chatInput.value.trim();
        if (message === "") return;

        appendMessage("You", message);
        chatInput.value = "";

        // Call the backend API
        frappe.call({
            method: "ai_assistant.ontime_ai_assistant.api.chat.get_chat_response",
            args: {
                user_query: message
            },
            callback: function(r) {
                if (r.message) {
                    appendMessage("AI Assistant", r.message);
                } else if (r.exc) {
                    appendMessage("AI Assistant", "Error: " + r.exc);
                    frappe.msgprint(__("Error: {0}", [r.exc]));
                }
            },
            error: function(err) {
                appendMessage("AI Assistant", "Network Error: " + err.statusText);
                frappe.msgprint(__("Network Error: {0}", [err.statusText]));
            }
        });
    }

    function appendMessage(sender, text) {
        const messageElement = document.createElement("div");
        messageElement.classList.add("chat-message");
        messageElement.innerHTML = `<strong>${sender}:</strong> ${text}`;
        chatMessages.appendChild(messageElement);
        chatMessages.scrollTop = chatMessages.scrollHeight; // Scroll to bottom
    }
});

