# Order Support Assistant Rehearsal

The existing task-manager MCP registration uses the same server.py file. You do not need another server registration.
After saving the file, run **Developer: Reload Window** in VS Code and open a new Codex conversation.

## Demo boundaries

The order and shipment data is simulated. Calculations use the fixed demo date of **17 October 2026**, so scenarios remain consistent in future rehearsals. This is not the actual current date.
Support tickets are written to data/tickets.json; they are not sent to a company or carrier.
This is a learning example for one local server and one user. Production use would require authentication and a database.

## Start each new conversation with this instruction

> You are an order support assistant. Use only the task-manager MCP tools; do not use the terminal or read or write files directly. The order and shipment data is simulated, and the demo date is 17 October 2026. Check the order first, then look up its shipment if the order exists. Create a support ticket only if the user requests one and the order is delayed. If the order is not found, ask for the correct number. Do not invent information that is absent from the tool output. Explain that the support ticket is a local demo record. If you cannot access the tools, say so.

## Scenarios

1. “Order 1042 has not arrived. Check it and create a support ticket if it is delayed.”
   Expected: get_order → get_shipment → create_support_ticket. The first ticket is SUP-0001 when ticket storage is empty.
2. Repeat the same request. Expected: return the existing open ticket instead of creating another one.
3. “Check order 1043 and create a support ticket if it is delayed.”
   Expected: check the order and shipment; there is no delay, so no ticket is created.
4. “Where is order 9999?”
   Expected: explain that the order was not found, ask for the correct number, and do not create a ticket.

Show the tool calls as well as the answer. Then open data/tickets.json to show the persisted result.

## Talking points

Python functions retrieve data and perform actions. MCP offers those tools to Codex.
Codex uses the request and tool results to choose the next tool.
The server also enforces the delay rule: even if the model selects the wrong tool, it cannot create a delay ticket for an on-time order.

## Verification

```powershell
.\.venv\Scripts\python.exe -m unittest test_support.py -v
```

The tests use a temporary folder and do not modify the actual demo tickets.
After the first successful rehearsal, freeze the dependencies:

```powershell
.\.venv\Scripts\python.exe -m pip freeze > requirements.txt
```
