import frappe
from ai_assistant.ontime_ai_assistant.api.ai_service import get_ai_response

def get_erp_explanation(query, user_roles, ai_provider_name, api_key):
    # This function will leverage the LLM to explain ERP terms or processes.
    # In a more advanced setup, this could involve RAG (Retrieval Augmented Generation)
    # where relevant snippets from ERPNext documentation are retrieved and provided to the LLM.

    # For now, we'll rely on the LLM's general knowledge, but prompt it to be ERPNext-specific.
    prompt = f"Explain \"{query}\" in the context of ERPNext. Provide a concise and clear explanation, and if applicable, mention relevant DocTypes or modules. If it's a process, outline the steps in ERPNext."

    # Add role-based context to the prompt if necessary
    if "Sales User" in user_roles:
        prompt = f"{prompt} (from a sales perspective)"
    elif "Accounts User" in user_roles:
        prompt = f"{prompt} (from an accounting perspective)"

    response = get_ai_response(prompt, "ERP Explanation", ai_provider_name, api_key)
    return response


def get_erp_steps(query, user_roles, ai_provider_name, api_key):
    # This function will leverage the LLM to provide steps for ERPNext processes.
    prompt = f"Outline the steps to \"{query}\" in ERPNext. Be specific and clear."

    # Add role-based context to the prompt if necessary
    if "Sales User" in user_roles:
        prompt = f"{prompt} (from a sales perspective)"
    elif "Accounts User" in user_roles:
        prompt = f"{prompt} (from an accounting perspective)"

    response = get_ai_response(prompt, "ERP Steps", ai_provider_name, api_key)
    return response


