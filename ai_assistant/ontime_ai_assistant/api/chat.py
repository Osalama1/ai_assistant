import frappe

@frappe.whitelist()
def get_chat_response(user_query):
    # Get current user and their roles
    current_user = frappe.session.user
    user_roles = frappe.get_roles(current_user)

    # Placeholder for role-based query modification or restriction
    # Example: If user is 'Sales User', append 'related to sales' to query
    modified_query = user_query
    if "Sales User" in user_roles:
        modified_query = f"{user_query} related to sales"
    elif "Accounts User" in user_roles:
        modified_query = f"{user_query} related to accounting"
    # Add more role-based logic as needed

    # Call the AI service (placeholder for now)
    # In a real scenario, this would call the appropriate AI provider API
    # based on AI Settings and selected provider.
    
    # For now, let's return a dummy response based on the modified query
    response = f"AI response for 
\" {modified_query} \" (processed for {current_user} with roles: {', '.join(user_roles)})
"

    # Log the query (optional, but good for auditing)
    frappe.get_doc({
        "doctype": "AI Query",
        "query_text": user_query,
        "response_text": response,
        "query_type": "Natural Language", # Assuming natural language for chat
        "user": current_user,
        "query_date": frappe.utils.now_datetime()
    }).insert(ignore_permissions=True)

    return response

