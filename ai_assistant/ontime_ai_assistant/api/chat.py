import frappe
from ai_assistant.ontime_ai_assistant.api.ai_service import get_ai_response, generate_script, analyze_document
from ai_assistant.ontime_ai_assistant.api.frappe_command_executor import execute_frappe_command

@frappe.whitelist()
def get_chat_response(user_query):
    current_user = frappe.session.user
    user_roles = frappe.get_roles(current_user)

    command_type = None
    doctype_name = None
    data = {}
    filters = {}
    is_erp_command = False
    response_message = None

    lower_query = user_query.lower()

    # --- ERP Command Parsing ---
    # Create a new item group for electronics
    if "create" in lower_query and "item group" in lower_query:
        command_type = "create"
        doctype_name = "Item Group"
        parts = lower_query.split("for")
        if len(parts) > 1:
            item_group_name = parts[1].strip().replace("electronics", "Electronics").title()
            data = {"item_group_name": item_group_name, "is_group": 1}
        is_erp_command = True

    # Show me overdue invoices for April
    elif "show me" in lower_query and "overdue invoices" in lower_query:
        command_type = "read"
        doctype_name = "Sales Invoice"
        # Basic date parsing, will be enhanced with NLP
        if "april" in lower_query:
            filters = {"due_date": ["<=", frappe.utils.get_datetime(frappe.utils.get_last_day("2025-04-30"))], "outstanding_amount": [">", 0]}
        else:
            filters = {"outstanding_amount": [">", 0]}
        is_erp_command = True

    # Analyze this Excel sheet and generate items
    elif "analyze" in lower_query and ("excel sheet" in lower_query or "pdf" in lower_query or "word" in lower_query or "image" in lower_query):
        command_type = "analyze_document"
        # For now, we assume the file path will be provided separately or via a frontend upload mechanism
        # This will be handled more robustly in Phase 3
        response_message = "Please upload the file for analysis. File analysis functionality is under development."
        is_erp_command = True

    # Upload contract.pdf and extract customer info
    elif "upload" in lower_query and ("pdf" in lower_query or "word" in lower_query or "excel" in lower_query or "image" in lower_query):
        command_type = "upload_document"
        # Similar to analyze, this will be handled more robustly in Phase 3
        response_message = "Please upload the file. File upload functionality is under development."
        is_erp_command = True

    # Create a new item group for electronics (duplicate, already handled above)

    # Show me all quotations for client Ahmed.
    elif "show me all quotations" in lower_query and "for client" in lower_query:
        command_type = "read"
        doctype_name = "Quotation"
        client_name = lower_query.split("for client")[-1].strip().title()
        filters = {"customer_name": client_name}
        is_erp_command = True

    # Smart Data Entry: 

