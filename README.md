# AI Agent Workshop

Learn how an AI assistant uses Python tools through the Model Context Protocol (MCP). You will connect a local server to Codex, manage tasks, and investigate simulated delivery delays.

The flow is: **your request → Codex chooses a tool → MCP calls a Python function → the result helps Codex decide what to do next**.

## What is in this project?

| File | Purpose |
| --- | --- |
| `server.py` | MCP server exposing five Python tools |
| `tasks.json` | Saved task descriptions; includes sample tasks |
| `data/orders.json` | Sample orders and the fixed demo date |
| `data/shipments.json` | Sample tracking information |
| `data/tickets.json` | Support tickets saved by the demo |
| `test_support.py` | Automated support workflow tests |
| [presentation/README.md](presentation/README.md) | Interactive presentation instructions |
| [DEMO.md](DEMO.md) | Turkish demo prompts and scenarios |
| [commands.md](commands.md) | Turkish workshop command reference |
| [HOMEWORK.md](HOMEWORK.md) | Assignments to complete after the workshop |

## Step 1: Prepare your computer

Use VS Code, Python 3.10 or newer, and an installed, signed-in Codex CLI or IDE setup. The connection commands below require the **Codex CLI**, even if you use the IDE extension for chatting.

Open this project folder in VS Code, then open a **PowerShell** terminal. All commands below run from the folder containing `server.py`.

```powershell
python --version
codex --version
Get-Location
```

If either command is missing, install or repair that prerequisite before continuing. For Codex setup, see the [official Codex CLI guide](https://developers.openai.com/codex/cli).

## Step 2: Create a Python environment

```powershell
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install "mcp[cli]<2"
.\.venv\Scripts\python.exe -c "from mcp.server.fastmcp import FastMCP; print('MCP ready')"
```

Expected output from the last command: `MCP ready`. This workshop uses the MCP 1.x `FastMCP` API. Commands use the environment's Python directly, so activation is unnecessary.

## Step 3: Correct the starter data path

The JSON files live in `data/`. The server currently names its path constant `DATA_FILE`, while the tests expect `DATA_DIR`; make them consistent before running the tests.

In `server.py`, replace:

```python
DATA_FILE = BASE_DIR / "data"
```

with:

```python
DATA_DIR = BASE_DIR / "data"
```

Then replace the other two occurrences of `DATA_FILE` with `DATA_DIR`: one in `read_data()` and one in `create_support_ticket()`. If an older copy points to `data/data`, correct that to `data` as well. Save the file. If your copy already uses `DATA_DIR` consistently and points to `data/`, skip this correction.

## Step 4: Run the existing tests

```powershell
.\.venv\Scripts\python.exe -m unittest test_support.py -v
```

After the correction, expect four passing tests and `OK`. They cover delayed orders, duplicate tickets, on-time orders, unknown orders, and blank summaries. The tests use temporary ticket storage so they do not change your demo tickets.

## Step 5: Check that the server starts

```powershell
.\.venv\Scripts\python.exe server.py
```

The process should wait for an MCP client. It is a **stdio server**, so it does not open a webpage or show a chat prompt. Press **Ctrl+C** to stop this manual check. Codex will launch its own server process after registration.

## Step 6: Connect the server to Codex

Run these commands from the project folder:

```powershell
$workshopPython = (Resolve-Path ".\.venv\Scripts\python.exe").Path
$workshopServer = (Resolve-Path ".\server.py").Path
codex mcp add task-manager -- "$workshopPython" "$workshopServer"
codex mcp get task-manager
```

Check that the configuration contains your environment's Python and this project's `server.py`. The registration uses absolute paths and is saved in your Codex configuration. See the [official MCP connection documentation](https://learn.chatgpt.com/docs/extend/mcp?surface=cli).

In VS Code, run **Ctrl+Shift+P → Developer: Reload Window**, then open a new Codex conversation. If you use the CLI, start a new `codex` session. Restart the client after later tool changes as well.

## Step 7: Try the task tools

Send this prompt to Codex:

> Use the task-manager MCP tools to add "Prepare the workshop demo" and list all tasks. Do not use the terminal or edit files directly.

Look for calls to `add_task` and `list_tasks`. Open `tasks.json` afterward to check that your task was saved alongside the existing sample tasks. Repeating the request adds another task; task deduplication is not implemented.

## Step 8: Try the order support workflow

Start with this instruction:

> Act as an order support assistant. Use only the task-manager MCP tools, not the terminal or direct file access. The data is simulated. Check the order first, then its shipment if the order exists. Create a support ticket only when I request one and the order is delayed. Explain that tickets are local demo records. Do not invent tracking details or claim to contact a real company.

Then try each scenario:

| Prompt | Expected result |
| --- | --- |
| Check order 1042 and its shipment. If delayed, create a support ticket. | `get_order`, `get_shipment`, then `create_support_ticket`; a local ticket is created or an existing open ticket is returned. |
| Repeat the same request for 1042. | The existing open ticket is returned without adding another. |
| Check order 1043. If delayed, create a support ticket. | The order is not delayed; no ticket is created. |
| Where is order 9999? | The order is not found; the assistant asks for a valid number. |

Inspect the tool calls and `data/tickets.json`, not just the assistant's reply. A new ticket has an ID such as `SUP-0001`; the exact ID depends on existing records.

Delay checks use **17 October 2026**, the fixed date in `data/orders.json`, rather than your computer's current date. Order 1042 is late; order 1043 is not. Creating a ticket writes a local file and does not contact a carrier or support team.

## Step 9: Explore the code and presentation

In `server.py`, identify `@mcp.tool()` above each exposed function. Read its parameters, docstring, return value, and any file writes. Notice that the server itself rejects tickets for orders that are not delayed, even if a model asks to create one.

Open `presentation/index.html` in a browser, or serve the presentation in another terminal:

```powershell
.\.venv\Scripts\python.exe -m http.server 8080 --bind 127.0.0.1 --directory presentation
```

Visit `http://localhost:8080`. Press **Ctrl+C** in that terminal when finished. The presentation uses local simulations; it does not call the live MCP server.

## Step 10: Complete the homework

Continue with [HOMEWORK.md](HOMEWORK.md). Complete the required assignments in order, record your results, and choose a bonus challenge if you have time.

## Troubleshooting

| Problem | What to check |
| --- | --- |
| `No module named mcp` | Install the package with `.\.venv\Scripts\python.exe -m pip` and use that same Python to run the server. |
| `server` has no attribute `DATA_DIR` | Complete Step 3; the tests and server must use the same constant. |
| File not found under `data/data` | Complete Step 3 and confirm all three JSON files exist in `data/`. |
| Codex cannot see the tools | Check `codex mcp get task-manager`, verify both absolute paths, and restart the client. |
| Server appears to do nothing | Waiting is normal for stdio. Send requests through the connected MCP client. |
| Invalid JSON error | Inspect the named JSON file for missing quotes, commas, or brackets; preserve any records you need. |
| A repeat demo does not create a ticket | An open ticket for that order already exists; returning it is intentional. |

This is a single-user learning project backed by local JSON files. It does not implement authentication or concurrent-write protection.
