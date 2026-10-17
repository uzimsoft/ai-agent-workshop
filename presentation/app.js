'use strict';
// Story-driven, gamified intro: one assistant levels up from LLM to an agent using our own MCP tools.
// Everything here is a deterministic local simulation. No model, MCP or file calls happen in the browser.

const $ = id => document.getElementById(id);
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const XP = 10;

/* ---------- Content ---------- */

const quiz = {
  llm: {prompt: 'What can our assistant do on its own?', choices: ['Explain how to create a file', 'Create the file on your computer', 'Send the email for you'], answer: 0, hint: 'Think: talking versus doing.', why: 'An LLM understands and generates language. Without tools it cannot act in the outside world.'},
  whodecides: {prompt: 'Who chooses which tool to use, and when?', choices: ['You, every single time', 'The LLM, from your request and the tool descriptions', 'The tool decides by itself'], answer: 1, hint: 'Tools wait to be called. Who reads the request?', why: 'The model reads the request and the descriptions of the available tools, then decides which one to call.'},
  loop: {prompt: 'The agent just hit an error. What should it decide next?', choices: ['Stop. The task failed.', 'Read the error, create the folder, then try again', 'Tell the user it worked'], answer: 1, hint: 'The error is new information. Use what you observed.', why: 'The agent observes the result, adjusts its plan and tries a different approach.'},
  mcp: {prompt: 'So what is MCP?', choices: ['A smarter AI model', 'A standard way to offer tools and data to AI apps', 'A database that stores our tasks'], answer: 1, hint: 'Remember the phone charger.', why: 'MCP is a protocol, not a model. It is the shared plug between agents and tools.'},
  delayed: {label: '1042', trace: 'get_order("1042")    → found: true, is_delayed: true\nget_shipment("1042") → waiting at transfer center', prompt: 'The order is delayed and the customer asked for a ticket. Your move?', choices: ['Create the requested support ticket', 'Promise delivery tomorrow', 'Say the order was not found'], answer: 0, hint: 'Use the returned facts and the customer’s request.', why: 'create_support_ticket(...) → SUP-0001 (example). Report the known facts and the local ticket number. Never invent a delivery date.'},
  ontime: {label: '1043', trace: 'get_order("1043")    → found: true, is_delayed: false\nget_shipment("1043") → in transit', prompt: 'The order is on time. Your move?', choices: ['Create a delay ticket anyway', 'Explain the shipment status; no ticket', 'Say it has been delivered'], answer: 1, hint: 'Is the delay condition met?', why: 'No delay, so no ticket. Share the shipment status returned by the tool.'},
  missing: {label: '9999', trace: 'get_order("9999") → found: false', prompt: 'No matching order. Your move?', choices: ['Guess the shipment status', 'Create a ticket for 9999', 'Ask the customer to check the number'], answer: 2, hint: 'We need a valid order before going further.', why: 'Ask for the correct order number. There is nothing to look up or ticket yet.'}
};
const cases = ['delayed', 'ontime', 'missing'];

const abilities = [
  {id: 'brain', icon: '🧠', name: 'Brain', concept: 'LLM', ids: ['llm']},
  {id: 'hands', icon: '🖐️', name: 'Hands', concept: 'Tools', ids: ['toolpick', 'whodecides']},
  {id: 'goal', icon: '🎯', name: 'Goal', concept: 'AI agent', ids: ['order', 'sort']},
  {id: 'reflex', icon: '🔁', name: 'Reflex', concept: 'Agent loop', ids: ['loop']},
  {id: 'plug', icon: '🔌', name: 'Plug', concept: 'MCP', ids: ['mcp', 'roles']},
  {id: 'builder', icon: '🚀', name: 'Builder', concept: 'Our own tool', ids: ['build']},
  {id: 'rescuer', icon: '🏆', name: 'Rescuer', concept: 'Boss level', ids: cases}
];
const allIds = abilities.flatMap(a => a.ids);
const maxXp = allIds.length * XP;

const chatPrompts = [
  {q: 'Explain how to create a file in Python.', a: 'Sure! Open the file in write mode and write some text:', code: 'with open("notes.txt", "w") as f:\n    f.write("Hello workshop!")'},
  {q: 'Great. Now create notes.txt on my computer.', a: 'I can write the code, but I can’t run it. I have no access to your computer.', blocked: true},
  {q: 'Email this to my team.', a: 'I can draft the email, but I can’t send it. I can’t reach your inbox.', blocked: true}
];

const belt = [
  {id: 'calc', icon: '🧮', name: 'calculator()', desc: 'Does maths', miss: 'A calculator can do maths, but it can’t save a task.'},
  {id: 'read', icon: '📄', name: 'read_file()', desc: 'Reads a file', miss: 'Reading a file won’t add anything to the list.'},
  {id: 'add', icon: '✅', name: 'add_task()', desc: 'Saves a task'}
];

const agentSteps = ['Understand the request', 'Work out the tasks', 'Call add_task() for each one', 'Check that it worked'];
const stepDeck = [2, 0, 3, 1];

const sortCards = [
  {t: 'Answers “How do I add a task?”', a: 'chat'},
  {t: 'Calls the add-task tool itself', a: 'agent'},
  {t: 'Suggests a plan', a: 'chat'},
  {t: 'Breaks the plan into steps and runs them', a: 'agent'},
  {t: 'Mostly answer-focused', a: 'chat'},
  {t: 'Goal- and action-focused', a: 'agent'}
];

const loopNodes = ['Decide', 'Act', 'Observe'];
const loopA = [
  {n: 0, t: 'I’ll create docs/workshop-notes.md.'},
  {n: 1, t: 'create_file("docs/workshop-notes.md")', code: true},
  {n: 2, t: 'Error: folder "docs" does not exist.', bad: true}
];
const loopB = [
  {n: 0, t: 'The folder is missing. Create it first.'},
  {n: 1, t: 'create_folder("docs")', code: true},
  {n: 2, t: 'Folder created.', good: true},
  {n: 0, t: 'Now retry the original step.'},
  {n: 1, t: 'create_file("docs/workshop-notes.md")', code: true},
  {n: 2, t: 'File created. Goal reached 🎯', good: true}
];

