
import frappe

@frappe.whitelist()
def get_deepseek_response(prompt, api_key):
    # Placeholder for DeepSeek API call
    return f"DeepSeek response for: {prompt}"

