import frappe
from ai_assistant.ontime_ai_assistant.api.ai_service import get_ai_response, generate_script
from ai_assistant.ontime_ai_assistant.api.frappe_command_executor import execute_frappe_command
from ai_assistant.ontime_ai_assistant.api.document_analysis import upload_document as doc_upload_document, get_processing_status
from ai_assistant.ontime_ai_assistant.api.erp_knowledge_base import get_erp_explanation, get_erp_steps

# Import spaCy for NLP
import spacy
import re

# Load English and Arabic models (ensure these are downloaded on the Frappe server)
try:
    nlp_en = spacy.load("en_core_web_sm")
except OSError:
    frappe.log_error("English spaCy model not found. Please run: python3 -m spacy download en_core_web_sm", "NLP Model Error")
try:
    nlp_ar = spacy.load("ar_core_news_sm")
except OSError:
    frappe.log_error("Arabic spaCy model not found. Please run: python3 -m spacy download ar_core_news_sm", "NLP Model Error")

@frappe.whitelist()
def get_chat_response(user_query):
    try:
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

        # Determine language and process with appropriate NLP model
        # Simple heuristic: check for common Arabic words
        if any(char >= '\u0600' and char <= '\u06FF' for char in user_query):
            doc = nlp_ar(user_query) if 'nlp_ar' in locals() else None
            lang = 'ar'
        else:
            doc = nlp_en(user_query) if 'nlp_en' in locals() else None
            lang = 'en'

        # --- Refined ERP Command Parsing using NLP and Regex ---

        # Intent: Create Record
        if "create" in lower_query or "أنشئ" in lower_query:
            if "item group" in lower_query or "مجموعة أصناف" in lower_query:
                command_type = "create"
                doctype_name = "Item Group"
                # Extract item group name more robustly
                match = re.search(r"(?:for|باسم|بخصوص)\s+([\w\s]+)", user_query, re.IGNORECASE)
                if match:
                    item_group_name = match.group(1).strip().title()
                    data = {"item_group_name": item_group_name, "is_group": 1}
                is_erp_command = True
            elif "customer" in lower_query or "عميل" in lower_query:
                command_type = "create"
                doctype_name = "Customer"
                customer_name = ""
                if lang == 'ar':
                    match = re.search(r"باسم\s+([\w\s]+)", user_query)
                    if match: customer_name = match.group(1).strip()
                else:
                    match = re.search(r"named\s+([\w\s]+)", user_query)
                    if match: customer_name = match.group(1).strip()
                if customer_name: data = {"customer_name": customer_name.title()}
                is_erp_command = True
            elif "sales order" in lower_query or "أمر بيع" in lower_query:
                command_type = "create"
                doctype_name = "Sales Order"
                customer_name = ""
                if lang == 'ar':
                    match = re.search(r"لـ\s+([\w\s]+)", user_query)
                    if match: customer_name = match.group(1).strip()
                else:
                    match = re.search(r"for\s+([\w\s]+)", user_query)
                    if match: customer_name = match.group(1).strip()
                if customer_name: data = {"customer": customer_name.title(), "naming_series": "SO-"}
                response_message = "Sales Order creation initiated. Please provide more details like items and quantities."
                is_erp_command = True

        # Intent: Read Data
        elif "show me" in lower_query or "اعرض لي" in lower_query:
            if "overdue invoices" in lower_query or "فواتير متأخرة" in lower_query:
                command_type = "read"
                doctype_name = "Sales Invoice"
                filters = {"due_date": ["<=", frappe.utils.today()], "outstanding_amount": [">", 0]}
                if "for april" in lower_query or "لشهر أبريل" in lower_query:
                    filters["posting_date"] = [">=", "2025-04-01"], ["<=", "2025-04-30"]
                is_erp_command = True
            elif "quotations for client" in lower_query or "عروض أسعار للعميل" in lower_query:
                command_type = "read"
                doctype_name = "Quotation"
                client_name = ""
                if lang == 'ar':
                    match = re.search(r"للعميل\s+([\w\s]+)", user_query)
                    if match: client_name = match.group(1).strip()
                else:
                    match = re.search(r"for client\s+([\w\s]+)", user_query)
                    if match: client_name = match.group(1).strip()
                if client_name: filters = {"customer_name": client_name.title()}
                is_erp_command = True
            elif "sales invoices today" in lower_query or "فواتير البيع اليوم" in lower_query:
                command_type = "read"
                doctype_name = "Sales Invoice"
                filters = {"posting_date": frappe.utils.today()}
                fields = ["count(name) as total_invoices"]
                is_erp_command = True

        # File Understanding
        elif "analyze" in lower_query or "تحليل" in lower_query:
            if any(ext in lower_query for ext in ["excel", "pdf", "word", "image"]):
                command_type = "analyze_document"
                response_message = "Please upload the file for analysis. File analysis functionality is under development."
                is_erp_command = True
        elif "upload" in lower_query or "رفع" in lower_query:
            if any(ext in lower_query for ext in ["pdf", "word", "excel", "image"]):
                command_type = "upload_document"
                response_message = "Please upload the file. File upload functionality is under development."
                is_erp_command = True

        # Intent: Navigate
        elif "go to" in lower_query or "افتح" in lower_query:
            if "customer list" in lower_query or "قائمة العملاء" in lower_query:
                response_message = {"status": "navigate", "path": "/app/customer", "message": "Opening Customer List."} # Frontend will interpret this
                is_erp_command = True
            elif "item group settings" in lower_query or "إعدادات مجموعة الأصناف" in lower_query:
                response_message = {"status": "navigate", "path": "/app/item-group", "message": "Opening Item Group settings."} # Frontend will interpret this
                is_erp_command = True

        # Intent: ERP Training and Term Explanation
        elif "what is" in lower_query or "ما هو" in lower_query or "define" in lower_query or "ما معنى" in lower_query:
            term = user_query.replace("what is", "").replace("ما هو", "").replace("define", "").replace("ما معنى", "").strip()
            ai_settings = frappe.get_single("AI Settings")
            default_ai_provider_name = ai_settings.default_ai_provider
            ai_provider = frappe.get_doc("AI Provider", default_ai_provider_name)
            api_key = ai_provider.api_key
            response = get_erp_explanation(term, user_roles, default_ai_provider_name, api_key)
            is_erp_command = True # Treat as ERP command for logging, but it\'s an AI response

        elif "how to" in lower_query or "steps for" in lower_query or "كيف" in lower_query or "خطوات" in lower_query:
            process = user_query.replace("how to", "").replace("steps for", "").replace("كيف", "").replace("خطوات", "").strip()
            ai_settings = frappe.get_single("AI Settings")
            default_ai_provider_name = ai_settings.default_ai_provider
            ai_provider = frappe.get_doc("AI Provider", default_ai_provider_name)
            api_key = ai_provider.api_key
            response = get_erp_steps(process, user_roles, default_ai_provider_name, api_key)
            is_erp_command = True # Treat as ERP command for logging, but it\'s an AI response

        # Intent: Generate Script (New Logic)
        elif "generate script" in lower_query or "إنشاء سكريبت" in lower_query:
            command_type = "generate_script"
            script_type = ""
            prompt = user_query

            # Extract script type (e.g., Client Script, Server Script)
            if "client script" in lower_query or "سكريبت عميل" in lower_query:
                script_type = "Client Script"
            elif "server script" in lower_query or "سكريبت خادم" in lower_query:
                script_type = "Server Script"
            else:
                script_type = "Python Script" # Default or ask for clarification
            
            # Extract prompt for script generation
            # This needs more advanced NLP to get the exact prompt
            # For now, we\'ll use the whole query as prompt, or refine later
            
            ai_settings = frappe.get_single("AI Settings")
            default_ai_provider_name = ai_settings.default_ai_provider
            ai_provider = frappe.get_doc("AI Provider", default_ai_provider_name)
            api_key = ai_provider.api_key
            
            response = generate_script(prompt, script_type, default_ai_provider_name, api_key)
            is_erp_command = True

        # --- Execute Command or Get AI Response ---
        if is_erp_command:
            if response_message:
                response = response_message
            elif command_type in ["what is", "how to", "generate_script"]: # These are handled by erp_knowledge_base or generate_script
                pass # Response is already generated above
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

    except Exception as e:
        frappe.log_error(f"Error in get_chat_response: {e}", "AI Chat Error")
        frappe.response["type"] = "json"
        frappe.response["http_status_code"] = 500
        return {"status": "error", "message": str(e)}