const roles = [{who: 'Codex', icon: '🤖', a: 0}, {who: 'MCP server', icon: '🔌', a: 1}, {who: 'Tools', icon: '🛠️', a: 2}];
const roleOptions = ['Chooses which tool to call', 'Offers our tools to Codex', 'Actually add and list tasks'];

const buildSteps = [
  {t: 'Set up Python and the MCP package', code: 'python -m venv .venv\n.\\.venv\\Scripts\\python.exe -m pip install "mcp[cli]&lt;2"'},
  {t: 'Write server.py with add_task and list_tasks', code: 'See the code on the right →'},
  {t: 'Connect the server to Codex', code: 'codex mcp add task-manager -- "$pythonPath" "$serverPath"'},
  {t: 'Reload VS Code and open a new Codex chat', code: 'Ctrl+Shift+P → Developer: Reload Window'},
  {t: 'Ask in plain language and watch the tool calls', code: 'Copy the demo prompt →'}
];

const prompts = {
  task: 'Use the task-manager MCP tools to add “Prepare the workshop demo” and list all tasks. Do not use the terminal or edit files directly.',
  order: 'Use only the task-manager MCP tools. The demo date is 17 October 2026. Check order 1042 and its shipment. If it is delayed, open a support ticket. Do not use the terminal or direct file editing. If the tools are unavailable, tell me. Report only facts returned by the tools and explain that any ticket is a local demo record.'
};

/* ---------- State ---------- */

const fresh = () => ({answers: new Map(), done: new Set(), chat: [], tool: null, seq: [], stepMiss: null, sort: {}, loopStep: 0, mcpAfter: false, roles: {}, checks: new Set(), selectedCase: 'delayed'});
let state = fresh();
let current = 0;

const isDone = id => state.done.has(id);
const unlocked = a => a.ids.every(isDone);
const score = () => state.done.size * XP;
const level = () => abilities.filter(unlocked).length;
const tag = done => `<span class="tag">${done ? '✓ CLEARED' : 'CHALLENGE · +10 XP'}</span>`;

function complete(id) {
  if (isDone(id)) return;
  const before = abilities.filter(unlocked).map(a => a.id);
  state.done.add(id);
  toast(`+${XP} XP`, 'xp');
  abilities.filter(a => unlocked(a) && !before.includes(a.id)).forEach(a => {
    toast(`${a.icon} Ability unlocked: <strong>${a.name}</strong>`, 'ability');
    confetti();
  });
  updateHud();
}

/* ---------- Building blocks ---------- */

const heading = (n, concept, minutes, title, description) => `<div class="eyebrow">LEVEL ${String(n).padStart(2, '0')} · ${concept} · ${minutes}</div><h1>${title}</h1><p class="intro">${description}</p>`;
const motto = text => `<blockquote class="motto"><span>💬</span>${text}</blockquote>`;

function challenge(id) {
  const q = quiz[id], choice = state.answers.get(id), done = isDone(id);
  const feedback = choice === undefined ? 'Vote as a team, then choose. Retries are free.' : done ? `<strong>Correct!</strong> ${q.why}` : `Not quite. ${q.hint} Try again.`;
  return `<section class="challenge ${done ? 'is-done' : ''}" aria-label="Challenge">${tag(done)}<h2>${q.prompt}</h2><div class="choices">${q.choices.map((text, i) => `<button data-key="q-${id}-${i}" data-question="${id}" data-choice="${i}" aria-pressed="${choice === i}" ${done ? 'disabled' : ''} class="${choice === i ? (done ? 'correct' : 'incorrect') : ''}"><span>${'ABC'[i]}</span>${text}</button>`).join('')}</div><p class="feedback" id="feedback-${id}" tabindex="-1" aria-live="polite">${feedback}</p></section>`;
}

// A horizontal flow diagram. `lit` = how many nodes are switched on (animated in order).
function pipeline(nodes, lit = nodes.length, {both = false} = {}) {
  return `<div class="pipeline">${nodes.map((n, i) => `${i ? `<span class="pipe-link ${i < lit ? 'on' : ''} ${both ? 'both' : ''}" style="--d:${i}" aria-hidden="true"><i></i></span>` : ''}<div class="pipe-node ${i < lit ? 'on' : ''}" style="--d:${i}"><span class="pipe-icon" aria-hidden="true">${n.i}</span><strong>${n.t}</strong><small>${n.s}</small></div>`).join('')}</div>`;
}

/* ---------- Slides ---------- */

