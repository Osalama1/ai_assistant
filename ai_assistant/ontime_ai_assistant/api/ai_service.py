import frappe
from litellm import completion

@frappe.whitelist()
def get_ai_response(query_text, query_type, ai_provider_name, api_key):
    try:
        model = None
        if ai_provider_name == "Gemini":
            model = "gemini/gemini-pro"
        elif ai_provider_name == "OpenAI":
            model = "gpt-3.5-turbo"
        elif ai_provider_name == "DeepSeek":
            model = "ollama/deepseek-coder" # Assuming Ollama is set up for DeepSeek
        elif ai_provider_name == "Claude":
            model = "claude-2" # Example Claude model, adjust as needed
        elif ai_provider_name == "Cohere":
            model = "command-r" # Example Cohere model, adjust as needed
        elif ai_provider_name == "Mistral":
            model = "mistral/mistral-tiny" # Example Mistral model, adjust as needed
        else:
            return f"AI Provider {ai_provider_name} not supported yet."

        messages = [{"role": "user", "content": query_text}]
        
        # Use LiteLLM for unified API call
        response = completion(model=model, messages=messages, api_key=api_key)
        
        return response.choices[0].message.content

    except Exception as e:
        frappe.log_error(f"Error in get_ai_response: {e}", "AI Service Error")
        return f"Error: {e}"

@frappe.whitelist()
def generate_script(prompt, script_type, ai_provider_name, api_key):
    try:
        model = None
        if ai_provider_name == "Gemini":
            model = "gemini/gemini-pro"
        elif ai_provider_name == "OpenAI":
            model = "gpt-3.5-turbo"
        elif ai_provider_name == "DeepSeek":
            model = "ollama/deepseek-coder"
        elif ai_provider_name == "Claude":
            model = "claude-2"
        elif ai_provider_name == "Cohere":
            model = "command-r"
        elif ai_provider_name == "Mistral":
            model = "mistral/mistral-tiny"
        else:
            return f"AI Provider {ai_provider_name} not supported for script generation."

        full_prompt = f"Generate a {script_type} for the following request: {prompt}\n\nProvide only the code, without any additional explanations or text."
        messages = [{"role": "user", "content": full_prompt}]

        # Use LiteLLM for unified API call
        generated_script = completion(model=model, messages=messages, api_key=api_key).choices[0].message.content

        # Log the script generation request
        frappe.get_doc({
            "doctype": "AI Script Generator",
            "script_type": script_type,
            "prompt": prompt,
            "generated_script": generated_script,
        }).insert(ignore_permissions=True)

        return generated_script

    except Exception as e:
        frappe.log_error(f"Error in generate_script: {e}", "AI Service Error")
        return f"Error: {e}"


@frappe.whitelist()
def analyze_document(file_path, analysis_prompt):
    # This is a placeholder for the full document analysis implementation in Phase 3
    # It will involve reading the file, extracting content, and sending it to the AI for analysis
    return {"status": "success", "message": f"Document analysis for {file_path} with prompt \n{analysis_prompt}\n will be implemented in Phase 3."}


