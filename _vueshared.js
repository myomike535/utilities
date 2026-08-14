/* _vueshared.js — shared Vue module for the Utilities suite.
   Load AFTER vue.global.prod.js + element-plus.full.min.js:
     <script src="vue.global.prod.js"></script>
     <script src="element-plus.full.min.js"></script>
     <script src="_vueshared.js"></script>
   Exposes window.VueShared:
     KEYS            — shared localStorage key names (same keys as the AI Note Taker tools)
     DEFAULTS        — OMODEL_DEFAULT + VALID_MODELS
     callAI(prompt, opts) — multi-provider router (Auto: Gemini → Groq → OpenRouter);
                            opts.onNoKeys() fires when no key is configured
     AiSettingsDialog — the ⚙ AI Settings el-dialog component (v-model = visibility)
     useAiSettings()  — { showSettings, hasKey, openSettings, hasAnyKey, readSettings, writeSettings }
     HistoryList      — <history-list :items :title-key :date-key @open @del> saved-item list
                        (.hist/.hist-item pattern, el-popconfirm delete, #title/#meta/#empty slots)
     ExportBar        — <export-bar :actions="[{label,icon,handler,type}]"> export/copy button row
     install(app)     — registers <ai-settings-dialog>, <history-list>, <export-bar> on the app
*/
(function (global) {
  'use strict';
  if (typeof Vue === 'undefined' || typeof ElementPlus === 'undefined') {
    console.warn('[VueShared] Vue / ElementPlus must be loaded before _vueshared.js');
    return;
  }

  // Shared with the AI Note Taker tools — one set of keys across the suite
  const KEYS = {
    GKEY: 'ainotes.enterprise.gemini.key',
    GMODEL: 'ainotes.enterprise.gemini.model',
    QKEY: 'ainotes.apikey.groq',
    QMODEL: 'ainotes.model.groq',
    OKEY: 'creator.apikey.openrouter',
    OMODEL: 'creator.model.openrouter',
    PREF_KEY: 'creator.ai.provider',   // auto | gemini | groq | openrouter
  };
  const DEFAULTS = {
    OMODEL_DEFAULT: 'google/gemini-2.0-flash-exp:free',   // free + strong Myanmar
    VALID_MODELS: ['gemini-2.5-flash', 'gemini-2.5-pro', 'gemini-2.0-flash'],
  };

  // Bumped whenever keys are saved so hasKey computeds stay live across the app
  const keyVersion = Vue.ref(0);

  const toast = (m, type = 'success') => ElementPlus.ElMessage({ message: m, type, duration: 3200 });

  function hasAnyKey() {
    return !!(localStorage.getItem(KEYS.GKEY) || localStorage.getItem(KEYS.QKEY) || localStorage.getItem(KEYS.OKEY));
  }

  function readSettings() {
    return {
      aiPref: localStorage.getItem(KEYS.PREF_KEY) || 'auto',
      gKey: localStorage.getItem(KEYS.GKEY) || '',
      qKey: localStorage.getItem(KEYS.QKEY) || '',
      oKey: localStorage.getItem(KEYS.OKEY) || '',
      oModel: localStorage.getItem(KEYS.OMODEL) || DEFAULTS.OMODEL_DEFAULT,
    };
  }
  function writeSettings(s) {
    (s.gKey || '').trim() ? localStorage.setItem(KEYS.GKEY, s.gKey.trim()) : localStorage.removeItem(KEYS.GKEY);
    (s.qKey || '').trim() ? localStorage.setItem(KEYS.QKEY, s.qKey.trim()) : localStorage.removeItem(KEYS.QKEY);
    (s.oKey || '').trim() ? localStorage.setItem(KEYS.OKEY, s.oKey.trim()) : localStorage.removeItem(KEYS.OKEY);
    (s.oModel || '').trim() ? localStorage.setItem(KEYS.OMODEL, s.oModel.trim()) : localStorage.removeItem(KEYS.OMODEL);
    localStorage.setItem(KEYS.PREF_KEY, s.aiPref || 'auto');
    keyVersion.value++;
  }

  // ---- AI providers: Gemini + Groq + OpenRouter with Auto fallback ----
  function geminiModel() {
    const m = localStorage.getItem(KEYS.GMODEL);
    if (m && DEFAULTS.VALID_MODELS.includes(m)) return m;
    if (m) localStorage.setItem(KEYS.GMODEL, 'gemini-2.5-flash');
    return 'gemini-2.5-flash';
  }
  async function callGemini(prompt) {
    const key = localStorage.getItem(KEYS.GKEY);
    if (!key) throw new Error('Gemini key မရှိပါ');
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${geminiModel()}:generateContent?key=${encodeURIComponent(key)}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ role: 'user', parts: [{ text: prompt }] }] }),
    });
    if (!res.ok) {
      let reason = ''; try { reason = JSON.parse(await res.text())?.error?.message || ''; } catch (e) {}
      throw new Error(`Gemini ${res.status}${reason ? ' — ' + reason.slice(0, 100) : ''}`);
    }
    const d = await res.json();
    return d.candidates?.[0]?.content?.parts?.[0]?.text || '';
  }
  async function callChatApi(url, key, model, prompt, label) {
    if (!key) throw new Error(label + ' key မရှိပါ');
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + key },
      body: JSON.stringify({ model, messages: [{ role: 'user', content: prompt }], max_tokens: 2000 }),
    });
    if (!res.ok) {
      let reason = ''; try { reason = JSON.parse(await res.text())?.error?.message || ''; } catch (e) {}
      throw new Error(`${label} ${res.status}${reason ? ' — ' + reason.slice(0, 100) : ''}`);
    }
    const d = await res.json();
    return d.choices?.[0]?.message?.content || '';
  }
  const callGroq = p => callChatApi('https://api.groq.com/openai/v1/chat/completions',
    localStorage.getItem(KEYS.QKEY), localStorage.getItem(KEYS.QMODEL) || 'llama-3.3-70b-versatile', p, 'Groq');
  const callOpenRouter = p => callChatApi('https://openrouter.ai/api/v1/chat/completions',
    localStorage.getItem(KEYS.OKEY), localStorage.getItem(KEYS.OMODEL) || DEFAULTS.OMODEL_DEFAULT, p, 'OpenRouter');

  // Provider router: honors the setting; Auto tries Gemini → Groq → OpenRouter
  async function callAI(prompt, opts) {
    opts = opts || {};
    const pref = localStorage.getItem(KEYS.PREF_KEY) || 'auto';
    const hasG = !!localStorage.getItem(KEYS.GKEY), hasQ = !!localStorage.getItem(KEYS.QKEY), hasO = !!localStorage.getItem(KEYS.OKEY);
    if (!hasG && !hasQ && !hasO) {
      if (typeof opts.onNoKeys === 'function') opts.onNoKeys();
      throw new Error('API key ထည့်ပါ (⚙ AI)');
    }
    if (pref === 'gemini') return callGemini(prompt);
    if (pref === 'groq') return callGroq(prompt);
    if (pref === 'openrouter') return callOpenRouter(prompt);
    const chain = [
      hasG && { name: 'Gemini', fn: callGemini },
      hasQ && { name: 'Groq', fn: callGroq },
      hasO && { name: 'OpenRouter', fn: callOpenRouter },
    ].filter(Boolean);
    let lastErr = null;
    for (let i = 0; i < chain.length; i++) {
      try { return await chain[i].fn(prompt); }
      catch (e) {
        lastErr = e;
        if (i < chain.length - 1) toast(`${chain[i].name} မရ — ${chain[i + 1].name} ဖြင့် ဆက်လုပ်နေသည်…`, 'warning');
      }
    }
    throw lastErr;
  }

  // ---- ⚙ AI Settings dialog component ----
  const AiSettingsDialog = {
    name: 'AiSettingsDialog',
    props: {
      modelValue: { type: Boolean, default: false },
      hint: { type: String, default: '' },   // extra sentence appended to the intro text
    },
    emits: ['update:modelValue', 'saved'],
    data() {
      const s = readSettings();
      return { aiPref: s.aiPref, gKeyInput: '', qKeyInput: '', oKeyInput: '', oModelInput: '' };
    },
    computed: {
      visible: {
        get() { return this.modelValue; },
        set(v) { this.$emit('update:modelValue', v); },
      },
    },
    watch: {
      modelValue: {
        handler(v) { if (v) this.loadFromStorage(); },
        immediate: true,
      },
    },
    methods: {
      loadFromStorage() {
        const s = readSettings();
        this.aiPref = s.aiPref;
        this.gKeyInput = s.gKey;
        this.qKeyInput = s.qKey;
        this.oKeyInput = s.oKey;
        this.oModelInput = s.oModel;
      },
      savePrefs() { localStorage.setItem(KEYS.PREF_KEY, this.aiPref); },
      saveKeys() {
        writeSettings({ aiPref: this.aiPref, gKey: this.gKeyInput, qKey: this.qKeyInput, oKey: this.oKeyInput, oModel: this.oModelInput });
        this.visible = false;
        const saved = {
          gemini: !!localStorage.getItem(KEYS.GKEY),
          groq: !!localStorage.getItem(KEYS.QKEY),
          openrouter: !!localStorage.getItem(KEYS.OKEY),
        };
        this.$emit('saved', saved);
        toast('🔑 သိမ်းပြီး — ' + (saved.gemini ? 'Gemini ✓ ' : '') + (saved.groq ? 'Groq ✓ ' : '') + (saved.openrouter ? 'OpenRouter ✓' : ''));
      },
    },
    template: `
  <el-dialog v-model="visible" title="⚙ AI Settings" width="min(460px, 94vw)">
    <div style="font-size:.78rem;color:var(--faint);margin-bottom:12px;line-height:1.7">
      Keys ကို ဤ browser ၏ localStorage တွင်သာ သိမ်းသည် — Note Taker tools များနှင့် မျှဝေသုံးသည်။<span v-if="hint"> {{ hint }}</span>
    </div>
    <label class="fl">Provider</label>
    <el-select v-model="aiPref" @change="savePrefs" style="width:100%">
      <el-option value="auto" label="🔄 Auto — Gemini → Groq → OpenRouter"></el-option>
      <el-option value="gemini" label="✨ Gemini only"></el-option>
      <el-option value="groq" label="⚡ Groq only"></el-option>
      <el-option value="openrouter" label="🌐 OpenRouter only"></el-option>
    </el-select>
    <label class="fl">Gemini API key <a href="https://aistudio.google.com/apikey" target="_blank" style="color:var(--accent-2)">aistudio.google.com/apikey</a></label>
    <el-input v-model="gKeyInput" type="password" show-password placeholder="AIza…" autocomplete="off"></el-input>
    <label class="fl">Groq API key <a href="https://console.groq.com/keys" target="_blank" style="color:var(--accent-2)">console.groq.com/keys</a></label>
    <el-input v-model="qKeyInput" type="password" show-password placeholder="gsk_…" autocomplete="off"></el-input>
    <label class="fl">OpenRouter API key <a href="https://openrouter.ai/keys" target="_blank" style="color:var(--accent-2)">openrouter.ai/keys</a></label>
    <el-input v-model="oKeyInput" type="password" show-password placeholder="sk-or-…" autocomplete="off"></el-input>
    <label class="fl">OpenRouter model (Myanmar အတွက် Gemini-family အကြံပြု)</label>
    <el-input v-model="oModelInput" placeholder="google/gemini-2.0-flash-exp:free" autocomplete="off"></el-input>
    <template #footer>
      <el-button @click="visible=false">Cancel</el-button>
      <el-button type="primary" @click="saveKeys">💾 Save</el-button>
    </template>
  </el-dialog>`,
  };

  // ---- <history-list> — shared saved-item list (.hist/.hist-item pattern) ----
  // Page CSS styles .hist / .hist-item / .ht / .hd; the component only emits the DOM.
  // Slots: #title="{item}" (custom title), #meta="{item}" (extra chips before the date), #empty.
  const HistoryList = {
    name: 'HistoryList',
    props: {
      items: { type: Array, default: () => [] },
      titleKey: { type: String, default: 'title' },
      dateKey: { type: String, default: 't' },
    },
    emits: ['open', 'del'],
    methods: {
      fmtDate(v) { return v ? new Date(v).toLocaleDateString() : ''; },
    },
    template: `
  <div class="hist">
    <template v-if="items && items.length">
      <div v-for="it in items" :key="it.id" class="hist-item" @click="$emit('open', it)">
        <span class="ht"><slot name="title" :item="it">{{ it[titleKey] }}</slot></span>
        <span class="hd">
          <slot name="meta" :item="it"></slot>
          <span>{{ fmtDate(it[dateKey]) }}</span>
        </span>
        <el-popconfirm title="ဖျက်မှာ သေချာလား?" confirm-button-text="ဖျက်မည်" cancel-button-text="မဖျက်ပါ" @confirm="$emit('del', it)">
          <template #reference>
            <el-button size="small" text @click.stop>🗑</el-button>
          </template>
        </el-popconfirm>
      </div>
    </template>
    <slot v-else name="empty"></slot>
  </div>`,
  };

  // ---- <export-bar> — shared export/copy button row ----
  // actions: [{ label, icon, handler, type? }] — icon is an emoji prefix, type is the el-button type.
  const ExportBar = {
    name: 'ExportBar',
    props: {
      actions: { type: Array, default: () => [] },
    },
    template: `
  <div class="export-bar" style="display:flex;gap:8px;flex-wrap:wrap">
    <el-button v-for="(a, i) in actions" :key="i" :type="a.type || 'default'"
      @click="a.handler && a.handler()">{{ a.icon ? a.icon + ' ' + a.label : a.label }}</el-button>
  </div>`,
  };

  // ---- composable ----
  function useAiSettings() {
    const showSettings = Vue.ref(false);
    const hasKey = Vue.computed(() => { keyVersion.value; return hasAnyKey(); });
    function openSettings() { showSettings.value = true; }
    return { showSettings, hasKey, openSettings, hasAnyKey, readSettings, writeSettings };
  }

  function install(app) {
    app.component('ai-settings-dialog', AiSettingsDialog);
    app.component('history-list', HistoryList);
    app.component('export-bar', ExportBar);
  }

  global.VueShared = { KEYS, DEFAULTS, callAI, AiSettingsDialog, HistoryList, ExportBar, useAiSettings, install, hasAnyKey, toast };
})(window);