const slides = [
  {
    title: 'Start', section: 'START', minutes: '1 MIN', line: 'Your curious little copilot', ids: [],
    notes: ['Bugün tek bir hikâye üzerinden ilerleyeceğiz: <strong>çok zeki ama bilgisayarı kullanamayan bir asistan.</strong>', 'Her seviyede asistana yeni bir yetenek kazandıracağız: önce beyin, sonra eller, sonra bir hedef… En sonunda kendi geliştirdiğimiz aracı ona bağlayacağız.', 'Kurallar: sorularda önce grupça oylayın (A/B/C), sonra birlikte tıklayalım. Yanlış cevabın cezası yok, süre yok.'],
    render: () => `<div class="start"><div class="eyebrow">UZIMSOFT ACADEMY · HANDS-ON WORKSHOP</div><h1>From LLM to <em>AI Agent.</em></h1><p class="intro">One story. One assistant. Seven levels. Meet a brilliant assistant who can’t use a computer, and help it level up until it runs tools <strong>we build ourselves</strong>.</p>
      <div class="evolution">${abilities.map((a, i) => `${i ? '<span class="evo-arrow" aria-hidden="true">→</span>' : ''}<div class="evo ${unlocked(a) ? 'on' : ''}" style="--d:${i}"><span class="evo-icon" aria-hidden="true">${a.icon}</span><strong>${a.name}</strong><small>${a.concept}</small></div>`).join('')}</div>
      <div class="rules"><div><span>🎮</span><strong>${allIds.length} challenges</strong><small>${maxXp} XP to collect</small></div><div><span>🗳️</span><strong>Vote as a team</strong><small>Discuss, then click</small></div><div><span>🔁</span><strong>Retries are free</strong><small>No timer, no penalty</small></div><div><span>🔓</span><strong>${abilities.length} abilities</strong><small>Level up the assistant</small></div></div>
      <button class="primary big" data-go="1" data-key="start">Start level 1 <span>→</span></button></div>`
  },
  {
    title: 'The brain', section: 'LEVEL 1 · LLM', minutes: '3 MIN', line: '“I can explain what to do.”', ids: ['llm'],
    notes: ['Şöyle düşünün: bir asistanınız var. İnanılmaz derecede bilgili. Matematik biliyor, programlama biliyor, onlarca dil konuşabiliyor, karmaşık konuları açıklayabiliyor.', '<em>Demo:</em> sohbetteki ilk soruyu tıkla. Asistan Python kodunu yazıyor ve açıklıyor.', 'Ama bir problemimiz var: ikinci soruyu tıkla. <strong>Bu asistanın bilgisayarınıza erişimi yok.</strong> Dosya oluşturmayı anlatabiliyor ama gerçekten oluşturamıyor. E-postayı yazabiliyor ama gönderemiyor.', 'İşte bu asistan bir <strong>LLM</strong>. Temel yeteneği dili anlamak, işlemek ve yanıt üretmek. Harici araçlar sağlanmadığında dış dünyada doğrudan işlem yapamaz.', 'Vurgula: <strong>“Ne yapmam gerektiğini açıklayabilirim.”</strong>'],
    render: () => {
      const bubbles = [`<div class="bubble bot">Hi! I know maths, code and dozens of languages. Ask me anything.</div>`, ...state.chat.map((i, k) => {
        const p = chatPrompts[i], last = k === state.chat.length - 1 ? 'new' : '';
        return `<div class="bubble me ${last}">${p.q}</div><div class="bubble bot ${p.blocked ? 'blocked' : ''} ${last}">${p.blocked ? '<span class="lock">🔒</span>' : ''}${p.a}${p.code ? `<pre class="code">${p.code}</pre>` : ''}</div>`;
      })].join('');
      const chips = chatPrompts.map((p, i) => state.chat.includes(i) ? '' : `<button class="chip" data-chat="${i}" data-key="chat-${i}">${p.q}</button>`).join('');
      return heading(1, 'LLM', '3 MIN', 'A genius assistant… <em>with no hands.</em>', 'It knows maths, code and dozens of languages. It can explain almost anything. But it has no access to your computer. Meet the <strong>LLM</strong>, a large language model.') +
      `<div class="grid"><div class="panel chat-panel"><div class="chat-head"><span class="avatar" aria-hidden="true">🧠</span><div><strong>Your assistant</strong><small>LLM · text in, text out</small></div><span class="online">online</span></div><div class="chat-log" aria-live="polite">${bubbles}</div><div class="chips">${chips || '<span class="chips-done">Notice the pattern? It can <strong>talk</strong>, but it can’t <strong>do</strong>.</span>'}</div></div>
      <div class="stack"><div class="panel dark"><span class="label">ABILITY SCAN</span><div class="can-grid"><div><h3>✓ Can</h3><ul><li>Understand language</li><li>Write and explain code</li><li>Draft emails and articles</li></ul></div><div class="cant"><h3>✗ Can’t (yet)</h3><ul><li>Create files on your PC</li><li>Send that email</li><li>Check live data</li></ul></div></div>${motto('“I can explain what you should do.”')}</div><div class="panel">${challenge('llm')}</div></div></div>`;
    }
  },
  {
    title: 'Give it hands', section: 'LEVEL 2 · TOOLS', minutes: '2 MIN', line: '“I can act with my tools.”', ids: ['toolpick', 'whodecides'],
    notes: ['Şimdi asistanımıza bazı yetenekler kazandıralım: bir <strong>hesap makinesi</strong>, bir <strong>dosya okuma aracı</strong>, bir de <strong>görev kaydetme aracı</strong>.', 'İstek: “Bugün yapılacaklar listeme AI workshop hazırlığını ekle.” Gruba sor: hangi aracı kuşanmalı?', 'Artık asistan nasıl görev ekleneceğini anlatmak zorunda değil. <code>add_task()</code> aracını çağırarak görevi gerçekten kaydedebilir. Akış diyagramını göster.', 'Önemli fark: <strong>LLM cevap üretir. Tool gerçek bir işlem gerçekleştirir.</strong>', 'Asıl ilginç olan: asistan hangi aracı ne zaman kullanacağına da kendisi karar verebilir.', 'Vurgula: <strong>“Bana verilen araçlarla işlem yapabilirim.”</strong>'],
    render: () => {
      const done = isDone('toolpick'), picked = belt.find(t => t.id === state.tool);
      const msg = !picked ? 'Which tool can actually save the task?' : done ? '<strong>Equipped!</strong> The assistant calls add_task("AI workshop prep") and the task is really saved.' : `${picked.miss} Try another tool.`;
      return heading(2, 'TOOLS', '2 MIN', 'Give the assistant <em>hands.</em>', 'A tool is a function the assistant can call. The LLM produces the answer; the tool performs the real action.') +
      `<div class="panel dark mission"><span class="pill">🎯 REQUEST</span><h2>“Add <em>AI workshop prep</em> to today’s to-do list.”</h2></div>
      <div class="grid"><div class="panel"><section class="challenge">${tag(done)}<h2>Equip the right tool</h2><div class="belt">${belt.map(t => `<button data-tool="${t.id}" data-key="tool-${t.id}" ${done ? 'disabled' : ''} aria-pressed="${state.tool === t.id}" class="${state.tool === t.id ? (t.id === 'add' ? 'correct' : 'incorrect') : ''} ${done && t.id === 'add' ? 'correct' : ''}"><span class="tool-icon" aria-hidden="true">${t.icon}</span><code>${t.name}</code><small>${t.desc}</small></button>`).join('')}</div><p class="feedback" id="feedback-toolpick" tabindex="-1" aria-live="polite">${msg}</p></section></div><div class="panel">${challenge('whodecides')}</div></div>
      <div class="panel flow-panel"><span class="label">${done ? 'WHAT JUST HAPPENED' : 'EQUIP A TOOL TO POWER THIS FLOW'}</span>${pipeline([{i: '🙋', t: 'You', s: '“Add workshop prep”'}, {i: '🧠', t: 'LLM', s: 'Decides: use add_task'}, {i: done ? '✅' : '❔', t: done ? 'add_task()' : 'Tool?', s: 'Performs the action'}, {i: '🗂️', t: 'tasks.json', s: done ? 'Task saved ✓' : 'Nothing saved yet'}], done ? 4 : 2)}${motto('“I can act with the tools I’m given.”')}</div>`;
    }
  },
  {
    title: 'Give it a goal', section: 'LEVEL 3 · AI AGENT', minutes: '3 MIN', line: '“I can plan toward a goal.”', ids: ['order', 'sort'],
    notes: ['Bir adım daha ileri gidelim. Asistanımıza tek bir soru sormak yerine <strong>bir hedef</strong> veriyoruz.', 'Burada birden fazla işlem var. Grupla adımları sıralayın: önce isteği anlamak, sonra işleri belirlemek, ardından görev aracını kullanmak, en sonunda da başarılı olup olmadığını kontrol etmek.', 'Artık tek bir cevap üretmekten ziyade bir hedefe ulaşmak için birden fazla adım gerçekleştiriyor. İşte <strong>AI Agent</strong> yaklaşımı.', 'Tanım: belirli bir hedef doğrultusunda kararlar alabilen, kendisine sunulan araçları kullanabilen ve sonuçlara göre sonraki adımını belirleyebilen sistem.', 'Agent’ın tamamen bağımsız olması şart değil; insan onayıyla ve belirlenmiş sınırlar içinde de çalışabilir.', 'Kart oyunu: Chatbot cevap odaklı, agent hedef ve işlem odaklı.'],
    render: () => {
      const orderDone = isDone('order'), sortDone = isDone('sort');
      const stepMsg = orderDone ? '<strong>Perfect order!</strong> Not one answer, but a sequence of actions toward a goal.' : state.stepMiss !== null ? `Not yet. What has to happen <strong>before</strong> “${agentSteps[state.stepMiss]}”?` : `Click the steps in the order the agent should run them. (${state.seq.length} / 4)`;
      return heading(3, 'AI AGENT', '3 MIN', 'Not a question. <em>A goal.</em>', 'Instead of one question, we hand the assistant a goal. Now it has to plan, act and check. That is an <strong>AI agent</strong>.') +
      `<div class="panel dark mission"><span class="pill">🎯 GOAL</span><h2>“Prepare for tomorrow’s workshop. Work out the tasks and <em>save them to my list.</em>”</h2></div>
      <div class="grid"><div class="panel"><section class="challenge">${tag(orderDone)}<h2>Put the agent’s steps in order</h2><div class="step-deck">${stepDeck.map(i => {
        const used = state.seq.includes(i);
        return `<button data-step="${i}" data-key="step-${i}" ${used || orderDone ? 'disabled' : ''} class="${used ? 'used' : ''} ${state.stepMiss === i ? 'miss' : ''}"><span>${used ? state.seq.indexOf(i) + 1 : '?'}</span>${agentSteps[i]}</button>`;
      }).join('')}</div><p class="feedback" id="feedback-order" tabindex="-1" aria-live="polite">${stepMsg}</p></section>${pipeline(agentSteps.map((t, i) => ({i: ['👂', '📝', '🛠️', '✅'][i], t: `Step ${i + 1}`, s: state.seq.length > i ? t : '…'})), state.seq.length)}</div>
      <div class="panel dark definition"><span class="label">DEFINITION UNLOCKED</span><h2>An <em>AI agent</em> is a system that…</h2><ol class="def-list"><li><span>🎯</span><p>makes decisions toward a <strong>goal</strong></p></li><li><span>🛠️</span><p>uses the <strong>tools</strong> it is given</p></li><li><span>🔁</span><p>picks its next step from the <strong>results</strong></p></li></ol><p>It doesn’t have to be fully autonomous. It can work with human approval and within set limits.</p>${motto('“I can plan steps, use tools and adapt to results.”')}</div></div>
      <div class="panel"><section class="challenge">${tag(sortDone)}<h2>Chatbot or agent? Sort the cards.</h2><div class="sort-grid">${sortCards.map((c, i) => {
        const pick = state.sort[i], state_ = pick ? (pick === c.a ? 'right' : 'wrong') : '';
        return `<div class="sort-card ${state_}"><p>${c.t}</p><div class="seg">${[['chat', '💬 Chatbot'], ['agent', '🤖 Agent']].map(([v, label]) => `<button data-sort="${i}:${v}" data-key="sort-${i}-${v}" aria-pressed="${pick === v}" ${sortDone ? 'disabled' : ''}>${label}</button>`).join('')}</div></div>`;
      }).join('')}</div><p class="feedback" id="feedback-sort" tabindex="-1" aria-live="polite">${sortDone ? '<strong>All sorted!</strong> A chatbot answers. An agent pursues a goal and acts.' : Object.keys(state.sort).length ? 'Red cards need another look.' : 'Sort all six cards.'}</p></section></div>`;
    }
  },
  {
    title: 'The agent loop', section: 'LEVEL 4 · AGENT LOOP', minutes: '2 MIN', line: '“I learn from each result.”', ids: ['loop'],
    notes: ['Bir AI Agent’ın en önemli özelliklerinden biri: <strong>yaptığı işlemin sonucuna göre bir sonraki adımını belirleyebilmesi.</strong>', '“Run next step” ile ilerle. Agent bir dosya oluşturmaya çalışıyor ama hata alıyor.', 'Normalde işlem burada bitebilirdi. Gruba sor: agent şimdi ne yapmalı?', 'Agent hata mesajını inceler, neden başarısız olduğunu değerlendirir ve farklı bir yöntem dener. Döngüyü sonuna kadar oynat.', '<strong>Karar → Eylem → Gözlem → Yeni karar.</strong> Bu döngüye Agent Loop diyoruz.'],
    render: () => {
      const done = isDone('loop'), events = [...loopA, ...(done ? loopB : [])].slice(0, state.loopStep);
      const active = events.length ? events[events.length - 1].n : -1, finished = state.loopStep === loopA.length + loopB.length;
      const waiting = state.loopStep === loopA.length && !done;
      const pos = [[160, 46], [252, 206], [68, 206]];
      return heading(4, 'AGENT LOOP', '2 MIN', 'Decide. Act. <em>Observe.</em> Repeat.', 'An agent looks at the result of every action before choosing the next one. Watch it handle an error.') +
      `<div class="grid"><div class="panel loop-panel"><span class="pill">🎯 GOAL · create docs/workshop-notes.md</span><svg class="loop-svg" viewBox="0 0 320 270" role="img" aria-label="Agent loop: decide, act, observe, then decide again"><circle class="loop-ring" cx="160" cy="150" r="104"/><g class="orbit ${state.loopStep ? 'run' : ''}"><circle cx="160" cy="46" r="7"/></g>${loopNodes.map((name, i) => `<g class="loop-node ${active === i ? 'active' : ''} ${active === i && events[events.length - 1].bad ? 'bad' : ''}"><rect x="${pos[i][0] - 52}" y="${pos[i][1] - 21}" width="104" height="42" rx="21"/><text x="${pos[i][0]}" y="${pos[i][1] + 5}">${['🧠', '🛠️', '👀'][i]} ${name}</text></g>`).join('')}<text class="loop-center" x="160" y="146">${finished ? '🎯' : waiting ? '⚠️' : '🔁'}</text><text class="loop-center-sub" x="160" y="170">${finished ? 'goal reached' : waiting ? 'your call' : 'agent loop'}</text></svg>
      <div class="action-row"><button class="primary" data-loop="next" data-key="loop-next" ${waiting || finished ? 'disabled' : ''}>${finished ? 'Goal reached ✓' : waiting ? 'Your decision ↓' : state.loopStep ? 'Run next step ▶' : 'Start the loop ▶'}</button>${state.loopStep ? '<button data-loop="reset" data-key="loop-reset">↺ Replay</button>' : ''}</div></div>
      <div class="panel"><span class="label">AGENT LOG</span><ol class="log">${events.length ? events.map(e => `<li class="${e.bad ? 'bad' : ''} ${e.good ? 'good' : ''}"><span class="log-tag t${e.n}">${loopNodes[e.n]}</span>${e.code ? `<code>${e.t}</code>` : e.t}</li>`).join('') : '<li class="empty">Press start to watch the agent think.</li>'}</ol>${state.loopStep >= loopA.length ? challenge('loop') : ''}</div></div>`;
    }
  },
  {
    title: 'One plug: MCP', section: 'LEVEL 5 · MCP', minutes: '3 MIN', line: '“One plug, many tools.”', ids: ['mcp', 'roles'],
    notes: ['Asistanımıza bir hesap makinesi, bir dosya sistemi ve bir görev yönetim sistemi bağlamak istiyoruz. Her sistem için farklı bir bağlantı yöntemi geliştirmek zorunda kalırsak işler karmaşıklaşır.', '“Without MCP” görünümünü göster: her uygulama–araç çifti için ayrı kablo. Sonra “With MCP”ye geç.', 'Telefon şarj cihazlarını hatırlayın: eskiden farklı cihazlar için farklı bağlantılar vardı. Ortak standartlar sayesinde cihazlarla aksesuarların birlikte çalışması kolaylaştı.', '<strong>MCP (Model Context Protocol)</strong>, AI uygulamaları ile harici araçlar ve veri kaynakları arasında standart bir iletişim yöntemi sunar.', 'Bizim workshop’ta: <strong>Codex</strong> agent olarak çalışacak, <strong>MCP Server</strong> araçlarımızı Codex’e sunacak, <strong>Tool’lar</strong> görev ekleme ve listeleme işlemlerini yapacak.', 'MCP’nin kendisi bir yapay zekâ modeli değildir.'],
    render: () => {
      const apps = ['Codex', 'Claude', 'Your app'], tools = ['Calculator', 'Files', 'Tasks'], colors = ['#e2793a', '#2f8f6b', '#c9417a'];
      const ys = [60, 150, 240];
      const tangled = apps.flatMap((_, a) => tools.map((_, t) => `<path d="M150 ${ys[a]} C 260 ${ys[a] + (t - a) * 30}, 380 ${ys[t] - (t - a) * 30}, 490 ${ys[t]}" stroke="${colors[(a + t) % 3]}" stroke-dasharray="${['0', '7 5', '2 5'][t]}"/>`)).join('');
      const hub = ys.map(y => `<path d="M150 ${y} C 220 ${y}, 230 150, 268 150"/><path d="M372 150 C 410 150, 420 ${y}, 490 ${y}"/>`).join('');
      const box = (x, y, label, icon) => `<g class="mcp-box"><rect x="${x}" y="${y - 22}" width="130" height="44" rx="12"/><text x="${x + 65}" y="${y + 5}">${icon} ${label}</text></g>`;
      const rolesDone = isDone('roles');
      return heading(5, 'MCP', '3 MIN', 'MCP: one plug for <em>every tool.</em>', 'Remember when every phone needed its own charger? <strong>Model Context Protocol</strong> is the shared standard between AI apps and the tools and data they use.') +
      `<div class="panel mcp-panel"><div class="mcp-top"><div class="seg big" role="group" aria-label="Compare connections"><button data-mcp="before" data-key="mcp-before" aria-pressed="${!state.mcpAfter}">🔀 Without MCP</button><button data-mcp="after" data-key="mcp-after" aria-pressed="${state.mcpAfter}">🔌 With MCP</button></div><p class="mcp-count" id="mcp-count">${mcpCount()}</p></div>
      <svg class="mcp-svg" id="mcp-svg" data-mode="${state.mcpAfter ? 'after' : 'before'}" viewBox="0 0 640 300" role="img" aria-label="Without MCP every app needs a custom connection to every tool. With MCP, all connect through one standard."><g class="wires before">${tangled}</g><g class="wires after">${hub}</g><g class="mcp-hub"><rect x="268" y="120" width="104" height="60" rx="16"/><text x="320" y="147">🔌 MCP</text><text class="sub" x="320" y="166">one standard</text></g>${apps.map((a, i) => box(20, ys[i], a, '🤖')).join('')}${tools.map((t, i) => box(490, ys[i], t, ['🧮', '📄', '✅'][i])).join('')}</svg></div>
      <div class="panel flow-panel"><span class="label">IN OUR WORKSHOP</span>${pipeline([{i: '🙋', t: 'You', s: 'Ask in plain language'}, {i: '🤖', t: 'Codex', s: 'AI agent · decides'}, {i: '🔌', t: 'MCP', s: 'Shared protocol'}, {i: '🐍', t: 'server.py', s: 'Our MCP server'}, {i: '🛠️', t: 'add_task · list_tasks', s: 'Do the real work'}, {i: '🗂️', t: 'tasks.json', s: 'Saved data'}], 6, {both: true})}<p class="note">MCP itself is <strong>not an AI model</strong>. It is the standard way we offer tools and data to the agent.</p></div>
      <div class="grid"><div class="panel">${challenge('mcp')}</div><div class="panel"><section class="challenge">${tag(rolesDone)}<h2>Who does what?</h2><div class="roles">${roles.map((r, i) => `<div class="role-row ${state.roles[i] === undefined ? '' : state.roles[i] === r.a ? 'right' : 'wrong'}"><strong><span aria-hidden="true">${r.icon}</span>${r.who}</strong><div class="seg small">${roleOptions.map((o, j) => `<button data-role="${i}:${j}" data-key="role-${i}-${j}" aria-pressed="${state.roles[i] === j}" ${rolesDone ? 'disabled' : ''}>${o}</button>`).join('')}</div></div>`).join('')}</div><p class="feedback" id="feedback-roles" tabindex="-1" aria-live="polite">${rolesDone ? '<strong>Exactly.</strong> Codex decides, MCP connects, our Python tools do the work.' : 'Match each part to its job.'}</p></section></div></div>`;
    }
  },
  {
    title: 'Build our tool', section: 'LEVEL 6 · BUILD IT', minutes: '2 MIN + LIVE', line: '“Teach me a new skill!”', ids: ['build'],
    notes: ['Geçiş cümlesi: “Şimdiye kadar çok zeki bir asistanımız vardı. Ona araçlar verdik, hedefler verdik ve bu araçları nasıl kullanabildiğini gördük.”', '“Peki kendi geliştirdiğimiz bir aracı bu asistana bağlayabilir miyiz? İşte şimdi tam olarak bunu yapacağız.”', '“Python ile küçük bir MCP Server geliştireceğiz. İçerisine görev ekleme ve görev listeleme araçlarını koyacağız. Sonra bu araçları Codex’e bağlayacağız.”', '“Ve en sonunda Codex’e yalnızca doğal dilde bir komut vererek kendi geliştirdiğimiz araçları çalıştıracağız.”', 'Canlı ilerlerken kontrol listesindeki adımları işaretle. Komutlar commands.md dosyasında.'],
    render: () => {
      const done = isDone('build');
      return heading(6, 'BUILD IT', '2 MIN + LIVE', 'Now teach <em>our</em> agent a new skill.', 'We had a brilliant assistant. We gave it tools and a goal. Now we build our own tool in Python, plug it in with MCP, and let Codex use it.') +
      `<div class="ladder">${[['🧠', 'LLM', '“I can explain what you should do.”'], ['🖐️', 'LLM + tools', '“I can act with the tools I’m given.”'], ['🤖', 'AI agent', '“I can plan steps, use tools and adapt to results.”']].map(([i, t, s], k) => `<div class="rung" style="--k:${k}"><span aria-hidden="true">${i}</span><strong>${t}</strong><p>${s}</p></div>`).join('')}</div>
      <div class="grid"><div class="panel"><section class="challenge">${tag(done)}<h2>Build quest · tick as we go</h2><ol class="quest">${buildSteps.map((s, i) => `<li><button data-check="${i}" data-key="check-${i}" aria-pressed="${state.checks.has(i)}"><span class="box" aria-hidden="true">${state.checks.has(i) ? '✓' : i + 1}</span><span><strong>${s.t}</strong><code>${s.code}</code></span></button></li>`).join('')}</ol><p class="feedback" id="feedback-build" tabindex="-1" aria-live="polite">${done ? '<strong>Skill installed!</strong> Our agent can now add and list tasks.' : `${state.checks.size} / ${buildSteps.length} steps done`}</p></section></div>
      <div class="panel dark"><span class="label">SERVER.PY · THE SKILL WE ADD</span><pre class="code">from mcp.server.fastmcp import FastMCP

mcp = FastMCP(<span class="orange">"Task Manager"</span>)

<span class="orange">@mcp.tool()</span>
def add_task(task: str) -> str:
    """Add a new task to the task list."""
    ...

<span class="orange">@mcp.tool()</span>
def list_tasks() -> list:
    """List all tasks."""
    ...

mcp.run(transport="stdio")</pre><p>The docstrings matter: they tell the agent what each tool does and when to use it.</p><span class="pill">LIVE DEMO PROMPT</span><h2 class="prompt-text">“${prompts.task}”</h2><button class="primary" data-copy="task" data-key="copy-task">Copy demo prompt</button><p id="copy-task" aria-live="polite"></p></div></div>`;
    }
  },
  {
    title: 'Boss level', section: 'LEVEL 7 · BOSS', minutes: 'PRACTICE', line: '“Ready for the boss level.”', ids: cases,
    notes: ['Sipariş araçlarını (<code>get_order</code>, <code>get_shipment</code>, <code>create_support_ticket</code>) ekledikten sonraki bölüm.', 'Önce sunumda üç siparişi grupla çözün: 1042 gecikmiş → kayıt aç; 1043 zamanında → kayıt yok; 9999 bulunamadı → doğru numarayı iste.', 'Sonra aynı istemi yeni bir Codex sohbetinde çalıştır. Sadece cevabı değil araç çağrılarını da göster; ardından <code>data/tickets.json</code> dosyasını aç.', 'Gecikme kuralı sunucuda da kontrol edilir; model yanlış araç seçse bile zamanında siparişe kayıt açılmaz.', 'Final: XP skorunu ve açılan yetenekleri göster. Asistanın evrimi tamamlandı.'],
    render: () => {
      const c = quiz[state.selectedCase], all = score() === maxXp;
      return heading(7, 'BOSS LEVEL', 'PRACTICE', 'Boss level: <em>order rescue.</em>', 'New tools are plugged in. The customer says: “Check my order and open a support ticket if it’s delayed.” You are the agent. Read the evidence and solve all three orders.') +
      `<div class="action-row case-tabs" aria-label="Choose an order">${cases.map(k => `<button class="option" data-case="${k}" data-key="case-${k}" aria-pressed="${k === state.selectedCase}">📦 Order ${quiz[k].label}${isDone(k) ? ' ✓' : ''}</button>`).join('')}</div>
      <div class="grid"><div class="panel dark"><span class="label">TOOL RESULTS · READ THE EVIDENCE</span><pre class="code">${c.trace}</pre>${pipeline([{i: '🤖', t: 'Codex', s: 'Reads the request'}, {i: '📦', t: 'get_order', s: 'Facts'}, {i: '🚚', t: 'get_shipment', s: 'Status'}, {i: '🎫', t: 'ticket?', s: 'Only if delayed'}], state.selectedCase === 'missing' ? 2 : isDone(state.selectedCase) && state.selectedCase === 'delayed' ? 4 : 3)}</div><div class="panel">${challenge(state.selectedCase)}</div></div>
      <div class="grid finale"><div class="panel"><span class="label">YOUR WORKSHOP SCORE</span><div class="score-large">${score()}<small> / ${maxXp} XP</small></div><h2>${all ? '🏆 Evolution complete: agent builder!' : `Assistant level ${level()} of ${abilities.length}`}</h2><div class="evolution mini">${abilities.map(a => `<div class="evo ${unlocked(a) ? 'on' : ''}"><span class="evo-icon" aria-hidden="true">${a.icon}</span><strong>${a.name}</strong></div>`).join('')}</div><p>${all ? 'Every ability unlocked. You’re ready to take these ideas into the live demo.' : 'Revisit any level from the sidebar to collect the missing XP.'}</p></div>
      <div class="panel dark"><span class="pill">LIVE DEMO PROMPT</span><h2>“Check order 1042 and its shipment. If it’s delayed, open a support ticket.”</h2><p>Use the task-manager MCP tools only. Then open data/tickets.json to see the saved local result. Try 1043 and 9999 next, then repeat 1042 to see it reuse the open ticket.</p><button class="primary" data-copy="order" data-key="copy-order">Copy full demo prompt</button><p id="copy-order" aria-live="polite"></p></div></div>
      <div class="note">Practice simulation · Fixed demo date: 17 October 2026 · This page never calls a model, reads orders or writes tickets.</div>`;
    }
  }
];

