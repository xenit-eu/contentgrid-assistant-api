from langchain_core.tools import tool
from typing import Optional

@tool("create_order")
def create_order(customer_name: str, product: str, quantity: int):
    """Creates a new order for a customer with specified product and quantity"""
    order_id = f"ORD-{hash(f'{customer_name}{product}') % 10000:04d}"
    return f"Order {order_id} created successfully for {customer_name}: {quantity}x {product}"

@tool("check_order_status")
def check_order_status(order_id: str):
    """Checks the current status of an order by order ID"""
    # Mock implementation - in real scenario, this would query a database
    statuses = ["pending", "processing", "shipped", "delivered"]
    status = statuses[hash(order_id) % len(statuses)]
    return f"Order {order_id} status: {status}"

@tool("update_order")
def update_order(order_id: str, quantity: Optional[int] = None, product: Optional[str] = None):
    """Updates an existing order's quantity or product"""
    updates = []
    if quantity:
        updates.append(f"quantity to {quantity}")
    if product:
        updates.append(f"product to {product}")
    
    if not updates:
        return f"No updates provided for order {order_id}"
    
    return f"Order {order_id} updated: {', '.join(updates)}"

@tool("cancel_order")
def cancel_order(order_id: str):
    """Cancels an existing order"""
    return f"Order {order_id} has been cancelled successfully"

tools = [create_order, check_order_status, update_order, cancel_order]
