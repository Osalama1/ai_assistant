import frappe
import requests

@frappe.whitelist()
def get_gemini_response(prompt, api_key):
    url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=" + api_key
    headers = {"Content-Type": "application/json"}
    data = {"contents": [{"parts": [{"text": prompt}]}]}

    try:
        response = requests.post(url, headers=headers, json=data)
        response.raise_for_status()  # Raise an exception for HTTP errors
        result = response.json()
        return result["candidates"][0]["content"]["parts"][0]["text"]
    except requests.exceptions.RequestException as e:
        frappe.log_error(f"Gemini API request failed: {e}", "Gemini API Error")
        return f"Error communicating with Gemini API: {e}"
    except KeyError:
        frappe.log_error(f"Unexpected Gemini API response format: {result}", "Gemini API Error")
        return "Error: Unexpected response from Gemini API."