/* ---------- Rendering ---------- */

const slide = $('slide'), chapters = $('chapters');
const pad = n => String(n).padStart(2, '0');
const mcpCount = () => state.mcpAfter ? '<strong>6</strong> standard connections · add a tool once, every app can use it' : '<strong>9</strong> custom integrations · every new tool means more cables';

function renderNav() {
  chapters.innerHTML = slides.map((s, i) => {
    const cleared = s.ids.length && s.ids.every(isDone);
    return `<button data-slide="${i}" class="${i === current ? 'active' : ''}" ${i === current ? 'aria-current="step"' : ''}><span>${pad(i)}</span>${s.title}<em class="nav-state" aria-label="${cleared ? 'cleared' : ''}">${cleared ? '★' : ''}</em></button>`;
  }).join('');
}

function updateHud() {
  const lv = level();
  $('xp').textContent = `${score()} / ${maxXp} XP`;
  $('xp-fill').style.width = `${score() / maxXp * 100}%`;
  $('hud-level').textContent = `Lv. ${lv}`;
  $('agent-level').textContent = `Lv ${lv}`;
  $('abilities').innerHTML = abilities.map(a => `<span class="ability ${unlocked(a) ? 'on' : ''}" title="${a.name} · ${a.concept}">${a.icon}</span>`).join('');
  abilities.forEach(a => document.body.classList.toggle(`ab-${a.id}`, unlocked(a)));
  renderNav();
}

