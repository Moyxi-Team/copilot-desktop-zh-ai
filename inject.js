// GitHub Copilot 桌面端中文汉化注入器 v7 (WebView2 CDP)
const fs = require('fs');
const path = require('path');
const http = require('http');
const { execFile } = require('child_process');
const DICT_PATH = path.join(__dirname, 'dictionary.json');
const AUTO_CACHE_DIR = process.env.COPILOT_ZH_CACHE_DIR || path.join(__dirname, 'cache');
const LOG_PATH = path.join(AUTO_CACHE_DIR, 'injector.log');
const UPSTREAM_REFRESH_MS = 6 * 60 * 60 * 1000;
let upstreamDictionary = null;
let lastUpstreamRefresh = 0;
let upstreamRefresh = null;
let lastCDPWarningAt = 0;

fs.mkdirSync(AUTO_CACHE_DIR, { recursive: true });

for (const level of ['log', 'warn', 'error']) {
  const original = console[level].bind(console);
  console[level] = (...values) => {
    const line = new Date().toISOString() + ' [' + level.toUpperCase() + '] ' +
      values.map((value) => value instanceof Error ? (value.stack || value.message) : String(value)).join(' ');
    try {
      fs.appendFileSync(LOG_PATH, line + '\n', 'utf8');
    } catch (error) {
      process.stderr.write('[copilot-zh] 日志写入失败：' + error.message + '\n');
    }
    original(...values);
  };
}

function mergeDictionaries(local, upstream) {
  const merged = { ...(upstream || {}), ...local };
  merged.texts = { ...((upstream && upstream.texts) || {}), ...(local.texts || {}) };
  for (const section of ['attrs', 'wholeElements']) {
    merged[section] = { ...((upstream && upstream[section]) || {}), ...(local[section] || {}) };
  }
  for (const section of ['textPatterns', 'attrPatterns']) {
    merged[section] = [...(local[section] || []), ...((upstream && upstream[section]) || [])];
  }
  return merged;
}

function refreshUpstreamDictionary() {
  if (upstreamRefresh) return upstreamRefresh;
  lastUpstreamRefresh = Date.now();
  upstreamRefresh = new Promise((resolve) => {
    execFile(
      'gh',
      ['api', 'repos/zhao818/copilot-desktop-zh/contents/dictionary.json', '--jq', '.content'],
      { encoding: 'utf8', timeout: 15000, maxBuffer: 4 * 1024 * 1024 },
      (error, stdout, stderr) => {
        if (error) {
          console.warn('[copilot-zh] 上游词典同步失败，将继续使用本地词典：' + (stderr.trim() || error.message));
          resolve(false);
          return;
        }
        try {
          const decoded = Buffer.from(stdout.trim(), 'base64').toString('utf8');
          const parsed = JSON.parse(decoded);
          if (!parsed || typeof parsed.texts !== 'object') throw new Error('上游词典结构无效');
          upstreamDictionary = parsed;
          lastUpstreamRefresh = Date.now();
          console.log('[copilot-zh] 已同步上游词典');
          resolve(true);
        } catch (parseError) {
          console.warn('[copilot-zh] 上游词典解析失败，将继续使用本地词典：' + parseError.message);
          resolve(false);
        }
      }
    );
  }).finally(() => {
    upstreamRefresh = null;
  });
  return upstreamRefresh;
}

