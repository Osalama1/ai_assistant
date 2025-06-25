import frappe
import frappe.utils

def check_permission(doctype, permtype, user):
    if not frappe.has_permission(doctype, permtype=permtype, user=user):
        frappe.throw(f"You do not have permission to {permtype} {doctype}")

def execute_frappe_command(command_type, doctype_name, data=None, filters=None, user=None):
    if data is None:
        data = {}
    if filters is None:
        filters = {}

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
                records = frappe.get_list(doctype_name, filters=filters, fields=["*"])
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
            return {"status": "success", "message": f"{doctype_name} {filters['name']} deleted successfully."}

        elif command_type == "report":
            check_permission(doctype_name, "read", user)
            # For now, simple get_list for reports. More complex reporting can be added later.
            records = frappe.get_list(doctype_name, filters=filters, fields=["*"])
            return {"status": "success", "data": records}

        else:
            frappe.throw(f"Unknown command type: {command_type}")

    except frappe.exceptions.PermissionError as e:
        return {"status": "error", "message": str(e)}
    except Exception as e:
        frappe.log_error(frappe.get_traceback(), "Frappe Command Execution Error")
        return {"status": "error", "message": f"An error occurred: {str(e)}"}