function renderNotes() {
  const s = slides[current];
  $('notes').innerHTML = `<div class="notes-head"><strong>🎤 ${s.section}</strong><span>${s.minutes}</span><button class="quiet" id="notes-close" aria-label="Close speaker notes">✕</button></div>${s.notes.map(p => `<p>${p}</p>`).join('')}`;
}

function render(index, focus = true) {
  current = index;
  const s = slides[index];
  slide.innerHTML = s.render();
  $('section-name').textContent = s.section;
  $('slide-number').textContent = pad(index);
  $('slide-total').textContent = `/ ${pad(slides.length - 1)}`;
  $('progress').innerHTML = slides.map((_, i) => `<i class="${i <= index ? 'filled' : ''}"></i>`).join('');
  $('prev').disabled = index === 0;
  $('next').disabled = index === slides.length - 1;
  $('next').innerHTML = index === slides.length - 1 ? 'Ready to build ✓' : index === 0 ? 'Start <span>→</span>' : 'Next level <span>→</span>';
  const caption = $('agent-caption');
  caption.dataset.line = s.line;
  if ($('agent-toggle').getAttribute('aria-pressed') === 'true') caption.textContent = s.line;
  updateHud();
  renderNotes();
  if (focus) { slide.focus({preventScroll: true}); window.scrollTo(0, 0); }
}

