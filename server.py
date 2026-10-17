import json
from pathlib import Path

from mcp.server.fastmcp import FastMCP

mcp = FastMCP("Task manager")

BASE_DIR = Path(__file__).resolve().parent
TASKS_FILE = BASE_DIR / "tasks.json"
DATA_FILE = BASE_DIR / "data"


def read_data(filename: str):
    """
    Read data from a JSON file in the data directory.
    """
    return json.loads((DATA_FILE / filename).read_text())

def read_tasks():
    """
    Read tasks from the tasks.json file.
    """
    return json.loads(TASKS_FILE.read_text())

@mcp.tool()
def add_task(task: str) -> str:
    """
    Add a new task to the tasks.json file.
    """
    task = task.strip()

    tasks = read_tasks()
    tasks.append(task)
    TASKS_FILE.write_text(json.dumps(tasks))
    return f"Task added: {task}"


@mcp.tool()
def list_tasks() -> list:
    """
    List all tasks from the tasks.json file.
    """
    return read_tasks()



@mcp.tool()
def get_order(order_id: str) -> dict:
    """Look up an order and its delay status. Return found=false if not found.

    The data is simulated; delivery dates are compared with the fixed demo date.
    order_id is the order number supplied by the user.
    """
    data = read_data("orders.json")
    order = next((item for item in data["orders"] if item["order_id"] == order_id.strip()), None)
    if order is None:
        return {"found": False, "order_id": order_id, "message": "Order not found. Please check the order number."}
    return {
        "found": True,
        **order,
        "demo_date": data["demo_date"],
        "is_delayed": order["status"] != "delivered" and order["estimated_delivery"] < data["demo_date"],
    }


@mcp.tool()
def create_support_ticket(order_id: str, summary: str) -> dict:
    """Create a local ticket for a delayed order when the user requests support.

    First check the details using get_order and get_shipment.
    order_id identifies the order; summary should briefly describe the observed issue.
    This tool does not send a message to a real company.
    If the order already has an open ticket, return it instead of creating a duplicate.
    """
    if not summary.strip():
        raise ValueError("Support ticket summary cannot be empty.")
    order = get_order(order_id)
    if not order["found"]:
        return {"created": False, "reason": "order_not_found", "message": order["message"]}
    if not order["is_delayed"]:
        return {"created": False, "reason": "not_delayed", "message": "This demo only creates tickets for delayed orders."}
    tickets = read_data("tickets.json")
    existing = next((item for item in tickets if item["order_id"] == order["order_id"] and item["status"] == "open"), None)
    if existing:
        return {"created": False, "reason": "already_exists", "ticket": existing}
    ticket = {
        "ticket_id": f"SUP-{len(tickets) + 1:04d}",
        "order_id": order["order_id"],
        "summary": summary.strip(),
        "status": "open",
        "demo_date": order["demo_date"],
    }
    tickets.append(ticket)
    target = DATA_FILE / "tickets.json"
    temporary = target.with_suffix(".tmp")
    temporary.write_text(json.dumps(tickets, ensure_ascii=False, indent=2), encoding="utf-8")
    temporary.replace(target)
    return {"created": True, "ticket": ticket, "message": "Local demo support ticket created."}


@mcp.tool()
def get_shipment(order_id: str) -> dict:
    """Return the simulated shipment status and latest tracking event for an order.

    order_id is the order number. Return found=false if no shipment is found.
    """
    shipment = next((item for item in read_data("shipments.json") if item["order_id"] == order_id.strip()), None)
    if shipment is None:
        return {"found": False, "order_id": order_id, "message": "Shipment record not found."}
    return {"found": True, **shipment}




if __name__ == "__main__":
    mcp.run(transport="stdio")