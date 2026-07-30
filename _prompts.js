// Custom Prompt Library — shared across tools.
// Storage: prompts.custom.v1 = [{ id, name, template, category, createdAt, updatedAt }]
// Template placeholders: {text} is replaced with the current transcript/selection when applied.
// Tools call window.PromptLib.pick(({ template }) => { ... }) to open the picker.
(function () {
  'use strict';
  if (window.top !== window) return;

  const STORE = 'prompts.custom.v1';

  const SEEDS = [
    { id: 'seed-my-translate', name: '🌐 မြန်မာသို့ ဘာသာပြန်ရန်', category: 'translate',
      template: 'အောက်ပါစာသားကို မြန်မာဘာသာသို့ ဘာသာပြန်ပါ။ နည်းပညာဆိုင်ရာ အင်္ဂလိပ်စကားလုံးများ (function name၊ SQL keyword) ကို ခြင်းချက်ထား၍ မဘာသာပြန်ဘဲထားပါ။ ဘာသာပြန်ချက်ကိုသာ ပြန်ပါ။\n\n{text}' },
    { id: 'seed-en-translate', name: '🌐 Translate to English', category: 'translate',
      template: 'Translate the following text to English. Preserve technical terms (function names, SQL keywords, product names) verbatim. Return only the translation.\n\n{text}' },
    { id: 'seed-slack', name: '💬 Rewrite for Slack (friendly)', category: 'rewrite',
      template: 'Rewrite the following in a friendly, concise Slack-message tone. Use bullets where helpful, keep under 4 lines total.\n\n{text}' },
    { id: 'seed-email', name: '📧 Rewrite as professional email', category: 'rewrite',
      template: 'Rewrite as a professional email with subject line, greeting, body, and sign-off. Keep it concise and clear.\n\n{text}' },
    { id: 'seed-sql-extract', name: '🔧 Extract SQL from log', category: 'extract',
      template: 'Extract every SQL statement from the following log/text. Format each on its own line, formatted with UPPERCASE keywords. Skip prose, only return SQL.\n\n{text}' },
    { id: 'seed-bug-triage', name: '🐛 Bug triage', category: 'extract',
      template: 'Analyze this bug report/log. Return JSON: { "severity": "P0|P1|P2|P3", "summary": "...", "reproSteps": ["..."], "likelyCause": "...", "suggestedFix": "..." }\n\n{text}' },
    { id: 'seed-standup', name: '📅 Standup from notes', category: 'summarize',
      template: 'Turn the following notes into a standup-style summary in Myanmar. Format:\nYesterday: ...\nToday: ...\nBlockers: ...\n\n{text}' },
    { id: 'seed-explain-simple', name: '💡 Explain simply (Myanmar)', category: 'summarize',
      template: 'Explain the following concept in simple Myanmar, as if to a beginner developer. Use analogies where useful. Keep it under 5 sentences.\n\n{text}' },
  ];

  // ═══════════════════════════════════════════════════════════════════
  // Curated Prompt Spotlight — rotates daily/weekly/monthly on Dashboard
  // These are baked-in read-only prompts (separate from user's custom library).
  // Use window.PromptLib.spotlight('daily'|'weekly'|'monthly') to fetch today's/this week's/this month's.
  // ═══════════════════════════════════════════════════════════════════

  const DAILY_LIBRARY = [
    { name: '🌅 Morning intention', template: `ဒီနေ့အတွက် အရေးအကြီးဆုံး လုပ်ဆောင်ရမည့် ၃ ခုကို ရွေးထုတ်ပေးပါ။ ဘာကြောင့် အရေးကြီးသလဲ ရှင်းလင်းပါ။\n\nRelevant context (tasks/notes):\n{text}` },
    { name: '🎯 SMART goal from vague idea', template: `Turn this vague idea into a SMART goal (Specific, Measurable, Achievable, Relevant, Time-bound). Return in Myanmar.\n\nIdea:\n{text}` },
    { name: '🧠 Rubber duck a problem', template: `Act as a curious junior developer. Ask me clarifying questions about this problem, one at a time, so I can think it through by explaining it to you. Start with the biggest gap in my thinking.\n\nProblem:\n{text}` },
    { name: '📧 3 email drafts (short/medium/formal)', template: `Rewrite this as 3 email versions:\n1. SHORT (2 sentences)\n2. MEDIUM (paragraph)\n3. FORMAL (multi-paragraph, professional)\n\nContext:\n{text}` },
    { name: '⚡ 5-minute learn', template: `Explain this topic in exactly 5 paragraphs designed to be read in 5 minutes. Use Myanmar with technical terms in English. Include one concrete example.\n\nTopic:\n{text}` },
    { name: `🔍 Devil's advocate review`, template: `Play devil's advocate on this plan/idea. What could go wrong? Who might disagree and why? What are 3 blindspots? Return in Myanmar.\n\nPlan:\n{text}` },
    { name: '📝 Meeting agenda from goals', template: `Turn these goals into a structured meeting agenda with time boxes. Include: intro (5min), key topics (each 10-15min), action items round (10min), close (5min). Return in Myanmar.\n\nGoals:\n{text}` },
    { name: '💬 Slack thread reply', template: `Draft 3 possible Slack replies to this thread: (1) supportive, (2) diplomatically challenging, (3) with a follow-up question. Keep each under 3 lines.\n\nThread:\n{text}` },
    { name: `🎓 ELI5 (Explain like I'm 5)`, template: `Explain this concept like I'm 5 years old. Use everyday analogies, no jargon. Then give one sentence for a professional. Return in Myanmar.\n\nConcept:\n{text}` },
    { name: '🔄 Pros & cons matrix', template: `Create a pros/cons table for this decision. Include: short-term pros, long-term pros, short-term cons, long-term cons. Return in Myanmar.\n\nDecision:\n{text}` },
    { name: '🚨 What am I missing?', template: `Review this plan/code/note critically. What are the top 5 things I'm missing or should worry about? Rank by risk. Return in Myanmar.\n\n{text}` },
    { name: '📚 Study flashcards (10)', template: `Turn this into 10 study flashcards. Return JSON: [{"q":"question","a":"answer"}]. Use Myanmar for questions/answers, keep technical terms in English.\n\n{text}` },
    { name: '🧘 End-of-day reflection', template: `Based on today's notes/tasks, help me reflect: What went well? What was hard? What did I learn? What will I change tomorrow? Answer as if you were me, in Myanmar first person.\n\n{text}` },
    { name: '🎨 Reframe negatively-worded feedback', template: `Rewrite this feedback as constructive and actionable. Preserve the message, remove the sting. Return in Myanmar and English versions.\n\n{text}` },
    { name: '⏱ 25-min Pomodoro plan', template: `Break this task into 25-minute Pomodoro chunks. Each chunk should have a clear deliverable. Include a 5-min break plan between chunks. Return in Myanmar.\n\nTask:\n{text}` },
    { name: '🔧 Refactor suggestion', template: `Suggest 3 refactoring improvements for this code. For each: what to change, why, and code snippet. Return in Myanmar with code in English.\n\nCode:\n{text}` },
    { name: '🐛 Bug reproduction steps', template: `From this bug description, extract: (1) exact steps to reproduce, (2) expected vs actual, (3) environment info, (4) suspected root cause. Return in Myanmar.\n\nBug:\n{text}` },
    { name: '📊 Data insight extractor', template: `From this data/list, surface 3 non-obvious insights or patterns. Explain each in one sentence, Myanmar.\n\nData:\n{text}` },
    { name: '🎤 Elevator pitch (30 sec)', template: `Turn this into a 30-second elevator pitch. Return 3 versions: technical, business, and Myanmar-language.\n\n{text}` },
    { name: '❓ Better questions to ask', template: `Based on this context, suggest 5 sharp questions I should ask to make better decisions. Rank by impact. Return in Myanmar.\n\n{text}` },
    { name: '📖 One-page summary', template: `Distill this into a one-page summary with sections: TL;DR (1 sentence), Key Points (5 bullets), Action Items (3 bullets), Open Questions (3 bullets). Return in Myanmar.\n\n{text}` },
    { name: '🎯 Prioritize by impact vs effort', template: `Rank these items on a 2x2 impact-vs-effort matrix. Return as a table with columns: Item | Impact (1-10) | Effort (1-10) | Verdict (Do first / Schedule / Delegate / Drop). Answer in Myanmar.\n\n{text}` },
    { name: '💡 Analogies to explain concept', template: `Generate 3 analogies from different domains (cooking, sports, everyday life) to explain this concept. Return in Myanmar.\n\nConcept:\n{text}` },
    { name: '🔗 Compare 2 things', template: `Compare these two options across 5 dimensions. Recommend one with reasoning. Return in Myanmar as a table.\n\n{text}` },
    { name: '✂ Cut 50% word count', template: `Rewrite this to be 50% shorter while keeping all key information. Preserve tone. Return in the same language as the source.\n\n{text}` },
    { name: `🔮 What would experts say?`, template: `Imagine 3 different experts (a senior engineer, a UX designer, a project manager) reviewing this. What would each focus on? Return in Myanmar.\n\n{text}` },
    { name: '📋 Checklist from unstructured text', template: `Extract a step-by-step checklist from this unstructured text. Number each step, keep them actionable. Return in Myanmar.\n\n{text}` },
    { name: '💌 Thank-you message', template: `Draft a genuine thank-you message based on this context. 2-3 sentences. Not sycophantic. Return in Myanmar and English versions.\n\nContext:\n{text}` },
    { name: '🚀 Ship-it MVP scope', template: `From this feature idea, cut to the smallest possible MVP that would still validate the core assumption. List what to build, what to explicitly NOT build, and what to measure. Return in Myanmar.\n\n{text}` },
    { name: '🎓 Turn learning into practice exercise', template: `Based on this material, create 3 practical exercises (easy/medium/hard) that would prove I understand it. Include expected outcomes. Return in Myanmar.\n\n{text}` },
  ];

  const WEEKLY_LIBRARY = [
    { name: '📅 Weekly review — GTD style', template: `Guide me through a weekly review based on my week's notes/tasks:\n1. Collect: what came up this week?\n2. Process: what needs action?\n3. Reflect: what worked / didn't?\n4. Plan: top 3 for next week.\n\nReturn in Myanmar as structured sections.\n\nWeek data:\n{text}` },
    { name: '🔄 Weekly retrospective (Start/Stop/Continue)', template: `From this week's activity, generate a retrospective:\n• START doing: 3 things\n• STOP doing: 3 things\n• CONTINUE doing: 3 things\n\nReturn in Myanmar.\n\n{text}` },
    { name: '📊 Weekly hours audit', template: `Analyze how I spent this week based on tracked hours. Identify: (1) biggest time sinks, (2) high-value work, (3) time leaks. Suggest 3 changes for next week. Return in Myanmar.\n\n{text}` },
    { name: '🎯 Weekly goals → daily plan', template: `Break these weekly goals into a daily plan (Mon-Fri) with realistic time estimates. Include buffer for meetings. Return as Myanmar-language table.\n\nGoals:\n{text}` },
    { name: '📖 Weekly reading digest', template: `Summarize this week's reading/notes. Structure: 3 key ideas learned, 2 quotes worth remembering, 1 concept to apply this coming week. Return in Myanmar.\n\n{text}` },
    { name: '🧘 Weekly wellness check', template: `Reflect on this week: energy levels, sleep quality, stress, exercise, social time, focus time. Score each 1-10. Suggest one adjustment for next week. Return in Myanmar as first person.\n\nContext:\n{text}` },
    { name: '📝 Weekly report to manager', template: `Draft a concise weekly status report (300 words max) covering: accomplishments, in-progress, blockers, next-week focus. Professional tone. Return in Myanmar and English.\n\nWeek data:\n{text}` },
    { name: '🎓 Weekly learning summary', template: `Extract what I learned this week and turn it into a mini-tutorial I could share with a teammate. Structure: problem it solves, concept, worked example, common pitfalls. Return in Myanmar.\n\n{text}` },
    { name: '💰 Weekly ROI check', template: `Rank this week's activities by ROI (return on effort invested). Highlight the 20% that produced 80% of value, and the low-value work to consider dropping. Return in Myanmar.\n\n{text}` },
    { name: '🔗 Weekly network follow-ups', template: `From my week's notes, identify people I met/interacted with. Suggest 3 relationships to follow up on with a specific message. Return in Myanmar with English message drafts.\n\n{text}` },
    { name: '🚧 Weekly blocker analysis', template: `Analyze the blockers I hit this week. For each: (1) what caused it, (2) how it was resolved (or if still open), (3) what I could do differently next time. Return in Myanmar.\n\n{text}` },
    { name: '📤 Weekly sharing package', template: `From this week's notes/learnings, package 3 things I could share with the team (Slack post, tech-brief, wiki page). For each: format, audience, 1-line hook. Return in Myanmar.\n\n{text}` },
    { name: '⚖ Weekly work-life balance', template: `Score my work-life balance this week 1-10 across dimensions: work hours, family time, rest, hobbies, exercise, learning. Suggest 3 specific rebalances for next week. Return in Myanmar.\n\n{text}` },
    { name: '🎯 Priority audit for next week', template: `Based on this week's outcomes, help me pick the 3 highest-leverage priorities for next week. For each: why it matters, first concrete step, deadline. Return in Myanmar.\n\n{text}` },
    { name: '🔍 Weekly assumption check', template: `What assumptions did I act on this week? Which turned out to be wrong (in hindsight)? What did I learn? Return in Myanmar.\n\n{text}` },
  ];

  const MONTHLY_LIBRARY = [
    { name: '🗺 Monthly strategic review', template: `Guide me through a strategic monthly review. Cover: (1) What did I achieve vs plan? (2) What surprised me? (3) What's my highest-leverage focus for next month? (4) What am I saying no to? Return in Myanmar.\n\nMonth data:\n{text}` },
    { name: '📈 Monthly skill audit', template: `Assess my technical skills this month based on notes/work. What improved? What plateaued? What emerging skill should I build next month? Suggest one specific learning plan. Return in Myanmar.\n\n{text}` },
    { name: '💼 Monthly career reflection', template: `Reflect on my career direction based on this month's work: Am I moving toward or away from where I want to be? What projects/tasks made me feel most engaged? Least? Return in Myanmar first person.\n\n{text}` },
    { name: '🎯 Monthly OKR check', template: `Score my monthly OKRs (Objectives & Key Results) using this data. For each KR: current progress %, at-risk/on-track/exceeding, and one action for next month. Return in Myanmar as table.\n\n{text}` },
    { name: '🧘 Monthly personal check-in', template: `Deep personal reflection: How am I doing across health, relationships, finances, learning, purpose? Score each 1-10. Pick one to focus on next month. Return in Myanmar first person, non-judgemental tone.\n\n{text}` },
    { name: '💰 Monthly financial review', template: `Based on this month's data, help me review: (1) major spending categories, (2) unexpected costs, (3) savings progress, (4) one financial improvement for next month. Return in Myanmar.\n\n{text}` },
    { name: '📚 Monthly reading list plan', template: `Based on my current work/interests reflected in this month's notes, suggest 5 books/articles/courses to consume next month. For each: what it teaches, why relevant, time investment. Return in Myanmar.\n\n{text}` },
    { name: '🌱 Monthly habit review', template: `Audit my habits this month. Which stuck? Which slipped? Which should I add/drop? Return as a table with Habit | Consistency % | Verdict. Return in Myanmar.\n\n{text}` },
    { name: '🎨 Monthly creative output', template: `Review my creative/side-project output this month. What did I create? What did I ship? What sat unfinished? Plan one concrete deliverable for next month. Return in Myanmar.\n\n{text}` },
    { name: '🔮 Monthly forecast — next 90 days', template: `Given this month's trajectory, project the next 90 days. What's likely to happen if nothing changes? What one strategic bet would meaningfully change the outcome? Return in Myanmar.\n\n{text}` },
  ];

  function dayOfYear(d) {
    d = d || new Date();
    const start = new Date(d.getFullYear(), 0, 0);
    return Math.floor((d - start) / 86400000);
  }
  function weekOfYear(d) {
    d = d || new Date();
    const jan1 = new Date(d.getFullYear(), 0, 1);
    return Math.ceil((((d - jan1) / 86400000) + jan1.getDay() + 1) / 7);
  }
  function pickSpotlight(period) {
    const now = new Date();
    if (period === 'daily')   return { ...DAILY_LIBRARY[dayOfYear(now) % DAILY_LIBRARY.length], period, key: `spot-daily-${now.getFullYear()}-${dayOfYear(now)}` };
    if (period === 'weekly')  return { ...WEEKLY_LIBRARY[weekOfYear(now) % WEEKLY_LIBRARY.length], period, key: `spot-weekly-${now.getFullYear()}-${weekOfYear(now)}` };
    if (period === 'monthly') return { ...MONTHLY_LIBRARY[now.getMonth() % MONTHLY_LIBRARY.length], period, key: `spot-monthly-${now.getFullYear()}-${now.getMonth()}` };
    return null;
  }
  function spotlightLibrarySizes() {
    return { daily: DAILY_LIBRARY.length, weekly: WEEKLY_LIBRARY.length, monthly: MONTHLY_LIBRARY.length };
  }

  function load() {
    try {
      const raw = JSON.parse(localStorage.getItem(STORE) || '[]');
      if (Array.isArray(raw) && raw.length) return raw;
    } catch {}
    // First run: seed with defaults
    localStorage.setItem(STORE, JSON.stringify(SEEDS));
    return SEEDS.slice();
  }
  function save(list) { localStorage.setItem(STORE, JSON.stringify(list)); }

  function getAll() { return load(); }
  function get(id) { return load().find(p => p.id === id); }
  function add(prompt) {
    const list = load();
    const item = {
      id: 'p-' + Math.random().toString(36).slice(2, 10),
      name: prompt.name || '(untitled)',
      template: prompt.template || '',
      category: prompt.category || 'other',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    list.unshift(item);
    save(list);
    return item;
  }
  function update(id, patch) {
    const list = load();
    const i = list.findIndex(p => p.id === id);
    if (i < 0) return null;
    list[i] = { ...list[i], ...patch, updatedAt: Date.now() };
    save(list);
    return list[i];
  }
  function remove(id) {
    const list = load().filter(p => p.id !== id);
    save(list);
  }
  function apply(template, values) {
    let out = String(template || '');
    Object.entries(values || {}).forEach(([k, v]) => {
      out = out.split('{' + k + '}').join(String(v ?? ''));
    });
    return out;
  }

  // ---- Picker UI (bottom-sheet style on mobile, centered card on desktop) ----
  const style = document.createElement('style');
  style.textContent = `
    .pl-backdrop { position: fixed; inset: 0; background: rgba(0,0,0,0.55); backdrop-filter: blur(4px); display: none; align-items: center; justify-content: center; padding: 40px 20px; z-index: 940; overflow-y: auto; }
    .pl-backdrop.show { display: flex; }
    .pl-panel { background: #1e1e2e; color: #cdd6f4; border-radius: 14px; padding: 18px 20px; max-width: 520px; width: 100%; box-shadow: 0 30px 60px rgba(0,0,0,0.5); border: 1px solid #3b3b54; }
    html[data-theme="light"] .pl-panel { background: #ffffff; color: #1e293b; border-color: #e2e8f0; }
    .pl-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; }
    .pl-head h3 { font-size: 1rem; font-weight: 600; }
    .pl-search { width: 100%; padding: 8px 12px; border: 1px solid #45475a; border-radius: 8px; background: #313244; color: inherit; font-size: 0.88rem; outline: none; margin-bottom: 10px; }
    html[data-theme="light"] .pl-search { background: #f8fafc; border-color: #e2e8f0; }
    .pl-list { max-height: 400px; overflow-y: auto; display: flex; flex-direction: column; gap: 4px; }
    .pl-item { padding: 10px 12px; border-radius: 8px; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.06); cursor: pointer; transition: all 0.15s ease; }
    html[data-theme="light"] .pl-item { background: #f8fafc; border-color: #e2e8f0; }
    .pl-item:hover { border-color: #a78bfa; background: rgba(167,139,250,0.1); }
    .pl-item-name { font-size: 0.9rem; font-weight: 500; }
    .pl-item-preview { font-size: 0.72rem; color: #9399b2; margin-top: 3px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .pl-empty { text-align: center; padding: 20px; color: #9399b2; font-style: italic; font-size: 0.85rem; }
    .pl-manage { text-align: center; margin-top: 10px; font-size: 0.75rem; color: #9399b2; }
    .pl-manage a { color: #a78bfa; text-decoration: none; cursor: pointer; }
    .pl-close { background: transparent; border: none; color: #9399b2; cursor: pointer; font-size: 1.4rem; padding: 0 4px; }
    @media (max-width: 640px) {
      .pl-backdrop { align-items: flex-end !important; padding: 0 !important; }
      .pl-panel { max-width: 100% !important; border-radius: 20px 20px 0 0 !important; padding-bottom: 80px !important; }
    }
  `;
  document.head.appendChild(style);

  const backdrop = document.createElement('div');
  backdrop.className = 'pl-backdrop';
  backdrop.innerHTML = `
    <div class="pl-panel" role="dialog" aria-label="Custom Prompts">
      <div class="pl-head">
        <h3>📚 Custom Prompts</h3>
        <button class="pl-close" id="plClose" aria-label="Close">✕</button>
      </div>
      <input class="pl-search" id="plSearch" type="text" placeholder="Search prompts...">
      <div class="pl-list" id="plList"></div>
      <div class="pl-manage">Manage prompts in <a id="plManage">⚙ Settings</a></div>
    </div>
  `;
  document.body.appendChild(backdrop);
  const listEl = backdrop.querySelector('#plList');
  const searchEl = backdrop.querySelector('#plSearch');
  let currentCb = null;

  function renderList(filter = '') {
    listEl.textContent = '';
    const q = filter.toLowerCase().trim();
    const items = load().filter(p =>
      !q || p.name.toLowerCase().includes(q) || (p.template || '').toLowerCase().includes(q)
    );
    if (!items.length) {
      const em = document.createElement('div'); em.className = 'pl-empty';
      em.textContent = q ? 'No matching prompts.' : 'No prompts yet — add some in Settings.';
      listEl.appendChild(em); return;
    }
    items.forEach(p => {
      const el = document.createElement('div');
      el.className = 'pl-item';
      el.innerHTML = `<div class="pl-item-name"></div><div class="pl-item-preview"></div>`;
      el.querySelector('.pl-item-name').textContent = p.name;
      el.querySelector('.pl-item-preview').textContent = (p.template || '').slice(0, 90);
      el.onclick = () => {
        if (currentCb) currentCb(p);
        close();
      };
      listEl.appendChild(el);
    });
  }
  function open(callback) {
    currentCb = callback;
    searchEl.value = '';
    renderList('');
    backdrop.classList.add('show');
    setTimeout(() => searchEl.focus(), 60);
  }
  function close() {
    backdrop.classList.remove('show');
    currentCb = null;
  }

  searchEl.addEventListener('input', () => renderList(searchEl.value));
  backdrop.querySelector('#plClose').onclick = close;
  backdrop.addEventListener('click', e => { if (e.target === backdrop) close(); });
  backdrop.querySelector('#plManage').onclick = (e) => {
    e.preventDefault(); close();
    if (window.Settings?.open) window.Settings.open();
  };
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && backdrop.classList.contains('show')) close();
  });

  window.PromptLib = {
    getAll, get, add, update, remove, apply,
    pick: open, close,
    spotlight: pickSpotlight,
    spotlightSizes: spotlightLibrarySizes,
  };
})();
