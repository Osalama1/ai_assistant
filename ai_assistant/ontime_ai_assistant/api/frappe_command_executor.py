import frappe
import frappe.utils
import json

def check_permission(doctype, permtype, user):
    if not frappe.has_permission(doctype, permtype=permtype, user=user):
        frappe.throw(f"You do not have permission to {permtype} {doctype}")

def execute_frappe_command(command_type, doctype_name, data=None, filters=None, user=None, fields=None, group_by=None, order_by=None, limit_start=0, limit_page_length=20):
    if data is None:
        data = {}
    if filters is None:
        filters = {}
    if fields is None:
        fields = ["*"]

    try:
        if command_type == "create":
            check_permission(doctype_name, "create", user)
            doc = frappe.new_doc(doctype_name)
            for field, value in data.items():
                setattr(doc, field, value)
            doc.insert()
            frappe.db.commit()
            return {"status": "success", "message": f"{doctype_name} {doc.name} created successfully.", "name": doc.name}

        elif command_type == "read":
            check_permission(doctype_name, "read", user)
            if "name" in filters:
                doc = frappe.get_doc(doctype_name, filters["name"])
                return {"status": "success", "data": doc.as_dict()}
            else:
                records = frappe.get_list(doctype_name, filters=filters, fields=fields, group_by=group_by, order_by=order_by, limit_start=limit_start, limit_page_length=limit_page_length)
                return {"status": "success", "data": records}

        elif command_type == "update":
            check_permission(doctype_name, "write", user)
            if "name" not in filters:
                frappe.throw("Name filter is required for update operation.")
            doc = frappe.get_doc(doctype_name, filters["name"])
            for field, value in data.items():
                setattr(doc, field, value)
            doc.save()
            frappe.db.commit()
            return {"status": "success", "message": f"{doctype_name} {doc.name} updated successfully.", "name": doc.name}

        elif command_type == "delete":
            check_permission(doctype_name, "delete", user)
            if "name" not in filters:
                frappe.throw("Name filter is required for delete operation.")
            frappe.delete_doc(doctype_name, filters["name"])
            frappe.db.commit()
            return {"status": "success", "message": f"{doctype_name} {filters["name"]} deleted successfully."}

        elif command_type == "report":
            check_permission(doctype_name, "read", user)
            # This can be extended to call specific Frappe reports or generate aggregated data
            records = frappe.get_list(doctype_name, filters=filters, fields=fields, group_by=group_by, order_by=order_by, limit_start=limit_start, limit_page_length=limit_page_length)
            
            # Basic summarization for reports
            summary = f"Found {len(records)} records for {doctype_name}."
            if records and group_by:
                summary += f" Grouped by {group_by}."
            
            return {"status": "success", "data": records, "summary": summary}

        elif command_type == "create_doctype":
            check_permission("DocType", "create", user)
            # data should contain doctype definition as a dictionary
            doc = frappe.get_doc(data)
            doc.insert()
            frappe.db.commit()
            return {"status": "success", "message": f"DocType {doc.name} created successfully."}

        elif command_type == "create_custom_field":
            check_permission("Custom Field", "create", user)
            # data should contain custom field definition as a dictionary
            doc = frappe.get_doc(data)
            doc.insert()
            frappe.db.commit()
            return {"status": "success", "message": f"Custom Field {doc.name} created successfully."}

        elif command_type == "run_report":
            # This will execute a Frappe Report (not just get_list)
            # Requires report_name and filters/filters_json
            check_permission("Report", "read", user)
            report_name = doctype_name # In this case, doctype_name is actually the report name
            
            # Frappe.get_report_doc and frappe.run_report can be used here
            # For simplicity, let's assume a generic report runner for now
            # More specific implementation for each report type can be added later
            
            # Example: frappe.get_list for a report-like output
            records = frappe.get_list(report_name, filters=filters, fields=fields)
            return {"status": "success", "data": records, "message": f"Report {report_name} executed successfully."}

        else:
            frappe.throw(f"Unknown command type: {command_type}")

    except frappe.exceptions.PermissionError as e:
        return {"status": "error", "message": str(e)}
    except Exception as e:
        frappe.log_error(frappe.get_traceback(), "Frappe Command Execution Error")
        return {"status": "error", "message": f"An error occurred: {str(e)}"}


