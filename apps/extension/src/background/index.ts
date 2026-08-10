// Background service worker
// Manages recording state, syncs workflows to API, handles replay orchestration.

import { storage, type WorkflowStep, type Workflow } from '../storage/index';

const API = 'https://flowkit.digitaladexpert.de/api';

// ── API helpers ───────────────────────────────────────────────────────────────
async function apiHeaders(): Promise<Record<string, string>> {
  const auth = await storage.getAuth();
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (auth.accessToken) headers['Authorization'] = `Bearer ${auth.accessToken}`;
  return headers;
}

async function apiRequest(path: string, init: RequestInit = {}): Promise<any> {
  const headers = await apiHeaders();
  const res = await fetch(`${API}${path}`, { ...init, headers: { ...headers, ...init.headers as any } });
  if (res.status === 401) {
    const auth = await storage.getAuth();
    if (auth.refreshToken) {
      const r = await fetch(`${API}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: auth.refreshToken }),
      });
      if (r.ok) {
        const data = await r.json();
        await storage.setAuth({ ...auth, accessToken: data.accessToken, refreshToken: data.refreshToken });
        const headers2 = await apiHeaders();
        const res2 = await fetch(`${API}${path}`, { ...init, headers: { ...headers2, ...init.headers as any } });
        return res2.json();
      }
    }
    await storage.clearAuth();
    return null;
  }
  return res.json();
}

// ── Recording state (persisted to survive service worker restarts) ────────────
const ACTIVE_TAB_KEY = 'fk_active_tab';

async function getActiveTabId(): Promise<number | null> {
  const r = await chrome.storage.local.get(ACTIVE_TAB_KEY);
  return r[ACTIVE_TAB_KEY] ?? null;
}

async function setActiveTabId(tabId: number | null): Promise<void> {
  if (tabId === null) {
    await chrome.storage.local.remove(ACTIVE_TAB_KEY);
  } else {
    await chrome.storage.local.set({ [ACTIVE_TAB_KEY]: tabId });
  }
}

async function getPersistedSteps(): Promise<WorkflowStep[]> {
  const state = await storage.getRecordingState();
  return state?.steps ?? [];
}

async function appendPersistedStep(step: WorkflowStep): Promise<void> {
  const steps = await getPersistedSteps();
  steps.push(step);
  await storage.setRecordingState({ active: true, steps });
}

// ── Recording functions ───────────────────────────────────────────────────────
async function startRecording(tabId: number) {
  await setActiveTabId(tabId);
  await storage.setRecordingState({ active: true, steps: [] });
  await chrome.tabs.sendMessage(tabId, { type: 'START_RECORDING' }).catch(() => {});
  chrome.action.setBadgeText({ text: 'REC', tabId });
  chrome.action.setBadgeBackgroundColor({ color: '#ef4444', tabId });
}

// Re-activate on new page without clearing accumulated steps
async function reactivateRecording(tabId: number) {
  await chrome.tabs.sendMessage(tabId, { type: 'START_RECORDING' }).catch(() => {});
  chrome.action.setBadgeText({ text: 'REC', tabId });
  chrome.action.setBadgeBackgroundColor({ color: '#ef4444', tabId });
}

async function stopRecording(tabId: number): Promise<WorkflowStep[]> {
  // Get steps from current page content script
  const result = await chrome.tabs.sendMessage(tabId, { type: 'STOP_RECORDING' }).catch(() => null);
  const pageSteps: WorkflowStep[] = result?.steps ?? [];

  // Merge with persisted steps (primary source — survives SW restarts)
  const persisted = await getPersistedSteps();
  const newSteps = pageSteps.filter((s) => !persisted.some((r) => r.timestamp === s.timestamp));
  const allSteps = [...persisted, ...newSteps];

  await setActiveTabId(null);
  await storage.setRecordingState(null);
  chrome.action.setBadgeText({ text: '', tabId });
  return allSteps;
}

async function saveWorkflow(name: string, steps: WorkflowStep[], description?: string): Promise<Workflow> {
  const id = `wf_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
  const workflow: Workflow = {
    id,
    name,
    description,
    steps,
    replayCount: 0,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  await storage.saveWorkflow(workflow);

  const auth = await storage.getAuth();
  if (auth.accessToken) {
    try {
      const result = await apiRequest('/workflows', {
        method: 'POST',
        body: JSON.stringify({ name, description, steps }),
      });
      if (result?.id) {
        workflow.serverId = result.id;
        await storage.saveWorkflow(workflow);
      }
    } catch {}
  }

  return workflow;
}

// ── Schedule helper ───────────────────────────────────────────────────────────
async function scheduleWorkflow(workflow: Workflow) {
  const alarmName = `fk_wf_${workflow.id}`;
  await chrome.alarms.clear(alarmName);
  if (!workflow.schedule?.enabled) return;
  const s = workflow.schedule;
  if (s.type === 'hourly') {
    chrome.alarms.create(alarmName, { delayInMinutes: 1, periodInMinutes: 60 });
  } else if (s.type === 'daily') {
    const now = new Date();
    const target = new Date();
    target.setHours(s.hour ?? 9, s.minute ?? 0, 0, 0);
    if (target.getTime() <= now.getTime()) target.setDate(target.getDate() + 1);
    const delayInMinutes = Math.round((target.getTime() - now.getTime()) / 60000);
    chrome.alarms.create(alarmName, { delayInMinutes, periodInMinutes: 24 * 60 });
  }
}

// ── Replay engine ─────────────────────────────────────────────────────────────
async function replayWorkflow(workflow: Workflow, tabId: number, variables?: Record<string, string>): Promise<{ ok: boolean; stepsCompleted: number; error?: string }> {
  let stepsCompleted = 0;

  for (const step of workflow.steps) {
    const resolvedStep = { ...step };
    if (variables && step.variableName && variables[step.variableName] !== undefined) {
      resolvedStep.value = variables[step.variableName];
    }

    if (resolvedStep.delay && resolvedStep.delay > 0) {
      await new Promise((r) => setTimeout(r, Math.min(resolvedStep.delay!, 2000)));
    }

    if (resolvedStep.type === 'navigate' && resolvedStep.url) {
      await chrome.scripting.executeScript({
        target: { tabId },
        func: (url: string) => { window.location.href = url; },
        args: [resolvedStep.url],
      });
      await new Promise((r) => setTimeout(r, 1500));
      stepsCompleted++;
      continue;
    }

    try {
      const result = await chrome.tabs.sendMessage(tabId, { type: 'REPLAY_STEP', step: resolvedStep });
      if (result?.ok) {
        stepsCompleted++;
      } else {
        return { ok: false, stepsCompleted, error: result?.error || 'Step failed' };
      }
    } catch {
      return { ok: false, stepsCompleted, error: 'Could not communicate with page' };
    }

    await new Promise((r) => setTimeout(r, 300));
  }

  workflow.replayCount++;
  await storage.saveWorkflow(workflow);

  const auth = await storage.getAuth();
  if (auth.accessToken && workflow.serverId) {
    const logRes = await apiRequest('/replays/start', {
      method: 'POST',
      body: JSON.stringify({ workflowId: workflow.serverId }),
    });
    if (logRes?.replayId) {
      await apiRequest(`/replays/${logRes.replayId}/finish`, {
        method: 'PATCH',
        body: JSON.stringify({ status: 'SUCCESS', stepsDone: stepsCompleted }),
      });
    }
  }

  return { ok: true, stepsCompleted };
}

// ── AI Pattern Detection ──────────────────────────────────────────────────────
const actionHistory: { selector: string; type: string; ts: number }[] = [];

function trackAction(selector: string, type: string) {
  actionHistory.push({ selector, type, ts: Date.now() });
  if (actionHistory.length > 200) actionHistory.shift();
  const recent = actionHistory.slice(-5).map((a) => `${a.type}:${a.selector}`).join('|');
  const allSeqs = actionHistory.map((_, i) =>
    actionHistory.slice(i, i + 5).map((a) => `${a.type}:${a.selector}`).join('|')
  );
  return allSeqs.filter((s) => s === recent).length >= 3;
}

// ── Message handler ───────────────────────────────────────────────────────────
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  const tabId = sender.tab?.id ?? msg.tabId;

  if (msg.type === 'START_RECORDING') {
    if (tabId) {
      startRecording(tabId).then(() => sendResponse({ ok: true }));
    }
    return true;
  }

  if (msg.type === 'STOP_RECORDING') {
    if (tabId) {
      stopRecording(tabId).then((steps) => sendResponse({ ok: true, steps }));
    }
    return true;
  }

  if (msg.type === 'SAVE_WORKFLOW') {
    saveWorkflow(msg.name, msg.steps, msg.description)
      .then((wf) => sendResponse({ ok: true, workflow: wf }));
    return true;
  }

  if (msg.type === 'REPLAY_WORKFLOW') {
    if (tabId) {
      replayWorkflow(msg.workflow, tabId).then((result) => sendResponse(result));
    }
    return true;
  }

  if (msg.type === 'GET_RECORDING_STATE') {
    storage.getRecordingState().then((state) => sendResponse(state));
    return true;
  }

  if (msg.type === 'STEP_RECORDED') {
    // Persist every step immediately so SW restarts don't lose data
    appendPersistedStep(msg.step).then(() => {
      const suggestAutomation = trackAction(msg.step.selector || '', msg.step.type);
      sendResponse({ ok: true, suggestAutomation });
    });
    return true;
  }

  if (msg.type === 'AUTH_SET') {
    storage.setAuth(msg.auth).then(() => sendResponse({ ok: true }));
    return true;
  }

  if (msg.type === 'AUTH_GET') {
    storage.getAuth().then((auth) => sendResponse(auth));
    return true;
  }

  if (msg.type === 'AUTH_CLEAR') {
    storage.clearAuth().then(() => sendResponse({ ok: true }));
    return true;
  }

  if (msg.type === 'GET_WORKFLOWS') {
    storage.getWorkflows().then((wfs) => sendResponse(wfs));
    return true;
  }

  if (msg.type === 'DELETE_WORKFLOW') {
    storage.deleteWorkflow(msg.id).then(() => sendResponse({ ok: true }));
    return true;
  }

  if (msg.type === 'UPDATE_WORKFLOW') {
    storage.saveWorkflow(msg.workflow).then(() => sendResponse({ ok: true }));
    scheduleWorkflow(msg.workflow);
    return true;
  }

  if (msg.type === 'RUN_WITH_DATA') {
    const { workflow, dataSets, tabId: runTabId } = msg;
    (async () => {
      const results = [];
      for (const variables of dataSets) {
        const result = await replayWorkflow(workflow, runTabId, variables);
        results.push(result);
        await new Promise((r) => setTimeout(r, 1500));
      }
      sendResponse({ ok: true, results, total: dataSets.length });
    })();
    return true;
  }
});

// Re-activate recording after navigation without resetting accumulated steps
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === 'PAGE_LOADED') {
    const tabId = sender.tab?.id;
    if (tabId) {
      getActiveTabId().then((activeTabId) => {
        if (activeTabId === tabId) {
          reactivateRecording(tabId);
        }
      });
    }
    sendResponse({ ok: true });
  }
});

// ── Alarm listener ────────────────────────────────────────────────────────────
chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (!alarm.name.startsWith('fk_wf_')) return;
  const workflowId = alarm.name.replace('fk_wf_', '');
  const workflows = await storage.getWorkflows();
  const wf = workflows.find((w) => w.id === workflowId);
  if (!wf) return;
  const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
  if (!tab?.id) return;
  await replayWorkflow(wf, tab.id);
});