@frappe.whitelist()
def quick_query(query_text):
    try:
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
    except Exception as e:
        frappe.log_error(f"Error in quick_query: {e}", "AI Quick Query Error")
        frappe.response["type"] = "json"
        frappe.response["http_status_code"] = 500
        return {"status": "error", "message": str(e)}

@frappe.whitelist()
def generate_script_from_prompt(prompt, script_type):
    try:
        ai_settings = frappe.get_single("AI Settings")
        default_ai_provider_name = ai_settings.default_ai_provider

        ai_provider = frappe.get_doc("AI Provider", default_ai_provider_name)
        api_key = ai_provider.api_key

        generated_script = generate_script(prompt, script_type, default_ai_provider_name, api_key)

        return generated_script
    except Exception as e:
        frappe.log_error(f"Error in generate_script_from_prompt: {e}", "AI Script Generation Error")
        frappe.response["type"] = "json"
        frappe.response["http_status_code"] = 500
        return {"status": "error", "message": str(e)}

@frappe.whitelist()
def upload_and_analyze_document(file_url, document_name, document_type, analysis_prompt=None):
    try:
        # Call the document_analysis module to handle the upload and analysis
        return doc_upload_document(file_url, document_name, document_type, analysis_prompt)
    except Exception as e:
        frappe.log_error(f"Error in upload_and_analyze_document: {e}", "AI Document Analysis Error")
        frappe.response["type"] = "json"
        frappe.response["http_status_code"] = 500
        return {"status": "error", "message": str(e)}

@frappe.whitelist()
def get_document_analysis_status(processor_id):
    try:
        return get_processing_status(processor_id)
    except Exception as e:
        frappe.log_error(f"Error in get_document_analysis_status: {e}", "AI Document Status Error")
        frappe.response["type"] = "json"
        frappe.response["http_status_code"] = 500
        return {"status": "error", "message": str(e)}