function buildPayload() {
  const localDictionary = JSON.parse(fs.readFileSync(DICT_PATH, 'utf8'));
  const DICT = mergeDictionaries(localDictionary, upstreamDictionary);
  return "(() => {" +
    "const DICT = " + JSON.stringify(DICT) + ";" +
    "const textRes = (DICT.textPatterns || []).map(([p, r, f]) => [new RegExp(p, f), r]);" +
    "const attrRes = (DICT.attrPatterns || []).map(([p, r, f]) => [new RegExp(p, f), r]);" +
    "const wholeEls = DICT.wholeElements || {};" +
    "const contextualTexts = DICT.contextualTexts || {};" +
    "const isEffortMenuOption = node => {" +
    "  const item = node && node.closest && node.closest('[role=\"option\"],[role=\"menuitem\"],[role=\"menuitemradio\"],[role=\"menuitemcheckbox\"],[role=\"radio\"],button');" +
    "  if (!item) return false;" +
    "  const popup = item.closest('[role=\"listbox\"],[role=\"menu\"],[role=\"radiogroup\"]');" +
    "  if (!popup) return false;" +
    "  const scope = popup.getRootNode();" +
    "  const labels = [popup.getAttribute('aria-label'), popup.getAttribute('aria-description'), popup.textContent];" +
    "  const findById = id => scope.getElementById ? scope.getElementById(id) : [...scope.querySelectorAll('[id]')].find(el => el.id === id);" +
    "  const addLabelledText = el => (el.getAttribute('aria-labelledby') || '').split(/\\s+/).filter(Boolean).forEach(id => { const labelled = findById(id); if (labelled) labels.push(labelled.textContent); });" +
    "  addLabelledText(popup);" +
    "  if (popup.id) [...scope.querySelectorAll('[aria-controls],[aria-owns]')].forEach(el => {" +
    "    const ids = ((el.getAttribute('aria-controls') || '') + ' ' + (el.getAttribute('aria-owns') || '')).split(/\\s+/);" +
    "    if (ids.includes(popup.id)) { labels.push(el.getAttribute('aria-label'), el.textContent); addLabelledText(el); }" +
    "  });" +
    "  return labels.some(value => /(?:^|[^a-z])(?:effort level|reasoning effort|auto effort levels|强度等级|推理强度|auto 努力度等级)(?:$|[^a-z])/i.test(value || '')) || /(?:extra high|超高)/i.test(popup.textContent || '');" +
    "};" +
    "const isSidebarPinnedTitle = (node, attribute) => {" +
    "  const button = node && node.closest && node.closest('button[aria-label=\"Pinned\"],button[aria-label=\"已固定\"]');" +
    "  return !!button && (node !== button || attribute === 'aria-label') && !!button.closest('[data-testid=\"repository-group-row\"]') && !!button.closest('[role=\"tree\"]');" +
    "};" +
    "const contextualText = (value, node, attribute) => {" +
    "  const entry = contextualTexts[value];" +
    "  if (!entry) return undefined;" +
    "  if (entry.context === 'effort-menu-option' && isEffortMenuOption(node)) return entry.translation;" +
    "  if (entry.context === 'sidebar-pinned-title' && isSidebarPinnedTitle(node, attribute)) return entry.translation;" +
    "  return undefined;" +
    "};" +
    "const SAMPLE_RE = /^(.+)\\. Creates a sample project\\.$/;" +
    "const CHAT_RE = /^Chat: (.+)$/" + ";" +
    "const isThinkingLabel = value => /^(?:Thinking|Think|思考中)(?:\\.{3}|…)?$/i.test(value.trim());" +
    "const normalizeThinkingLabels = root => {" +
    "  const scope = root.body || root;" +
    "  const compact = value => value.trim().replace(/[\\s·•|]+/g, '').replace(/\\.{3}|…/g, '');" +
    "  const isSequence = value => /^(?:(?:Thinking|Think|思考中))+$/i.test(compact(value));" +
    "  const hasEnglish = value => /(?:Thinking|Think)/i.test(compact(value));" +
    "  const hasChinese = value => /思考中/.test(compact(value));" +
    "  const candidates = [...scope.querySelectorAll('*')].filter(el => isSequence(el.textContent) && !el.closest('pre, code, script, style, textarea, [contenteditable=\"true\"]'));" +
    "  const collapse = el => {" +
    "    const translated = /(?:\\.{3}|…)\\s*$/.test(el.textContent) ? '思考中…' : '思考中';" +
    "    replaceThinkingText(el, translated, root);" +
    "  };" +
    "  candidates.filter(el => hasEnglish(el.textContent) && hasChinese(el.textContent)).forEach(el => {" +
    "    if ([...el.children].some(child => isSequence(child.textContent) && hasEnglish(child.textContent) && hasChinese(child.textContent))) return;" +
    "    collapse(el);" +
    "  });" +
    "  [...scope.querySelectorAll('*')].filter(el => isSequence(el.textContent) && hasEnglish(el.textContent) && !hasChinese(el.textContent) && !el.closest('pre, code, script, style, textarea, [contenteditable=\"true\"]')).forEach(el => {" +
    "    if ([...el.children].some(child => isSequence(child.textContent) && hasEnglish(child.textContent) && !hasChinese(child.textContent))) return;" +
    "    collapse(el);" +
    "  });" +
    "};" +
    "const ensureThinkingLabelStyle = root => {" +
    "  if (root.querySelector('style[data-copilot-zh-thinking-style]')) return;" +
    "  const style = (root.ownerDocument || root).createElement('style');" +
    "  style.setAttribute('data-copilot-zh-thinking-style', '');" +
    "  style.textContent = '@keyframes copilot-zh-thinking-shimmer{from{background-position:100% 0}to{background-position:-100% 0}}[data-copilot-zh-thinking-label]{position:relative!important;display:inline-block!important;font-weight:700!important;color:inherit!important;opacity:1!important;-webkit-text-fill-color:currentColor!important}[data-copilot-zh-thinking-label]::after{content:attr(data-copilot-zh-thinking-label)!important;position:absolute!important;inset:0!important;overflow:hidden!important;white-space:nowrap!important;pointer-events:none!important;font:inherit!important;font-weight:700!important;background-image:linear-gradient(105deg,transparent 0%,transparent 43%,rgba(255,255,255,.95) 50%,transparent 57%,transparent 100%)!important;background-size:250% 100%!important;background-position:100% 0;background-repeat:no-repeat;-webkit-background-clip:text!important;background-clip:text!important;-webkit-text-fill-color:transparent!important;animation:copilot-zh-thinking-shimmer 1.8s linear infinite!important}@media(prefers-reduced-motion:reduce){[data-copilot-zh-thinking-label]::after{display:none!important}}';" +
    "  (root.head || root.documentElement || root).appendChild(style);" +
    "};" +
    "const markThinkingLabel = (el, label, root = document) => {" +
    "  if (!el) return;" +
    "  el.setAttribute('data-copilot-zh-thinking-label', label || el.textContent.trim());" +
    "  ensureThinkingLabelStyle(root);" +
    "};" +
    "const replaceThinkingText = (el, label, owner = document) => {" +
    "  if (!el) return false;" +
    "  const documentRoot = owner.ownerDocument || owner;" +
    "  const walker = documentRoot.createTreeWalker(el, NodeFilter.SHOW_TEXT);" +
    "  const nodes = [];" +
    "  let node;" +
    "  while (node = walker.nextNode()) if (node.textContent.trim()) nodes.push(node);" +
    "  if (!nodes.length) return false;" +
    "  nodes[0].nodeValue = label;" +
    "  nodes.slice(1).forEach(textNode => { textNode.nodeValue = ''; });" +
    "  markThinkingLabel(el, label, owner);" +
    "  return true;" +
    "};" +
    "const apply = () => {" +
    "  try {" +
    "    let replaced = 0;" +
    "    normalizeThinkingLabels(document);" +
    "    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);" +
    "    let n;" +
    "    while (n = walker.nextNode()) {" +
    "      const parent = n.parentElement;" +
    "      if (!parent || parent.closest('pre, code, script, style, textarea, [contenteditable=\"true\"]')) continue;" +
    "      const t = n.textContent.trim();" +
    "      if (!t || t.length > 400 || t.length < 2) continue;" +
    "      if (DICT.texts[t] !== undefined) {" +
    "        if (isThinkingLabel(t)) markThinkingLabel(parent, DICT.texts[t]);" +
    "        if (n.nodeValue.trim() !== DICT.texts[t]) { n.nodeValue = DICT.texts[t]; replaced++; }" +
    "        continue;" +
    "      }" +
    "      const contextual = contextualText(t, parent);" +
    "      if (contextual !== undefined) { if (n.nodeValue.trim() !== contextual) { n.nodeValue = contextual; replaced++; } continue; }" +
    "      for (let i = 0; i < textRes.length; i++) {" +
    "        textRes[i][0].lastIndex = 0;" +
    "        if (textRes[i][0].test(t)) {" +
    "          const v = t.replace(textRes[i][0], textRes[i][1]);" +
    "          if (n.nodeValue !== v) { n.nodeValue = v; replaced++; }" +
    "          break;" +
    "        }" +
    "      }" +
    "    }" +
    "    normalizeThinkingLabels(document);" +
    "    [...document.querySelectorAll('body *')].reverse().forEach(el => {" +
    "      if (el.closest('pre, code, script, style, textarea, [contenteditable=\"true\"]')) return;" +
    "      const full = (el.innerText || el.textContent || '').replace(/\\s+/g, ' ').trim();" +
    "      if (!full || full.length > 500) return;" +
    "      let v = DICT.texts[full];" +
    "      if (v === undefined) {" +
    "        for (let i = 0; i < textRes.length; i++) {" +
    "          textRes[i][0].lastIndex = 0;" +
    "          if (textRes[i][0].test(full)) { v = full.replace(textRes[i][0], textRes[i][1]); break; }" +
    "        }" +
    "      }" +
    "      if (v === undefined) v = contextualText(full, el);" +
    "      if (v !== undefined && isThinkingLabel(full)) {" +
    "        if (replaceThinkingText(el, v, document)) replaced++;" +
    "        return;" +
    "      }" +
    "      if (v !== undefined && (el.innerText || el.textContent).replace(/\\s+/g, ' ').trim() !== v) { el.textContent = v; replaced++; }" +
    "    });" +
    "    document.querySelectorAll('body *').forEach(el => {" +
    "      if (el.children.length > 0) return;" +
    "const tn = [...el.childNodes].filter(c => c.nodeType === 3 && c.textContent.trim());" +
    "const full = el.textContent.trim();" +
    "      if (wholeEls[full] !== undefined && el.textContent !== wholeEls[full]) { el.textContent = wholeEls[full]; replaced++; return; }" +
    "      const cm = CHAT_RE.exec(full);" +
    "      if (cm) { const title = DICT.texts[cm[1]] !== undefined ? DICT.texts[cm[1]] : cm[1]; const target = '聊天: ' + title; if (el.textContent !== target) { el.textContent = target; replaced++; } return; }" +
    "    });" +
    "    document.querySelectorAll('[placeholder],[data-placeholder],[aria-placeholder],[aria-label],[title],[alt]').forEach(el => {" +
    "      ['placeholder','data-placeholder','aria-placeholder','aria-label','title','alt'].forEach(a => {" +
    "        const v = el.getAttribute(a);" +
    "        if (!v) return;" +
    "        if (DICT.attrs[v] !== undefined) { el.setAttribute(a, DICT.attrs[v]); return; }" +
    "        if (DICT.texts[v] !== undefined) { el.setAttribute(a, DICT.texts[v]); return; }" +
    "        const contextual = contextualText(v, el, a);" +
    "        if (contextual !== undefined) { el.setAttribute(a, contextual); return; }" +
    "        const sm = SAMPLE_RE.exec(v);" +
    "        if (sm && DICT.texts[sm[1]] !== undefined) { el.setAttribute(a, DICT.texts[sm[1]] + '。创建示例项目。'); return; }" +
    "            for (let i = 0; i < attrRes.length; i++) { attrRes[i][0].lastIndex = 0; if (attrRes[i][0].test(v)) { attrRes[i][0].lastIndex = 0; el.setAttribute(a, v.replace(attrRes[i][0], attrRes[i][1])); break; } }" +
    "      });" +
    "    });" +
    "    document.querySelectorAll('[role=\"tooltip\"],[data-base-ui-tooltip-content],[data-base-ui-tooltip-popup]').forEach(el => {" +
    "      const full = el.textContent.trim();" +
    "      if (!full || full.length > 500) return;" +
    "      if (wholeEls[full] !== undefined) { el.textContent = wholeEls[full]; replaced++; return; }" +
    "      if (DICT.texts[full] !== undefined) { el.textContent = DICT.texts[full]; replaced++; return; }" +
    "          for (let i = 0; i < textRes.length; i++) { textRes[i][0].lastIndex = 0; if (textRes[i][0].test(full)) { textRes[i][0].lastIndex = 0; el.textContent = full.replace(textRes[i][0], textRes[i][1]); replaced++; break; } }" +
    "    });" +
    "    const shadowRoots = [];" +
    "    const collectShadowRoots = root => {" +
    "      root.querySelectorAll('*').forEach(el => { if (el.shadowRoot) { shadowRoots.push(el.shadowRoot); collectShadowRoots(el.shadowRoot); } });" +
    "    };" +
    "    collectShadowRoots(document);" +
    "    shadowRoots.forEach(root => {" +
    "      normalizeThinkingLabels(root);" +
    "      const sw = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);" +
    "      let sn;" +
    "      while (sn = sw.nextNode()) {" +
    "        const st = sn.textContent.trim();" +
    "        if (!st || st.length > 500) continue;" +
    "        let sv = DICT.texts[st];" +
    "        if (sv === undefined) { for (let i = 0; i < textRes.length; i++) { textRes[i][0].lastIndex = 0; if (textRes[i][0].test(st)) { textRes[i][0].lastIndex = 0; sv = st.replace(textRes[i][0], textRes[i][1]); break; } } }" +
    "        if (sv === undefined) sv = contextualText(st, sn.parentElement);" +
    "        if (sv !== undefined && isThinkingLabel(st)) markThinkingLabel(sn.parentElement, sv, root);" +
    "        if (sv !== undefined && sn.nodeValue !== sv) { sn.nodeValue = sv; replaced++; }" +
    "      }" +
    "      normalizeThinkingLabels(root);" +
    "      root.querySelectorAll('[placeholder],[data-placeholder],[aria-placeholder],[aria-label],[title],[alt]').forEach(el => {" +
    "        ['placeholder','data-placeholder','aria-placeholder','aria-label','title','alt'].forEach(a => { const av = el.getAttribute(a); if (!av) return; if (DICT.attrs[av] !== undefined) { el.setAttribute(a, DICT.attrs[av]); return; } if (DICT.texts[av] !== undefined) { el.setAttribute(a, DICT.texts[av]); return; } const contextual = contextualText(av, el, a); if (contextual !== undefined) { el.setAttribute(a, contextual); return; } for (let i = 0; i < attrRes.length; i++) { attrRes[i][0].lastIndex = 0; if (attrRes[i][0].test(av)) { attrRes[i][0].lastIndex = 0; el.setAttribute(a, av.replace(attrRes[i][0], attrRes[i][1])); break; } } });" +
    "      });" +
    "    });" +
    "    if (document.title === 'GitHub Copilot') document.title = 'GitHub Copilot 中文版';" +
    "    return { replaced };" +
    "  } catch (e) { return 'ERR:' + e.message; }" +
    "};" +
    "const res = apply();" +
    "if (window.__copilotZhObs) { try { window.__copilotZhObs.disconnect(); } catch (e) {} }" +
    "if (window.__copilotZhTimer) { clearInterval(window.__copilotZhTimer); }" +
    "const mo = new MutationObserver(() => { clearTimeout(window.__copilotZhDbt); window.__copilotZhDbt = setTimeout(apply, 200); });" +
    "    mo.observe(document.body, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ['aria-label','placeholder','data-placeholder','aria-placeholder','title','alt'] });" +
    "window.__copilotZhObs = mo;" +
    "window.__copilotZhTimer = setInterval(apply, 1200);" +
    "window.__copilotZhInstalled = true;" +
    "return res;" +
    "})()";
}

