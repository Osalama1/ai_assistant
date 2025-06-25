
import frappe

@frappe.whitelist()
def get_gemini_response(prompt, api_key):
    # Placeholder for Gemini API call
    return f"Gemini response for: {prompt}"

