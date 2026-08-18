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

  // ---- <mini-chart> — dependency-free SVG chart (line | bar | donut) ----
  // Theme-aware (currentColor / CSS vars), animates in (respects prefers-reduced-motion),
  // responsive (ResizeObserver keeps the viewBox 1:1 with pixel width), empty-state aware.
  const MC_PALETTE = ['#6366f1', '#0ea5e9', '#22c55e', '#f59e0b', '#ec4899', '#a78bfa', '#ef4444', '#14b8a6', '#f97316', '#84cc16'];

  function mcSmoothLine(pts) {
    if (!pts.length) return '';
    if (pts.length === 1) return 'M' + pts[0].x + ',' + pts[0].y;
    let d = 'M' + pts[0].x + ',' + pts[0].y;
    const t = 0.18;
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[i - 1] || pts[i], p1 = pts[i], p2 = pts[i + 1], p3 = pts[i + 2] || p2;
      const c1x = p1.x + (p2.x - p0.x) * t, c1y = p1.y + (p2.y - p0.y) * t;
      const c2x = p2.x - (p3.x - p1.x) * t, c2y = p2.y - (p3.y - p1.y) * t;
      d += ' C' + c1x + ',' + c1y + ' ' + c2x + ',' + c2y + ' ' + p2.x + ',' + p2.y;
    }
    return d;
  }

  if (typeof document !== 'undefined' && !document.getElementById('mc-style')) {
    const st = document.createElement('style');
    st.id = 'mc-style';
    st.textContent = [
      '.mc-root{width:100%}',
      '.mc-svg{display:block;width:100%;overflow:visible}',
      '.mc-axis{font-size:10px;fill:var(--muted,#8a8f98)}',
      '.mc-tip-bg{fill:rgba(28,30,38,.95)}',
      '.mc-tip-tx{fill:#fff;font-size:11px;font-weight:600}',
      '.mc-empty{display:flex;align-items:center;justify-content:center;color:var(--muted,#8a8f98);font-size:.85rem;border:1px dashed var(--border,#d0d3d9);border-radius:10px;background:var(--field,rgba(127,127,127,.05))}',
      '.mc-donut-wrap{display:flex;gap:18px;align-items:center;flex-wrap:wrap}',
      '.mc-donut-svg{flex:0 0 auto;overflow:visible}',
      '.mc-track{stroke:var(--field,rgba(127,127,127,.14))}',
      '.mc-cn{fill:var(--text,currentColor);font-size:16px;font-weight:700}',
      '.mc-cl{fill:var(--muted,#8a8f98);font-size:10px}',
      '.mc-legend{list-style:none;margin:0;padding:0;flex:1 1 140px;min-width:130px;display:flex;flex-direction:column;gap:7px}',
      '.mc-legend li{display:flex;align-items:center;gap:8px;font-size:.8rem}',
      '.mc-sw{width:11px;height:11px;border-radius:3px;flex:0 0 auto}',
      '.mc-lb{flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
      '.mc-lv{color:var(--muted,#8a8f98);font-variant-numeric:tabular-nums;white-space:nowrap}',
    ].join('');
    document.head.appendChild(st);
  }

  const MiniChart = {
    name: 'MiniChart',
    props: {
      type: { type: String, default: 'bar' },        // 'line' | 'bar' | 'donut'
      data: { type: Array, default: () => [] },       // number[] OR {label,value,color?}[]
      labels: { type: Array, default: () => [] },
      height: { type: Number, default: 160 },
      color: { type: String, default: '' },
      formatY: { type: Function, default: null },
    },
    data() {
      return { W: 320, hover: -1, anim: false, reduce: false, gid: 'mcg' + Math.random().toString(36).slice(2) };
    },
    computed: {
      accent() { return this.color || 'var(--accent, #6366f1)'; },
      items() {
        return (this.data || []).map((d, i) => {
          if (d && typeof d === 'object') {
            return { label: d.label != null ? d.label : (this.labels[i] != null ? this.labels[i] : ''), value: +d.value || 0, color: d.color || null };
          }
          return { label: this.labels[i] != null ? this.labels[i] : '', value: +d || 0, color: null };
        });
      },
      total() { return this.items.reduce((a, b) => a + (b.value > 0 ? b.value : 0), 0); },
      max() { return Math.max(1, ...this.items.map(it => it.value)); },
      hasData() { return this.items.length > 0 && (this.type === 'donut' ? this.total > 0 : this.items.some(it => Number.isFinite(it.value))); },
      geo() {
        const hasLbl = this.items.some(it => it.label != null && it.label !== '');
        const padL = 8, padR = 8, padT = 14, padB = hasLbl ? 20 : 8;
        return { padL, padR, padT, padB, w: Math.max(1, this.W - padL - padR), h: Math.max(1, this.height - padT - padB) };
      },
      linePoints() {
        const g = this.geo, n = this.items.length;
        return this.items.map((it, i) => ({
          x: g.padL + (n > 1 ? g.w * i / (n - 1) : g.w / 2),
          y: g.padT + g.h * (1 - Math.max(0, it.value) / this.max),
          value: it.value, label: it.label,
        }));
      },
      linePath() { return mcSmoothLine(this.linePoints); },
      areaPath() {
        const pts = this.linePoints; if (!pts.length) return '';
        const baseY = this.geo.padT + this.geo.h;
        return mcSmoothLine(pts) + ' L' + pts[pts.length - 1].x + ',' + baseY + ' L' + pts[0].x + ',' + baseY + ' Z';
      },
      lineDrawStyle() {
        return { strokeDasharray: 1, strokeDashoffset: this.anim ? 0 : 1, transition: this.reduce ? 'none' : 'stroke-dashoffset 900ms ease' };
      },
      bars() {
        const g = this.geo, n = this.items.length; if (!n) return [];
        const slot = g.w / n, bw = Math.min(slot * 0.62, 48), baseY = g.padT + g.h;
        return this.items.map((it, i) => {
          const bh = g.h * Math.max(0, it.value) / this.max;
          return {
            x: g.padL + slot * i + (slot - bw) / 2, y: baseY - bh, w: bw, h: bh,
            rx: Math.min(bw / 2, 6), cx: g.padL + slot * i + slot / 2,
            color: it.color || this.accent, label: it.label, value: it.value,
          };
        });
      },
      tipText() { const b = this.bars[this.hover]; return b ? (b.label ? b.label + ': ' : '') + this.fy(b.value) : ''; },
      tipW() { return Math.max(46, this.tipText.length * 7 + 16); },
      tipTransform() { const b = this.bars[this.hover]; return b ? 'translate(' + b.cx + ',' + b.y + ')' : ''; },
      dSize() { return this.height; },
      dC() { return this.dSize / 2; },
      dW() { return Math.max(10, this.dSize * 0.16); },
      dR() { return this.dSize / 2 - this.dW / 2 - 2; },
      donutCirc() { return 2 * Math.PI * this.dR; },
      donutSlices() {
        const C = this.donutCirc, tot = this.total; if (!tot) return [];
        let acc = 0;
        return this.items.filter(it => it.value > 0).map((it, i) => {
          const frac = it.value / tot, dash = frac * C;
          const s = { label: it.label, value: it.value, dash, gap: C - dash, offset: -acc * C, color: it.color || MC_PALETTE[i % MC_PALETTE.length], pct: Math.round(frac * 100) };
          acc += frac; return s;
        });
      },
    },
    methods: {
      fy(v) { try { return this.formatY ? this.formatY(v) : Math.round(v).toLocaleString('en-US'); } catch (e) { return String(v); } },
      animStyle(delay) { return { opacity: this.anim ? 1 : 0, transition: this.reduce ? 'none' : 'opacity 700ms ease ' + (delay || 0) + 'ms' }; },
      dotStyle(i) { return { opacity: this.anim ? 1 : 0, transition: this.reduce ? 'none' : 'opacity 300ms ease ' + (200 + i * 35) + 'ms' }; },
      barStyle(i) { return { transformBox: 'fill-box', transformOrigin: 'bottom', transform: this.anim ? 'scaleY(1)' : 'scaleY(0)', transition: this.reduce ? 'none' : 'transform 600ms cubic-bezier(.22,1,.36,1) ' + (i * 45) + 'ms' }; },
      sliceStyle(i) { return { transition: this.reduce ? 'none' : 'stroke-dasharray 800ms ease ' + (i * 90) + 'ms' }; },
      sliceDash(s) { return this.anim ? (s.dash + ' ' + s.gap) : ('0 ' + this.donutCirc); },
      measure() { const svg = this.$el && this.$el.querySelector('.mc-svg'); const w = (svg && svg.clientWidth) || (this.$el && this.$el.clientWidth); if (w) this.W = w; },
    },
    mounted() {
      this.reduce = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
      this.measure();
      if (window.ResizeObserver) { this._ro = new ResizeObserver(() => this.measure()); this._ro.observe(this.$el); }
      const go = () => { this.anim = true; };
      if (this.reduce) go();
      else requestAnimationFrame(() => requestAnimationFrame(go));
    },
    beforeUnmount() { if (this._ro) this._ro.disconnect(); },
    template: `
  <div class="mc-root" :class="'mc-'+type">
    <div v-if="!hasData" class="mc-empty" :style="{height: height+'px'}"><span>📊 ဒေတာ မရှိသေးပါ</span></div>

    <svg v-else-if="type==='line'" class="mc-svg" :viewBox="'0 0 '+W+' '+height" :height="height" preserveAspectRatio="none">
      <defs>
        <linearGradient :id="gid" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" :stop-color="accent" stop-opacity="0.35"></stop>
          <stop offset="100%" :stop-color="accent" stop-opacity="0"></stop>
        </linearGradient>
      </defs>
      <path :d="areaPath" :fill="'url(#'+gid+')'" :style="animStyle(150)"></path>
      <path :d="linePath" fill="none" :stroke="accent" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" pathLength="1" :style="lineDrawStyle"></path>
      <g v-for="(p,i) in linePoints" :key="i">
        <circle :cx="p.x" :cy="p.y" r="3.4" :fill="accent" :style="dotStyle(i)"></circle>
        <text v-if="p.label" :x="p.x" :y="height-6" text-anchor="middle" class="mc-axis">{{ p.label }}</text>
      </g>
    </svg>

    <svg v-else-if="type==='bar'" class="mc-svg" :viewBox="'0 0 '+W+' '+height" :height="height" preserveAspectRatio="none" @mouseleave="hover=-1">
      <g v-for="(b,i) in bars" :key="i">
        <rect :x="b.x" :y="b.y" :width="b.w" :height="b.h" :rx="b.rx" :fill="b.color" :style="barStyle(i)" @mouseenter="hover=i"></rect>
        <text v-if="b.label" :x="b.cx" :y="height-6" text-anchor="middle" class="mc-axis">{{ b.label }}</text>
      </g>
      <g v-if="hover>=0 && bars[hover]" class="mc-tip" :transform="tipTransform">
        <rect :x="-tipW/2" y="-30" :width="tipW" height="24" rx="6" class="mc-tip-bg"></rect>
        <text x="0" y="-14" text-anchor="middle" class="mc-tip-tx">{{ tipText }}</text>
      </g>
    </svg>

    <div v-else class="mc-donut-wrap">
      <svg class="mc-donut-svg" :viewBox="'0 0 '+dSize+' '+dSize" :width="dSize" :height="dSize" role="img">
        <circle :cx="dC" :cy="dC" :r="dR" fill="none" class="mc-track" :stroke-width="dW"></circle>
        <circle v-for="(s,i) in donutSlices" :key="i" :cx="dC" :cy="dC" :r="dR" fill="none" :stroke="s.color" :stroke-width="dW"
          :stroke-dasharray="sliceDash(s)" :stroke-dashoffset="s.offset" :transform="'rotate(-90 '+dC+' '+dC+')'" stroke-linecap="butt" :style="sliceStyle(i)"></circle>
        <text :x="dC" :y="dC-2" text-anchor="middle" class="mc-cn">{{ fy(total) }}</text>
        <text :x="dC" :y="dC+16" text-anchor="middle" class="mc-cl">စုစုပေါင်း</text>
      </svg>
      <ul class="mc-legend">
        <li v-for="(s,i) in donutSlices" :key="i">
          <span class="mc-sw" :style="{background:s.color}"></span>
          <span class="mc-lb">{{ s.label || ('#'+(i+1)) }}</span>
          <span class="mc-lv">{{ fy(s.value) }} · {{ s.pct }}%</span>
        </li>
      </ul>
    </div>
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
    app.component('mini-chart', MiniChart);
  }

  global.VueShared = { KEYS, DEFAULTS, callAI, AiSettingsDialog, HistoryList, ExportBar, MiniChart, useAiSettings, install, hasAnyKey, toast };
})(window);