function getTargets() {
  return new Promise((resolve, reject) => {
    const request = http.get('http://127.0.0.1:9222/json', (res) => {
      let data = '';
      res.setEncoding('utf8');
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        if (res.statusCode < 200 || res.statusCode >= 300) {
          resolve([]);
          return;
        }
        try {
          const targets = JSON.parse(data);
          if (!Array.isArray(targets)) throw new Error('CDP 返回的目标列表格式无效');
          if (!targets.some((target) => target.type === 'page') && Date.now() - lastCDPWarningAt > 10000) {
            console.warn('[copilot-zh] CDP 端口已连接，但没有可注入的页面目标。');
            lastCDPWarningAt = Date.now();
          }
          resolve(targets);
        } catch (error) {
          console.warn('[copilot-zh] 无法解析 CDP 目标列表：' + error.message);
          resolve([]);
        }
      });
    });
    request.setTimeout(2000, () => request.destroy(new Error('CDP 连接超时')));
    request.on('error', (error) => {
      if (Date.now() - lastCDPWarningAt > 10000) {
        console.warn('[copilot-zh] 无法连接 CDP 端口 9222：' + (error.code || error.message));
        lastCDPWarningAt = Date.now();
      }
      resolve([]);
    });
  });
}

function injectOnce(wsUrl, payload) {
  return new Promise((resolve) => {
    let ws;
    try { ws = new WebSocket(wsUrl); } catch (e) { resolve('wserr'); return; }
    const timer = setTimeout(() => { try { ws.close(); } catch (e) {} resolve('timeout'); }, 8000);
    ws.onopen = () => { ws.send(JSON.stringify({ id: 1, method: 'Runtime.evaluate', params: { expression: payload, returnByValue: true } })); };
    ws.onmessage = (e) => {
      try {
        const m = JSON.parse(e.data);
        if (m.id === 1) {
          const v = m.result && m.result.result && m.result.result.value;
          clearTimeout(timer); ws.close();
          resolve(v || 'no-return');
        }
      } catch (err) { }
    };
    ws.onerror = () => { clearTimeout(timer); try { ws.close(); } catch (e) {} resolve('wserror'); };
    ws.onclose = () => { clearTimeout(timer); resolve('wsclosed'); };
  });
}