// Re-render the current slide in place and keep keyboard focus on the same control.
function refresh(key, fallback) {
  render(current, false);
  const el = key && slide.querySelector(`[data-key="${key}"]`);
  const target = el && !el.disabled ? el : fallback && $(fallback);
  if (target) target.focus({preventScroll: true});
}

function navigate(index) {
  index = Math.max(0, Math.min(slides.length - 1, index));
  if (location.hash !== `#${index}`) location.hash = String(index); else render(index);
}

/* ---------- Effects ---------- */

function toast(html, kind) {
  const el = document.createElement('div');
  el.className = `toast ${kind}`;
  el.innerHTML = html;
  $('toasts').append(el);
  setTimeout(() => el.remove(), kind === 'ability' ? 3200 : 1700);
}

function confetti() {
  if (reduceMotion.matches) return;
  const colors = ['#6d3fb3', '#4f46e5', '#a78bfa', '#f59e0b', '#10b981', '#ec4899'];
  for (let i = 0; i < 40; i++) {
    const p = document.createElement('i');
    p.className = 'confetti';
    p.style.cssText = `left:${Math.random() * 100}vw;background:${colors[i % colors.length]};animation-delay:${Math.random() * .3}s;--x:${(Math.random() - .5) * 200}px;--r:${Math.random() * 720}deg`;
    document.body.append(p);
    setTimeout(() => p.remove(), 2200);
  }
}

