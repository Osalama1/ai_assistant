
import frappe

@frappe.whitelist()
def get_cohere_response(prompt, api_key):
    # Placeholder for Cohere API call
    return f"Cohere response for: {prompt}"

