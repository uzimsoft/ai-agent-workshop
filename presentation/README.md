# From LLM to AI Agent

Story-driven, gamified intro for the Uzimsoft Academy workshop. Open `index.html` in a modern browser; no build, packages, API keys or internet connection required.

One analogy carries the whole deck: **a brilliant assistant who can’t use a computer**. Each level gives it a new ability:

| # | Level | Concept | Interaction | Time |
|---|-------|---------|-------------|------|
| 00 | Start | Evolution map | Rules, ability path | 1 min |
| 01 | The brain | LLM | Chat simulator (it can talk, not do) + quiz | 3 min |
| 02 | Give it hands | Tools | Equip the right tool, animated flow + quiz | 2 min |
| 03 | Give it a goal | AI agent | Order the agent’s steps, chatbot-vs-agent card sort | 3 min |
| 04 | The agent loop | Decide → Act → Observe | Step through a loop that hits an error, choose the recovery | 2 min |
| 05 | One plug: MCP | MCP | Toggle tangled cables vs one MCP hub, workshop architecture, role match | 3 min |
| 06 | Build our tool | Our MCP server | Live build checklist, server.py, copyable demo prompt | 2 min + live |
| 07 | Boss level | Order rescue | Three order cases, final score, order demo prompt | practice |

12 challenges award 10 XP each (120 XP). Completing a level unlocks an ability (🧠 🖐️ 🎯 🔁 🔌 🚀 🏆) with a toast and confetti; the sidebar robot levels up and grows arms once it has tools. Wrong answers give hints and unlimited retries. Reloading or **Reset practice** clears progress.

## Presenting

- ← → or the sidebar to navigate; hashes `#0` to `#7` link to levels.
- **N** (or the 🎤 button) toggles Turkish speaker notes with the narration for each level; **Esc** closes them.
- Ask the room to vote A/B/C before clicking. No timer or penalty.

Optional local server from the workshop-test folder:

```powershell
.\.venv\Scripts\python.exe -m http.server 8080 --bind 127.0.0.1 --directory presentation
```

## Files

- `app.js`: levels, speaker notes, challenges, scoring, abilities and simulations.
- `story.css`: flow diagrams, mini-games, HUD, toasts, notes panel.
- `styles.css`, `brand.css`: base layout and Uzimsoft Academy theme.
- `companion.js`: animated robot; click to pause. Respects reduced-motion preferences.

All interactions are deterministic local simulations, not live model or MCP calls. The scenario date is fixed at 17 October 2026. The page never reads or modifies the task or support JSON files; the separate live Python demo does.