/* ---------- Interaction ---------- */

slide.addEventListener('click', async e => {
  const b = e.target.closest('button');
  if (!b || b.disabled) return;
  const d = b.dataset;

  if (d.go) return navigate(Number(d.go));

  if (d.question) {
    const id = d.question;
    if (isDone(id)) return;
    state.answers.set(id, Number(d.choice));
    if (Number(d.choice) === quiz[id].answer) complete(id);
    return refresh(b.dataset.key, `feedback-${id}`);
  }

  if (d.chat) {
    const i = Number(d.chat);
    if (!state.chat.includes(i)) state.chat.push(i);
    const next = chatPrompts.findIndex((_, k) => !state.chat.includes(k));
    return refresh(next >= 0 ? `chat-${next}` : null);
  }

  if (d.tool) {
    state.tool = d.tool;
    if (d.tool === 'add') complete('toolpick');
    return refresh(b.dataset.key, 'feedback-toolpick');
  }

  if (d.step) {
    const i = Number(d.step);
    if (i === state.seq.length) {
      state.seq.push(i);
      state.stepMiss = null;
      if (state.seq.length === agentSteps.length) complete('order');
    } else state.stepMiss = i;
    const nextKey = stepDeck.find(k => !state.seq.includes(k));
    return refresh(state.stepMiss === i ? b.dataset.key : nextKey !== undefined ? `step-${nextKey}` : null, 'feedback-order');
  }

  if (d.sort) {
    const [i, v] = d.sort.split(':');
    state.sort[i] = v;
    if (sortCards.every((c, k) => state.sort[k] === c.a)) complete('sort');
    return refresh(b.dataset.key, 'feedback-sort');
  }

  if (d.loop) {
    if (d.loop === 'reset') state.loopStep = 0;
    else if (state.loopStep < loopA.length || (isDone('loop') && state.loopStep < loopA.length + loopB.length)) state.loopStep++;
    return refresh(state.loopStep === loopA.length && !isDone('loop') ? 'q-loop-0' : 'loop-next', 'feedback-loop');
  }

  if (d.mcp) {
    // Toggle in place so the CSS transition between the two diagrams plays.
    state.mcpAfter = d.mcp === 'after';
    $('mcp-svg').dataset.mode = d.mcp;
    $('mcp-count').innerHTML = mcpCount();
    slide.querySelectorAll('[data-mcp]').forEach(x => x.setAttribute('aria-pressed', String(x.dataset.mcp === d.mcp)));
    return;
  }

  if (d.role) {
    const [i, j] = d.role.split(':').map(Number);
    state.roles[i] = j;
    if (roles.every((r, k) => state.roles[k] === r.a)) complete('roles');
    return refresh(b.dataset.key, 'feedback-roles');
  }

  if (d.check) {
    const i = Number(d.check);
    state.checks.has(i) ? state.checks.delete(i) : state.checks.add(i);
    if (state.checks.size === buildSteps.length) complete('build');
    return refresh(b.dataset.key);
  }

  if (d.case) {
    state.selectedCase = d.case;
    return refresh(b.dataset.key);
  }

  if (d.copy) {
    const status = $(`copy-${d.copy}`);
    try { await navigator.clipboard.writeText(prompts[d.copy]); status.textContent = 'Copied. Paste it into a new Codex conversation.'; }
    catch { status.textContent = prompts[d.copy]; }
  }
});