function isTranslationPage(target) {
  if (target.type !== 'page' || !target.webSocketDebuggerUrl || !target.url) return false;
  return /^http:\/\/(?:tauri\.localhost(?:\/|$)|127\.0\.0\.1:\d+\/canvases\/[0-9a-f-]{36}\/?(?:[?#].*)?$)/i.test(target.url);
}

async function loop() {
  let lastLog = 0;
  while (true) {
    if (Date.now() - lastUpstreamRefresh >= UPSTREAM_REFRESH_MS) {
      refreshUpstreamDictionary();
    }
    const payload = buildPayload();
    const targets = await getTargets();
    const pages = targets.filter(isTranslationPage);
    if (pages.length) {
      const results = await Promise.all(pages.map(page => injectOnce(page.webSocketDebuggerUrl, payload)));
      const now = Date.now();
      if (now - lastLog > 10000) {
        const summary = pages.map((page, index) => {
          const result = results[index];
          const label = page.url.startsWith('http://tauri.localhost/') ? 'app' : 'canvas';
          return label + ':' + (result && typeof result === 'object' ? 'replaced:' + result.replaced : result);
        }).join(', ');
        console.log('[copilot-zh] ' + new Date().toLocaleTimeString() + ' apply: ' + summary);
        lastLog = now;
      }
    }
    await new Promise(r => setTimeout(r, 3000));
  }
}
console.log('[copilot-zh] 汉化注入器 v7 已启动');
loop().catch(e => { console.error(e); process.exit(1); });