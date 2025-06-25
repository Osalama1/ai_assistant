
import frappe

@frappe.whitelist()
def get_openai_response(prompt, api_key):
    # Placeholder for OpenAI API call
    return f"OpenAI response for: {prompt}"

