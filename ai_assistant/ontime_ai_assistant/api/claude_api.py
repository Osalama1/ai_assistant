
import frappe

@frappe.whitelist()
def get_claude_response(prompt, api_key):
    # Placeholder for Claude API call
    return f"Claude response for: {prompt}"

