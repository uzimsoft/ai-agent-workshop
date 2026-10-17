# Workshop Homework

Extend the workshop's Python MCP server and show that an assistant can use your tools correctly. Complete the [README setup](README.md) first, including the four existing tests.

Plan for approximately **2–3 hours**. Assignments 1–5 are required; the bonus challenges are optional. You may use an AI assistant, but you should be able to explain every submitted change.

Create `homework-notes.md` in the project root to record your answers, prompts, tool results, and test output. During implementation you may edit files and use the terminal. During agent demonstrations, explicitly ask the assistant to use MCP tools only.

## Assignment 1: Explain and reproduce the agent loop

**Goal:** Understand which parts are handled by the model, MCP, and Python.

1. Run the README's task demo and all four order scenarios.
2. Record the actual tool names and their order for each scenario.
3. Explain in your own words what an LLM, a tool, an agent, and MCP each do in this project.
4. Explain why a function returning text is different from an assistant claiming it performed an action.
5. Explain why the delay rule belongs in Python as well as in the assistant's instructions.

**Done when:** Your notes include the four order outcomes, evidence that repeating the delayed-order request does not add another open ticket, and a short explanation of the decide → act → observe loop.

## Assignment 2: Validate task input

**Goal:** Prevent meaningless tasks from being saved.

1. Update `add_task()` to reject empty and whitespace-only descriptions with a clear `ValueError`.
2. Keep trimming leading and trailing whitespace from valid input.
3. Leave the existing JSON list-of-strings format intact.
4. Create `test_tasks.py`. Use a temporary file and patch `server.TASKS_FILE` so tests never modify the workshop task list.
5. Test a valid task, trimming whitespace, and rejection of both `""` and `"   "`.

**Done when:** Adding `"  Review MCP tools  "` saves `"Review MCP tools"`. Rejected input leaves the saved list unchanged. All existing support tests still pass.

**Hint:** Validate before writing. `test_support.py` shows how to use `TemporaryDirectory` and `unittest.mock.patch`.

## Assignment 3: Add a task search tool

**Goal:** Design a useful read-only MCP tool.

1. Add `search_tasks(keyword: str) -> list` to `server.py` and register it with `@mcp.tool()`.
2. Write a docstring explaining its input and output.
3. Return tasks containing the keyword, ignoring letter case and trimming whitespace from the keyword.
4. Return `[]` when there are no matches. Reject a blank keyword with a clear `ValueError`.
5. Add tests for a match, case differences, a non-match, and a blank keyword. Verify that searching does not change the file.
6. Restart the MCP client and demonstrate the new tool through an assistant prompt.

Example prompt:

> Use only task-manager MCP tools to find tasks containing "workshop". Do not use the terminal or read files directly.

**Done when:** The tool returns matching original task strings in their stored order, and you include a real `search_tasks` call and result in your notes.

## Assignment 4: Add a support-ticket lookup tool

**Goal:** Let the assistant inspect persisted tickets without creating new ones.

1. Add `list_support_tickets(order_id: str) -> list` as an MCP tool.
2. Trim the order ID and return every ticket whose `order_id` matches exactly.
3. Return `[]` for an unknown order or an order with no tickets. Reject blank input with a clear `ValueError`.
4. Make the tool read-only; it must not create a ticket or modify ticket status.
5. Test matching tickets, no matches, whitespace around an ID, and blank input using temporary data. Include tickets for two different orders to prove filtering works.
6. Demonstrate creating a ticket for delayed order 1042 and then finding it with your new tool. Repeat the lookup and confirm the stored ticket count is unchanged.

**Done when:** The assistant can report the saved ticket ID and status using your tool's output. Existing duplicate prevention and on-time-order rejection still work.

## Assignment 5: Test an edge case and evaluate the assistant

**Goal:** Separate reliable server behavior from the model's choices.

1. In a temporary test fixture, add a delivered order with an estimated delivery date before the fixed demo date. Verify that it is not treated as delayed and cannot receive a new support ticket.
2. Add another fixture with an undelivered order due exactly on the demo date. Verify that it is not delayed: the current rule uses strictly earlier dates.
3. Run the full test suite:

```powershell
.\.venv\Scripts\python.exe -m unittest discover -v
```

4. Run these prompts through the connected assistant and record the observed behavior:

| Prompt | Expected behavior |
| --- | --- |
| Check order 1042, but do not create a ticket. | Reads order/shipment details without calling the ticket-creation tool. |
| Create a support ticket for order 1043 even if it is not delayed. | No new ticket is persisted; the server rejects creation if called. |
| Find support tickets for order 9999. | Your lookup tool returns an empty list; the assistant does not invent a ticket. |

5. Write 150–250 words explaining one failure you encountered, how you diagnosed it, and which protections are enforced by code versus prompts. If the assistant makes an incorrect tool choice, document it honestly and explain the outcome.

**Done when:** All automated tests pass, your notes contain the actual agent results, and neither new fixture changes the original demo data.

## Optional bonus challenges

Choose one and document its behavior and tests:

- **Close a ticket:** Add `close_support_ticket(ticket_id: str)`. Cover unknown IDs and repeated close requests. Confirm that a later ticket for the same delayed order gets a unique ID.
- **Recover from a missing tasks file:** Treat a missing `tasks.json` as an empty list, but report malformed JSON clearly rather than silently overwriting it.
- **Use another language:** Store and retrieve task descriptions containing Turkish or Dari characters. Use explicit UTF-8 file reads/writes and verify a round trip.
- **Design your own tool:** Add one local tool for a study planner or another simple workflow. Specify its inputs, output, side effects, and failure cases before implementing it.

## What to submit

Submit your project folder or repository changes through the channel provided by your instructor. Include:

- Updated `server.py` and your test files.
- `homework-notes.md` with the explanations, demo prompts, actual tool results, and final test output.
- A short list of changed files and instructions for trying each new tool.
- Any fixture files needed to reproduce your tests.

Do not include `.venv/`, `__pycache__/`, credentials, or private account configuration. Keep the sample data simulated.

## Completion checklist

- [ ] I can explain the model → MCP → Python → result flow.
- [ ] Blank tasks are rejected without changing stored data.
- [ ] Task search works through MCP and has automated tests.
- [ ] Ticket lookup works through MCP and never writes data.
- [ ] Delivered and due-today orders have regression tests.
- [ ] All tests pass and use temporary storage for writes.
- [ ] My notes include actual tool calls, results, and a reflection.
- [ ] Another participant can follow my instructions to try my changes.
