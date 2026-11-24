// Nūs on Android.
//
// The desktop app talks to Electron through window.nus. Capacitor gives the
// same renderer a native shell but no Electron, so this file supplies the same
// small API surface on top of localStorage and the device's own HTTP stack.
// It is a no-op outside Capacitor: the desktop keeps its Electron bridge.
(() => {
  'use strict';
  const native = Boolean(window.Capacitor?.isNativePlatform?.()) || /Android/i.test(navigator.userAgent);
  if (!native) return;

  const STATE_KEY = 'nus.mobile.state.v1';
  const API_KEY = 'nus.mobile.api.v1';
  const CUSTOM_KEY = 'nus.mobile.custom-api.v1';
  const STORE_VERSION = 1;

  const isoDay = (date = new Date()) => {
    const d = new Date(date);
    d.setHours(12, 0, 0, 0);
    return d.toISOString().slice(0, 10);
  };
  const plus = (days) => {
    const d = new Date();
    d.setDate(d.getDate() + days);
    return isoDay(d);
  };

  function defaultState() {
    return {
      version: STORE_VERSION,
      courses: [
        { id: 1, name: 'Linear Algebra', code: 'MATH 2418', credit_hours: 4, color: '#6f7cf5' },
        { id: 2, name: 'Computer Science II', code: 'COSC 1437', credit_hours: 4, color: '#6ad7c2' },
      ],
      assignments: [
        { id: 1, course_id: 1, title: 'Matrix transformations set', due_date: plus(1), status: 'pending' },
        { id: 2, course_id: 2, title: 'Linked list lab', due_date: plus(3), status: 'pending' },
      ],
      tasks: [
        {
          id: 1,
          title: 'Study for linear algebra midterm',
          course_name: 'Linear Algebra',
          due_date: plus(5),
          done: 0,
          estimated_minutes: 100,
          steps: [
            { id: 1, title: 'Collect the exact topics and materials', done: 1, estimated_minutes: 20 },
            { id: 2, title: 'Run a quick diagnostic without notes', done: 0, estimated_minutes: 20 },
            { id: 3, title: 'Review the weakest two topics', done: 0, estimated_minutes: 20 },
            { id: 4, title: 'Complete a timed practice pass', done: 0, estimated_minutes: 20 },
            { id: 5, title: 'Write the one-page final review sheet', done: 0, estimated_minutes: 20 },
          ],
        },
      ],
      sources: [
        { id: 1, title: 'Fall 2026 calendar.ics', source_type: 'calendar_file', raw_text: '' },
      ],
      integrations: [
        { provider: 'syllabus', label: 'Syllabus', status: 'ready', detail: 'Read a course syllabus with your own AI.' },
        { provider: 'calendar_file', label: 'Calendar file', status: 'connected', detail: 'Import an .ics calendar locally.' },
        { provider: 'google_calendar', label: 'Google Calendar', status: 'needs_credentials', detail: 'Live sync is available on desktop.' },
        { provider: 'canvas', label: 'Canvas', status: 'needs_credentials', detail: 'Requires your school Canvas domain.' },
        { provider: 'blackboard', label: 'Blackboard', status: 'needs_admin', detail: 'Requires campus approval.' },
        { provider: 'chatgpt_export', label: 'ChatGPT history', status: 'ready', detail: 'Import an exported JSON or HTML archive.' },
        { provider: 'claude_export', label: 'Claude history', status: 'ready', detail: 'Import exported JSON, HTML, Markdown, or text.' },
        { provider: 'google_docs', label: 'Google Docs', status: 'ready', detail: 'Import downloaded Docs as PDF, DOCX, Markdown, or text.' },
        { provider: 'icloud_notes', label: 'iCloud Notes', status: 'ready', detail: 'Import exported notes as HTML, Markdown, or text.' },
      ],
      automations: [
        { id: 1, name: 'Weekly calculus review', trigger_type: 'weekly', enabled: 1, run_count: 2, trigger: {}, action: {} },
      ],
      repeated_signals: [],
      preferences: { onboarded: true },
      activity: [
        { id: 2, action_type: 'assistant_reschedule', summary: 'Assignment 3 due date updated', detail: 'Changed from your syllabus context.', status: 'done', created_at: new Date(Date.now() - 1800000).toISOString() },
        { id: 1, action_type: 'assistant_draft', summary: 'Professor absence email drafted', detail: 'Used your usual professional tone.', status: 'review', created_at: new Date(Date.now() - 3600000).toISOString() },
      ],
      weights: [
        { id: 1, course_id: 1, category: 'Homework', weight_pct: 20 },
        { id: 2, course_id: 1, category: 'Midterm', weight_pct: 30 },
        { id: 3, course_id: 1, category: 'Final', weight_pct: 50 },
        { id: 4, course_id: 2, category: 'Labs', weight_pct: 25 },
        { id: 5, course_id: 2, category: 'Homework', weight_pct: 20 },
        { id: 6, course_id: 2, category: 'Midterm', weight_pct: 25 },
        { id: 7, course_id: 2, category: 'Final', weight_pct: 30 },
      ],
    };
  }

  function readJson(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? { ...fallback, ...JSON.parse(raw) } : fallback;
    } catch {
      return fallback;
    }
  }

  let state = readJson(STATE_KEY, defaultState());
  let custom = readJson(CUSTOM_KEY, { baseUrl: '', model: '', key: '' });
  let api = readJson(API_KEY, {});

  function persist() {
    localStorage.setItem(STATE_KEY, JSON.stringify(state));
    localStorage.setItem(CUSTOM_KEY, JSON.stringify(custom));
    localStorage.setItem(API_KEY, JSON.stringify(api));
  }

  function nextId(rows) {
    return rows.reduce((max, row) => Math.max(max, Number(row.id) || 0), 0) + 1;
  }

  function nextStepId() {
    return state.tasks.reduce((max, task) => Math.max(max, ...(task.steps || []).map((step) => Number(step.id) || 0)), 0) + 1;
  }

  function rankedToday() {
    const today = new Date();
    return state.assignments
      .filter((item) => item.status === 'pending')
      .map((item) => {
        const due = item.due_date ? new Date(`${item.due_date}T23:59:59`) : null;
        const daysLeft = due ? Math.floor((due - today) / 86400000) : null;
        const course = state.courses.find((c) => c.id === item.course_id);
        return { ...item, course_name: course?.name || 'General', days_left: daysLeft, reason: due ? `Due ${item.due_date}.` : 'No date.' };
      })
      .sort((a, b) => (a.days_left == null ? 999 : a.days_left) - (b.days_left == null ? 999 : b.days_left));
  }

  function projectedGpa() {
    const scale = state.preferences.gpa_scale || null;
    const courses = state.courses.map((course) => {
      const weights = state.weights.filter((row) => row.course_id === course.id);
      const assignments = state.assignments.filter((row) => row.course_id === course.id && row.status === 'done');
      const known = weights.reduce((sum, row) => sum + (Number(row.weight_pct) || 0), 0);
      const earned = weights.reduce((sum, row) => {
        const match = assignments.find((a) => a.category === row.category);
        return sum + (match?.grade_pct == null ? 0 : (Number(row.weight_pct) || 0) * (Number(match.grade_pct) || 0) / 100);
      }, 0);
      return { course: course.name, credit_hours: course.credit_hours, letter: earned >= 90 ? 'A-' : earned >= 80 ? 'B-' : 'B+', known_weight: known, assumed_weight: 100 - known };
    });
    const overall = courses.length ? courses.reduce((sum, c) => sum + (c.letter.startsWith('A') ? 3.7 : 3), 0) / courses.length : null;
    return { courses, overall: Number(overall?.toFixed(2)) };
  }

  function snapshot() {
    return {
      ...state,
      generated_at: new Date().toISOString(),
      ranked: rankedToday(),
      gpa: projectedGpa(),
      gcal_events: [],
      activity: state.activity || [],
    };
  }

  function normBase(value) {
    let raw = String(value || '').trim();
    if (!raw) return { error: 'base_url_required' };
    if (!/^https?:\/\//i.test(raw)) raw = `https://${raw}`;
    let url;
    try { url = new URL(raw); } catch { return { error: 'base_url_invalid' }; }
    if (!['http:', 'https:'].includes(url.protocol)) return { error: 'base_url_invalid' };
    let base = url.toString().replace(/\/+$/, '');
    if (!/\/chat\/completions$/i.test(base)) base += '/chat/completions';
    return { baseUrl: base };
  }

  async function httpJson(url, options) {
    const bridge = window.Capacitor?.Plugins?.CapacitorHttp;
    if (bridge?.request) {
      const response = await bridge.request({ url, ...options, responseType: 'json' });
      if (response.status >= 400) {
        const detail = String(response.data?.error?.message || response.data?.error?.type || `HTTP ${response.status}`).slice(0, 300);
        return { error: 'api_failed', detail };
      }
      return { data: response.data };
    }
    const response = await fetch(url, options);
    if (!response.ok) {
      let detail = `HTTP ${response.status}`;
      try { detail = String((await response.json())?.error?.message || detail).slice(0, 300); } catch {}
      return { error: 'api_failed', detail };
    }
    return { data: await response.json() };
  }

  function contextPrompt() {
    const courses = state.courses.map((c) => `${c.code || ''} ${c.name}`.trim()).join('; ');
    const tasks = state.tasks.filter((t) => !t.done).slice(0, 12).map((t) => `${t.title}${t.due_date ? ` (due ${t.due_date})` : ''}`).join('; ');
    const deadlines = rankedToday().slice(0, 8).map((a) => `${a.title} in ${a.course_name}${a.due_date ? ` due ${a.due_date}` : ''}`).join('; ');
    return [
      'You are Nūs, a concise semester copilot. Answer with practical, specific next steps.',
      'Prefer the student\'s own courses, deadlines, and tasks below. Do not invent grades, dates, or syllabus facts.',
      `Courses: ${courses || 'none yet'}`,
      `Open tasks: ${tasks || 'none'}`,
      `Deadlines: ${deadlines || 'none'}`,
    ].join('\n');
  }

  async function customComplete(prompt, messages) {
    const base = normBase(custom.baseUrl);
    if (base.error) return { error: base.error };
    if (!custom.model) return { error: 'model_required' };
    if (!custom.key) return { error: 'api_key_required' };
    const payload = messages?.length
      ? [{ role: 'system', content: contextPrompt() }, ...messages.map((m) => ({ role: m.role === 'assistant' ? 'assistant' : 'user', content: m.text || m.content || '' }))]
      : [{ role: 'system', content: contextPrompt() }, { role: 'user', content: prompt }];
    try {
      const result = await httpJson(base.baseUrl, {
        method: 'POST',
        headers: { 'content-type': 'application/json', authorization: `Bearer ${custom.key}` },
        data: { model: custom.model, messages: payload, max_tokens: 1200, temperature: 0.3 },
      });
      if (result.error) return result;
      const content = result.data?.choices?.[0]?.message?.content;
      return { text: typeof content === 'string' ? content : '' };
    } catch (error) {
      return { error: 'api_network', detail: String(error?.message || error).slice(0, 300) };
    }
  }

  function parseJsonBlock(text) {
    let raw = String(text || '');
    const fence = raw.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (fence) raw = fence[1];
    else {
      const start = raw.indexOf('{');
      const end = raw.lastIndexOf('}');
      if (start === -1 || end <= start) return { error: 'bad_json' };
      raw = raw.slice(start, end + 1);
    }
    try { return { parsed: JSON.parse(raw) }; } catch { return { error: 'bad_json' }; }
  }

  async function extractSyllabus(text) {
    const prompt = `Extract this course syllabus. Respond with ONLY a JSON object matching {"course":{"name":string,"code":string|null,"credit_hours":number|null,"term":string|null},"grade_weights":[{"category":string,"weight_pct":number}],"assignments":[{"title":string,"due_date":"YYYY-MM-DD"|null,"category":string|null}]}. Never invent dates or weights.\n\n${String(text || '').slice(0, 60000)}`;
    const result = await customComplete(prompt);
    if (result.error) return result;
    const parsed = parseJsonBlock(result.text);
    return parsed.error ? parsed : { data: parsed.parsed };
  }

  async function pickTextFile() {
    return new Promise((resolve) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.txt,.md,.markdown,.json,.html,.htm,.csv,text/plain';
      input.style.position = 'fixed';
      input.style.left = '-9999px';
      document.body.appendChild(input);
      input.addEventListener('change', async () => {
        const file = input.files?.[0];
        input.remove();
        if (!file) return resolve(null);
        try { resolve({ name: file.name, text: await file.text() }); }
        catch { resolve({ name: file.name, text: '', error: 'read_failed' }); }
      }, { once: true });
      input.click();
      setTimeout(() => { if (document.body.contains(input)) input.remove(); }, 120000);
    });
  }

  const noOp = () => {};
  const ok = (extra = {}) => ({ ok: true, ...extra });

  window.nus = {
    platform: 'android',
    getState: async () => snapshot(),
    listCourses: async () => state.courses,
    addCourse: async (course) => {
      const row = { ...course, id: nextId(state.courses) };
      state.courses.push(row);
      persist();
      return row;
    },
    updateCourse: async (id, fields) => {
      const row = state.courses.find((c) => c.id === Number(id));
      if (row) Object.assign(row, fields);
      persist();
      return ok();
    },
    listAssignments: async (courseId) => state.assignments.filter((a) => !courseId || a.course_id === Number(courseId)),
    addAssignment: async (assignment) => {
      const row = { ...assignment, id: nextId(state.assignments) };
      state.assignments.push(row);
      persist();
      return row;
    },
    updateAssignment: async (id, fields) => {
      const row = state.assignments.find((a) => a.id === Number(id));
      if (row) Object.assign(row, fields);
      if (fields?.status === 'done') {
        state.activity.unshift({ id: nextId(state.activity), action_type: 'assignment_done', summary: `Marked ${row?.title || 'assignment'} done`, detail: '', status: 'done', created_at: new Date().toISOString() });
      }
      persist();
      return ok();
    },
    listWeights: async (courseId) => state.weights.filter((w) => !courseId || w.course_id === Number(courseId)),
    addWeight: async (weight) => {
      const row = { ...weight, id: nextId(state.weights) };
      state.weights.push(row);
      persist();
      return row;
    },
    listTasks: async () => state.tasks,
    addTask: async (task) => {
      const stepBase = nextStepId();
      const row = {
        ...task,
        id: nextId(state.tasks),
        done: 0,
        steps: Array.from({ length: 5 }, (_, index) => ({ id: stepBase + index, title: ['Define what done looks like', 'Prepare the materials', 'Complete the first pass', 'Resolve the main blocker', 'Review and close'][index], done: 0, estimated_minutes: Math.max(10, Math.round((Number(task.estimated_minutes) || 60) / 5)) })),
      };
      state.tasks.unshift(row);
      state.activity.unshift({ id: nextId(state.activity), action_type: 'task_created', summary: `Created task "${task.title}"`, detail: '', status: 'done', created_at: new Date().toISOString() });
      persist();
      return row;
    },
    updateTask: async (id, fields) => {
      const row = state.tasks.find((t) => t.id === Number(id));
      if (row) Object.assign(row, fields);
      persist();
      return ok();
    },
    deleteTask: async (id) => {
      state.tasks = state.tasks.filter((t) => t.id !== Number(id));
      persist();
      return ok();
    },
    listTaskSteps: async (taskId) => state.tasks.find((t) => t.id === Number(taskId))?.steps || [],
    updateTaskStep: async (taskId, fields) => {
      for (const task of state.tasks) {
        const step = task.steps?.find((s) => s.id === Number(fields?.id || taskId));
        if (step) { Object.assign(step, fields); break; }
      }
      persist();
      return ok();
    },
    breakdownTask: async (id) => {
      const task = state.tasks.find((t) => t.id === Number(id));
      if (!task) return { error: 'target_not_found' };
      if (!task.steps?.length) {
        const stepBase = nextStepId();
        task.steps = Array.from({ length: 5 }, (_, index) => ({ id: stepBase + index, title: ['Define what done looks like', 'Prepare the materials', 'Complete the first pass', 'Resolve the main blocker', 'Review and close'][index], done: 0, estimated_minutes: 15 }));
      }
      persist();
      return { steps: task.steps };
    },
    addReminder: async (reminder) => ok({ reminder }),
    rankToday: async () => rankedToday(),
    projectGpa: async () => projectedGpa(),
    listSources: async () => state.sources,
    sourceText: async (id) => state.sources.find((s) => s.id === Number(id))?.raw_text || '',
    importSource: async () => ({ canceled: true }),
    importFolder: async () => ({ canceled: true }),
    listIntegrations: async () => state.integrations,
    listAutomations: async () => state.automations,
    addAutomation: async (item) => {
      const row = { ...item, id: nextId(state.automations), enabled: 1, run_count: 0 };
      state.automations.unshift(row);
      persist();
      return row;
    },
    updateAutomation: async (id, fields) => {
      const row = state.automations.find((a) => a.id === Number(id));
      if (row) Object.assign(row, fields);
      persist();
      return ok();
    },
    runAutomation: async () => ok(),
    setPreference: async (key, value) => {
      state.preferences[key] = value;
      persist();
      return ok();
    },
    bridgeStatus: async () => ({ connected: false, updated_at: new Date().toISOString() }),
    authConfig: async () => ({ supabase: false, googleCalendar: false, outlook: false }),
    authSession: async () => ({ user: null, configured: false }),
    loginEmail: async () => ({ error: 'auth_unavailable' }),
    signupEmail: async () => ({ error: 'auth_unavailable' }),
    loginGoogle: async () => ({ error: 'auth_unavailable' }),
    logout: async () => ok(),
    licenseStatus: async () => ({ plan: 'free', isPro: false, source: 'local', usage: { syllabusImports: { used: 0, limit: 3 }, questions: { used: 0, limit: 10 }, companionMs: { used: 0, limit: 1200000 } } }),
    licenseRefresh: async () => ({ plan: 'free', isPro: false, source: 'local', usage: { syllabusImports: { used: 0, limit: 3 }, questions: { used: 0, limit: 10 }, companionMs: { used: 0, limit: 1200000 } } }),
    licenseCheckout: async () => ({ error: 'checkout_unavailable' }),
    licensePortal: async () => ({ error: 'portal_unavailable' }),
    licenseTrack: async () => true,
    acquisitionStatus: async () => null,
    acquisitionRedeem: async () => ({ ok: false, reason: 'unavailable' }),
    statsStatus: async () => ({ enabled: true, active: true, envDisabled: false, installId: 'android', askSource: true }),
    statsSetEnabled: async (enabled) => ({ enabled: Boolean(enabled), active: Boolean(enabled), envDisabled: false, installId: 'android', askSource: false }),
    statsSourceAnswer: async () => ({ ok: true, sent: true }),
    syncStatus: async () => ({ configured: false, authenticated: false, enabled: false }),
    syncSetEnabled: async () => ({ error: 'sync_unavailable' }),
    syncDeleteCloud: async () => ({ error: 'sync_unavailable' }),
    syncPull: async () => ({ ok: false }),
    outlookStatus: async () => ({ configured: false, connected: false }),
    outlookConnect: async () => ({ error: 'outlook_unavailable' }),
    outlookDisconnect: async () => ok(),
    outlookSend: async () => ({ error: 'outlook_unavailable' }),
    outlookInbox: async () => ({ messages: [] }),
    styleRefresh: async () => ({ error: 'style_unavailable' }),
    styleProfile: async () => ({ ready: false, exemplars: 0, formality: 'balanced', avgSentenceWords: 16 }),
    draftProfessorEmail: async () => ({ error: 'desktop_only' }),
    gmailCompose: async (payload) => {
      const params = new URLSearchParams({ view: 'cm', to: payload?.to || '', su: payload?.subject || '', body: payload?.body || '' });
      window.open(`https://mail.google.com/mail/?${params.toString()}`, '_blank');
      return ok();
    },
    gcalStatus: async () => ({ configured: false, connected: false }),
    gcalConnect: async () => ({ error: 'gcal_unavailable' }),
    gcalDisconnect: async () => ok(),
    gcalRefresh: async () => ok(),
    gcalCreateEvent: async () => ({ error: 'gcal_unavailable' }),
    aiStatus: async () => ({
      cli: false,
      apiKey: Boolean(custom.key),
      encryptionAvailable: false,
      custom: {
        configured: Boolean(custom.baseUrl && custom.model && custom.key),
        baseUrl: custom.baseUrl || '',
        model: custom.model || '',
        hasKey: Boolean(custom.key),
        encryptionAvailable: false,
      },
    }),
    aiSetKey: async (value) => {
      const key = String(value || '').trim();
      if (!key) return { error: 'empty_key' };
      custom.key = key;
      persist();
      return ok();
    },
    aiClearKey: async () => { custom.key = ''; persist(); return ok(); },
    aiTest: async () => {
      const result = await customComplete('Reply with exactly the word OK and nothing else.');
      if (result.error) return result;
      return /\bOK\b/i.test(result.text) ? { ok: true } : { error: 'unexpected_reply' };
    },
    customApiStatus: async () => ({
      configured: Boolean(custom.baseUrl && custom.model && custom.key),
      baseUrl: custom.baseUrl || '',
      model: custom.model || '',
      hasKey: Boolean(custom.key),
      encryptionAvailable: false,
    }),
    customApiSet: async (payload) => {
      const base = normBase(payload?.baseUrl);
      if (base.error) return base;
      if (!String(payload?.model || '').trim()) return { error: 'model_required' };
      if (!String(payload?.key || '').trim() && !custom.key) return { error: 'api_key_required' };
      custom = { baseUrl: base.baseUrl, model: String(payload.model).trim(), key: String(payload.key || custom.key || '').trim() };
      persist();
      return ok({ configured: Boolean(custom.baseUrl && custom.model && custom.key) });
    },
    customApiClear: async () => { custom = { baseUrl: '', model: '', key: '' }; persist(); return ok(); },
    customApiTest: async () => {
      const result = await customComplete('Reply with exactly the word OK and nothing else.');
      if (result.error) return result;
      return /\bOK\b/i.test(result.text) ? { ok: true } : { error: 'unexpected_reply' };
    },
    syllabusImport: async (filePath) => {
      let file = null;
      if (typeof filePath === 'string' && filePath) {
        const source = state.sources.find((s) => s.title === filePath || String(s.id) === filePath);
        file = source ? { name: source.title, text: source.raw_text } : null;
      } else {
        file = await pickTextFile();
      }
      if (!file) return { canceled: true };
      if (file.error) return { error: file.error };
      const source = { id: nextId(state.sources), title: file.name, source_type: 'syllabus', raw_text: file.text };
      state.sources.push(source);
      persist();
      if (!custom.baseUrl || !custom.model || !custom.key) return { error: 'no_ai', sourceId: source.id, fileName: file.name };
      const extraction = await extractSyllabus(file.text);
      if (extraction.error) return { ...extraction, sourceId: source.id, fileName: file.name };
      return { sourceId: source.id, fileName: file.name, data: extraction.data };
    },
    syllabusExtract: async (sourceId) => {
      const source = state.sources.find((s) => s.id === Number(sourceId));
      if (!source) return { error: 'source_missing' };
      if (!custom.baseUrl || !custom.model || !custom.key) return { error: 'no_ai', sourceId, fileName: source.title };
      const extraction = await extractSyllabus(source.raw_text);
      if (extraction.error) return { ...extraction, sourceId, fileName: source.title };
      return { sourceId, fileName: source.title, data: extraction.data };
    },
    syllabusConfirm: async (payload) => {
      const course = payload?.course || {};
      if (!String(course.name || '').trim()) return { error: 'course_name_required' };
      const courseId = nextId(state.courses);
      state.courses.push({ ...course, id: courseId, color: '#6f7cf5' });
      for (const weight of payload?.grade_weights || []) {
        state.weights.push({ id: nextId(state.weights), course_id: courseId, category: weight.category, weight_pct: Number(weight.weight_pct) || 0 });
      }
      for (const assignment of payload?.assignments || []) {
        state.assignments.push({ id: nextId(state.assignments), course_id: courseId, title: assignment.title, due_date: assignment.due_date || null, category: assignment.category || null, status: 'pending' });
      }
      persist();
      return ok({ courseId, assignments: (payload?.assignments || []).length, weights: (payload?.grade_weights || []).length });
    },
    assistantParse: async (text) => {
      const value = String(text || '');
      if (/add (a )?task|remind me|create .*task/i.test(value)) {
        const title = value.replace(/^.*?(?:add|create)\s+(?:a\s+)?task\s*(?:to|:|for)?\s*/i, '').trim().slice(0, 80) || value.slice(0, 60);
        return { proposal: { command: { intent: 'add_task', title, due_date: plus(1), summary_for_user: `Create task "${title}" due tomorrow.`, confidence: 0.9 }, resolved: {}, notes: [], needs_confirm: true } };
      }
      return { proposal: { command: { intent: 'question', question: value, summary_for_user: '' }, resolved: {}, notes: [], needs_confirm: false } };
    },
    assistantExecute: async (proposal) => {
      if (proposal?.command?.intent === 'add_task') {
        const task = await window.nus.addTask({ title: proposal.command.title, due_date: proposal.command.due_date, estimated_minutes: 30 });
        return { ok: true, message: `Created "${task.title}".`, navigate: 'tasks' };
      }
      return { ok: true, message: 'Done.' };
    },
    chatSend: async (messages) => {
      const result = await customComplete('', messages);
      if (result.error) return result;
      return { text: String(result.text || '').trim() };
    },
    listActivity: async () => state.activity,
    storageStatus: async () => {
      const dbBytes = new Blob([JSON.stringify(state)]).size;
      return { dbBytes, sourceBytes: 0, capBytes: 512 * 1024 * 1024, usedBytes: dbBytes };
    },
    saveState: async () => ({ ok: true, kind: null, message: null, failedSince: null }),
    onSaveState: noOp,
    companionControl: async () => ({ running: false, visible: false, capturing: false, stealth: false }),
    companionStatus: async () => ({ running: false, visible: false, capturing: false, stealth: false }),
    companionAiStatus: async () => ({ provider: 'gemini', keys: {} }),
    companionAiSetKey: async () => ok(),
    companionAiClearKey: async () => ok(),
    companionSessions: async () => [],
    companionMessages: async () => [],
    companionSearch: async () => [],
    companionVaultPreview: async () => ({ error: 'session_missing' }),
    companionVaultWrite: async () => ({ error: 'session_missing' }),
    onCompanionState: noOp,
    onAuthChanged: noOp,
    onLicenseChanged: noOp,
    onDesktopTour: noOp,
    onDesktopHistory: noOp,
    onDesktopVoiceSetup: noOp,
    setActiveView: async () => ok(),
    onCompanionMessage: noOp,
    voiceStatus: async () => ({ ready: false, engine: 'none', model: null, detail: 'Voice transcription is available in the desktop app.' }),
    voiceSetup: async () => ({ error: 'voice_setup_required' }),
    voiceTranscribe: async () => ({ error: 'voice_setup_required' }),
    voiceAsk: async (messages) => {
      const result = await customComplete('', messages);
      return result;
    },
    voiceCancel: async () => ok(),
    onAiEvent: noOp,
    onLicenseLimit: noOp,
    onLicenseActivated: noOp,
    onLicenseReturn: noOp,
  };

  document.addEventListener('DOMContentLoaded', () => {
    document.body.classList.add('nus-mobile');
    const style = document.createElement('style');
    style.textContent = `
      .nus-mobile #ai-card, .nus-mobile #companion-ai-card { display: none !important; }
      .nus-mobile .rail-profile, .nus-mobile .rail-storage, .nus-mobile .rail-signal { display: none !important; }
      .nus-mobile .rail { position: fixed; left: 0; right: 0; bottom: 0; top: auto; width: 100%; height: 64px; flex-direction: row; align-items: center; padding: 6px 10px; border-right: 0; border-top: 1px solid rgba(159,167,224,.2); background: rgba(12,15,24,.97); z-index: 80; }
      .nus-mobile .shell { display: block; }
      .nus-mobile .workspace { padding-bottom: 84px; }
      .nus-mobile .brand-block { display: none !important; }
      .nus-mobile .rail-spacer, .nus-mobile .rail-menu { display: none !important; }
      .nus-mobile .nav { display: flex; flex-direction: row; gap: 2px; width: 100%; overflow-x: auto; }
      .nus-mobile .nav-item { flex: 0 0 auto; display: flex; flex-direction: column; align-items: center; gap: 2px; padding: 6px 8px; font-size: 9px; text-align: center; }
      .nus-mobile .nav-item .nav-icon { font-size: 8px; }
      .nus-mobile .nav-item span:last-child { font-size: 8px; }
      .nus-mobile .nav-children { display: none !important; }
      .nus-mobile .topbar { flex-direction: column; align-items: flex-start; gap: 10px; }
      .nus-mobile .top-actions { width: 100%; flex-wrap: wrap; }
      .nus-mobile .topbar-ask { flex: 1 1 100%; }
      .nus-mobile .view { padding: 16px 14px 96px; }
      .nus-mobile .today-layout, .nus-mobile .calendar-shell, .nus-mobile .tasks-layout, .nus-mobile .knowledge-layout, .nus-mobile .history-layout, .nus-mobile .settings-grid { grid-template-columns: 1fr; }
      .nus-mobile .settings-nav { position: static; display: flex; gap: 6px; overflow-x: auto; padding: 10px; }
      .nus-mobile .settings-link { flex: 0 0 auto; }
      .nus-mobile .pulse-column { grid-template-columns: 1fr; }
      .nus-mobile .integration-grid { grid-template-columns: 1fr; }
      .nus-mobile .hero-field { height: 300px; }
      .nus-mobile .brain-stage { height: 58vh; }
      .nus-mobile .source-ask { flex-direction: column; align-items: flex-start; }
      .nus-mobile .calendar-grid { min-width: 620px; }
      .nus-mobile .calendar-main { overflow-x: auto; }
      .nus-mobile .sheet-actions { flex-wrap: wrap; }
    `;
    document.head.appendChild(style);
  });
})();
