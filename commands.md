# Workshop Commands

Run these commands in order in the **VS Code → PowerShell terminal**.

## 1. Create and open the project folder

```powershell
mkdir ai-agent-workshop
cd ai-agent-workshop
```

Skip this step if you have already opened the existing project folder.

## 2. Check Python and Codex

```powershell
python --version
codex --version
```

Check both commands with participants before the workshop. Installing the VS Code extension does not necessarily make the Codex terminal command available.

## 3. Create the Python environment and install MCP

```powershell
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install "mcp[cli]<2"
```

The version constraint matters: this example uses FastMCP from MCP 1.x.

## 4. Verify the installation

```powershell
.\.venv\Scripts\python.exe -c "from mcp.server.fastmcp import FastMCP; print('MCP ready')"
```

Next, we will write server.py together.

## 5. Start the server for a quick check

```powershell
.\.venv\Scripts\python.exe server.py
```

It is normal for the server to wait without displaying output. Stop it with **Ctrl+C**. After registration, Codex will start the server itself.

## 6. Connect the server to Codex

From the project folder:

```powershell
$pythonPath = (Resolve-Path ".\.venv\Scripts\python.exe").Path
$serverPath = (Resolve-Path ".\server.py").Path

codex mcp add task-manager -- "$pythonPath" "$serverPath"
```

This resolves the full paths on each participant's computer automatically.

## 7. Check the connection configuration

```powershell
codex mcp get task-manager
```

Run **Ctrl+Shift+P → Developer: Reload Window**, then open a new Codex conversation.

First demo prompt:

> Use the task-manager MCP tools to add “Prepare the workshop demo” and list all tasks. Do not use the terminal or edit files directly.

Demo prompt after adding the order tools:

> Use the task-manager MCP tools to check order 1042 and its shipment. If it is delayed, open a support ticket. Do not use the terminal or edit files directly.

## 8. Run the order scenario tests

Once the data/ files and test_support.py have been added to the project:

```powershell
.\.venv\Scripts\python.exe -m unittest test_support.py -v
```
