import frappe
from litellm import completion

@frappe.whitelist()
def get_openai_response(prompt, api_key, model="gpt-3.5-turbo"):
    try:
        messages = [{"role": "user", "content": prompt}]
        response = completion(model=model, messages=messages, api_key=api_key)
        return response.choices[0].message.content
    except Exception as e:
        frappe.log_error(f"OpenAI API request failed: {e}", "OpenAI API Error")
        return f"Error communicating with OpenAI API: {e}"