chapters.addEventListener('click', e => { const b = e.target.closest('[data-slide]'); if (b) navigate(Number(b.dataset.slide)); });
$('prev').onclick = () => navigate(current - 1);
$('next').onclick = () => navigate(current + 1);

function toggleNotes(force) {
  const notes = $('notes'), open = force ?? notes.hidden;
  notes.hidden = !open;
  $('notes-toggle').setAttribute('aria-pressed', String(open));
}
$('notes-toggle').onclick = () => toggleNotes();
$('notes').addEventListener('click', e => { if (e.target.closest('#notes-close')) toggleNotes(false); });

$('reset-game').onclick = () => {
  state = fresh();
  render(current);
  $('game-status').textContent = 'Practice reset. All challenges are available again.';
};

function hashIndex() {
  const n = Number(location.hash.slice(1));
  return Number.isInteger(n) && n >= 0 && n < slides.length ? n : 0;
}
window.addEventListener('hashchange', () => render(hashIndex()));

document.addEventListener('keydown', e => {
  if (e.altKey || e.ctrlKey || e.metaKey || ['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName) || e.target.isContentEditable) return;
  if (e.key === 'ArrowRight') { e.preventDefault(); navigate(current + 1); }
  if (e.key === 'ArrowLeft') { e.preventDefault(); navigate(current - 1); }
  if (e.key === 'n' || e.key === 'N') toggleNotes();
  if (e.key === 'Escape') toggleNotes(false);
});

$('fullscreen').onclick = async () => {
  try { if (document.fullscreenElement) await document.exitFullscreen(); else await document.documentElement.requestFullscreen(); }
  catch { $('fullscreen').textContent = 'Use browser full screen (F11)'; }
};

render(hashIndex());
