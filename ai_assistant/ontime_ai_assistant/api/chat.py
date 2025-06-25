import frappe
from ai_assistant.ontime_ai_assistant.api.ai_service import get_ai_response, generate_script
from ai_assistant.ontime_ai_assistant.api.frappe_command_executor import execute_frappe_command
from ai_assistant.ontime_ai_assistant.api.document_analysis import upload_document as doc_upload_document, get_processing_status

@frappe.whitelist()
def get_chat_response(user_query):
    current_user = frappe.session.user
    user_roles = frappe.get_roles(current_user)

    command_type = None
    doctype_name = None
    data = {}
    filters = {}
    fields = ["*"]
    group_by = None
    order_by = None
    limit_start = 0
    limit_page_length = 20
    is_erp_command = False
    response_message = None

    lower_query = user_query.lower()

    # --- ERP Command Parsing ---
    # Example Queries:
    # "Create a new item group for electronics"
    # "Show me overdue invoices for April"
    # "Analyze this Excel sheet and generate items"
    # "Upload contract.pdf and extract customer info"
    # "Show me all quotations for client Ahmed."
    # "كم عدد فواتير البيع اليوم؟" (How many sales invoices today?)
    # "أنشئ عميل جديد باسم سالم" (Create a new customer named Salem)
    # "افتح قائمة العملاء" (Open customer list)

    # Create/Update/Delete Records
    if "create" in lower_query and "item group" in lower_query:
        command_type = "create"
        doctype_name = "Item Group"
        parts = lower_query.split("for")
        if len(parts) > 1:
            item_group_name = parts[1].strip().replace("electronics", "Electronics").title()
            data = {"item_group_name": item_group_name, "is_group": 1}
        is_erp_command = True
    elif "أنشئ عميل جديد باسم" in lower_query or "create a new customer named" in lower_query:
        command_type = "create"
        doctype_name = "Customer"
        customer_name = lower_query.split("باسم")[-1].strip().title() if "باسم" in lower_query else lower_query.split("named")[-1].strip().title()
        data = {"customer_name": customer_name}
        is_erp_command = True
    elif "create a sales order for" in lower_query:
        command_type = "create"
        doctype_name = "Sales Order"
        customer_name = lower_query.split("for")[-1].strip().title()
        data = {"customer": customer_name, "naming_series": "SO-"}
        response_message = "Sales Order creation initiated. Please provide more details like items and quantities."
        is_erp_command = True

    # Read/Analyze ERP Data
    elif "show me overdue invoices" in lower_query:
        command_type = "read"
        doctype_name = "Sales Invoice"
        filters = {"due_date": ["<=", frappe.utils.today()], "outstanding_amount": [">", 0]}
        if "for april" in lower_query:
            filters["posting_date"] = [">=", "2025-04-01"], ["<=", "2025-04-30"]
        is_erp_command = True
    elif "show me all quotations for client" in lower_query:
        command_type = "read"
        doctype_name = "Quotation"
        client_name = lower_query.split("for client")[-1].strip().title()
        filters = {"customer_name": client_name}
        is_erp_command = True
    elif "كم عدد فواتير البيع اليوم؟" in lower_query or "how many sales invoices today" in lower_query:
        command_type = "read"
        doctype_name = "Sales Invoice"
        filters = {"posting_date": frappe.utils.today()}
        fields = ["count(name) as total_invoices"]
        is_erp_command = True

    # File Understanding
    elif "analyze" in lower_query and ("excel sheet" in lower_query or "pdf" in lower_query or "word" in lower_query or "image" in lower_query):
        command_type = "analyze_document"
        response_message = "Please upload the file for analysis. File analysis functionality is under development."
        is_erp_command = True
    elif "upload" in lower_query and ("pdf" in lower_query or "word" in lower_query or "excel" in lower_query or "image" in lower_query):
        command_type = "upload_document"
        response_message = "Please upload the file. File upload functionality is under development."
        is_erp_command = True

    # Navigate Between DocTypes (Frontend will handle this, backend just acknowledges)
    elif "افتح قائمة العملاء" in lower_query or "go to customer list" in lower_query:
        response_message = {"status": "navigate", "path": "/app/customer", "message": "Opening Customer List."} # Frontend will interpret this
        is_erp_command = True
    elif "go to item group settings" in lower_query:
        response_message = {"status": "navigate", "path": "/app/item-group", "message": "Opening Item Group settings."} # Frontend will interpret this
        is_erp_command = True

    # --- Execute Command or Get AI Response ---
    if is_erp_command:
        if response_message:
            response = response_message
        else:
            response = execute_frappe_command(command_type, doctype_name, data=data, filters=filters, user=current_user, fields=fields, group_by=group_by, order_by=order_by, limit_start=limit_start, limit_page_length=limit_page_length)
    else:
        modified_query = user_query
        if "Sales User" in user_roles:
            modified_query = f"{user_query} related to sales"
        elif "Accounts User" in user_roles:
            modified_query = f"{user_query} related to accounting"

        ai_settings = frappe.get_single("AI Settings")
        default_ai_provider_name = ai_settings.default_ai_provider

        ai_provider = frappe.get_doc("AI Provider", default_ai_provider_name)
        api_key = ai_provider.api_key

        response = get_ai_response(modified_query, "Natural Language", default_ai_provider_name, api_key)

    frappe.get_doc({
        "doctype": "AI Query",
        "query_text": user_query,
        "response_text": str(response), # Convert response to string for logging
        "query_type": "Natural Language" if not is_erp_command else command_type.replace("_", " ").title(),
        "user": current_user,
        "query_date": frappe.utils.now_datetime()
    }).insert(ignore_permissions=True)

    return response

@frappe.whitelist()
def quick_query(query_text):
    current_user = frappe.session.user
    user_roles = frappe.get_roles(current_user)

    modified_query = query_text
    if "Sales User" in user_roles:
        modified_query = f"{query_text} related to sales"
    elif "Accounts User" in user_roles:
        modified_query = f"{query_text} related to accounting"

    ai_settings = frappe.get_single("AI Settings")
    default_ai_provider_name = ai_settings.default_ai_provider

    ai_provider = frappe.get_doc("AI Provider", default_ai_provider_name)
    api_key = ai_provider.api_key

    response = get_ai_response(modified_query, "Natural Language", default_ai_provider_name, api_key)

    frappe.get_doc({
        "doctype": "AI Query",
        "query_text": query_text,
        "response_text": str(response), # Convert response to string for logging
        "query_type": "Quick Query",
        "user": current_user,
        "query_date": frappe.utils.now_datetime()
    }).insert(ignore_permissions=True)

    return response

@frappe.whitelist()
def generate_script_from_prompt(prompt, script_type):
    ai_settings = frappe.get_single("AI Settings")
    default_ai_provider_name = ai_settings.default_ai_provider

    ai_provider = frappe.get_doc("AI Provider", default_ai_provider_name)
    api_key = ai_provider.api_key

    generated_script = generate_script(prompt, script_type, default_ai_provider_name, api_key)

    return generated_script

@frappe.whitelist()
def upload_and_analyze_document(file_url, document_name, document_type, analysis_prompt=None):
    # Call the document_analysis module to handle the upload and analysis
    return doc_upload_document(file_url, document_name, document_type, analysis_prompt)

@frappe.whitelist()
def get_document_analysis_status(processor_id):
    return get_processing_status(processor_id)


