import React, { useEffect, useState } from 'react';
import type { Workflow, WorkflowStep, WorkflowSchedule } from '../storage/index';

type Screen = 'main' | 'recording' | 'save' | 'login' | 'workflows' | 'detail';
type DetailTab = 'steps' | 'schedule' | 'data';
type User = { id: string; email: string; name?: string; plan: string };

const API = 'https://flowkit.digitaladexpert.de/api';

// Icons (inline SVG to avoid bundling lucide)
const Icon = {
  zap: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
    </svg>
  ),
  record: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
      <circle cx="12" cy="12" r="8"/>
    </svg>
  ),
  stop: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
      <rect x="4" y="4" width="16" height="16" rx="2"/>
    </svg>
  ),
  play: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
      <polygon points="5 3 19 12 5 21 5 3"/>
    </svg>
  ),
  trash: (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
    </svg>
  ),
  list: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/>
      <line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/>
    </svg>
  ),
  check: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
      <polyline points="20 6 9 17 4 12"/>
    </svg>
  ),
  x: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
    </svg>
  ),
};

async function bgMsg(msg: any): Promise<any> {
  return chrome.runtime.sendMessage(msg);
}

export default function App() {
  const [screen, setScreen] = useState<Screen>('main');
  const [user, setUser] = useState<User | null>(null);
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [recordingSteps, setRecordingSteps] = useState<WorkflowStep[]>([]);
  const [stepCount, setStepCount] = useState(0);
  const [workflowName, setWorkflowName] = useState('');
  const [replayStatus, setReplayStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [detailWorkflow, setDetailWorkflow] = useState<Workflow | null>(null);

  useEffect(() => {
    init();
  }, []);

  async function init() {
    const auth = await bgMsg({ type: 'AUTH_GET' });
    if (auth?.user) setUser(auth.user);
    const wfs = await bgMsg({ type: 'GET_WORKFLOWS' });
    if (wfs) setWorkflows(wfs);
    // Check if already recording
    const state = await bgMsg({ type: 'GET_RECORDING_STATE' });
    if (state?.active) {
      setStepCount(state.steps?.length || 0);
      setScreen('recording');
    }
  }

  function openDetail(wf: Workflow) {
    setDetailWorkflow(wf);
    setScreen('detail');
  }

  async function handleWorkflowUpdate(updated: Workflow) {
    await bgMsg({ type: 'UPDATE_WORKFLOW', workflow: updated });
    setDetailWorkflow(updated);
    setWorkflows((prev) => prev.map((w) => (w.id === updated.id ? updated : w)));
  }

  async function startRecording() {
    setStepCount(0);
    const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
    if (!tab?.id) return;
    const result = await bgMsg({ type: 'START_RECORDING', tabId: tab.id });
    if (!result?.ok) {
      // Recording genuinely never started (e.g. a chrome://, Web Store, or
      // PDF page — Chrome blocks extensions there, no workaround exists).
      // Surfacing this here matters: without it, the popup would show
      // "Recording..." anyway and the user would end up with a real,
      // unexplained 0-step result with no idea why.
      alert(result?.error || "Couldn't start recording on this page.");
      return;
    }
    setScreen('recording');
    window.close(); // Close popup so user can interact with page
  }

  async function stopRecording() {
    const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
    if (!tab?.id) return;
    const result = await bgMsg({ type: 'STOP_RECORDING', tabId: tab.id });
    if (result?.steps) {
      setRecordingSteps(result.steps);
      setStepCount(result.steps.length);
    }
    setScreen('save');
  }

  async function saveWorkflow() {
    if (!workflowName.trim()) return;
    setLoading(true);
    const result = await bgMsg({ type: 'SAVE_WORKFLOW', name: workflowName.trim(), steps: recordingSteps });
    if (result?.workflow) {
      setWorkflows((prev) => [result.workflow, ...prev]);
    }
    setWorkflowName('');
    setRecordingSteps([]);
    setLoading(false);
    setScreen('workflows');
  }

  async function replayWorkflow(wf: Workflow) {
    const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
    if (!tab?.id) return;
    setReplayStatus(`Running "${wf.name}"...`);
    const result = await bgMsg({ type: 'REPLAY_WORKFLOW', workflow: wf, tabId: tab.id });
    if (result?.ok) {
      setReplayStatus(`✓ Done — ${result.stepsCompleted} steps`);
    } else {
      setReplayStatus(`✗ Failed at step ${result?.stepsCompleted + 1}: ${result?.error}`);
    }
    setTimeout(() => setReplayStatus(null), 4000);
    // Refresh workflows
    const wfs = await bgMsg({ type: 'GET_WORKFLOWS' });
    if (wfs) setWorkflows(wfs);
  }

  async function deleteWorkflow(id: string) {
    await bgMsg({ type: 'DELETE_WORKFLOW', id });
    setWorkflows((prev) => prev.filter((w) => w.id !== id));
  }

  async function loginWithCredentials(email: string, password: string) {
    setLoading(true);
    try {
      const res = await fetch(`${API}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      await bgMsg({ type: 'AUTH_SET', auth: { accessToken: data.accessToken, refreshToken: data.refreshToken, user: data.user } });
      setUser(data.user);
      setScreen('main');
    } catch (err: any) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function logout() {
    await bgMsg({ type: 'AUTH_CLEAR' });
    setUser(null);
  }

  // ── Screens ─────────────────────────────────────────────────────────────────
  if (screen === 'login') return <LoginScreen onLogin={loginWithCredentials} onBack={() => setScreen('main')} loading={loading} />;
  if (screen === 'recording') return <RecordingScreen stepCount={stepCount} onStop={stopRecording} />;
  if (screen === 'save') return <SaveScreen name={workflowName} onChange={setWorkflowName} stepCount={stepCount} onSave={saveWorkflow} onDiscard={() => setScreen('main')} loading={loading} />;
  if (screen === 'workflows') return <WorkflowsScreen workflows={workflows} onReplay={replayWorkflow} onDelete={deleteWorkflow} replayStatus={replayStatus} onBack={() => setScreen('main')} onDetail={openDetail} />;
  if (screen === 'detail' && detailWorkflow) return <WorkflowDetailScreen workflow={detailWorkflow} onBack={() => setScreen('workflows')} onUpdate={handleWorkflowUpdate} />;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 480 }}>
      {/* Header */}
      <div style={{ padding: '16px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 28, height: 28, borderRadius: 8, background: 'linear-gradient(135deg, #8b5cf6, #6366f1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {Icon.zap}
          </div>
          <span style={{ fontWeight: 700, fontSize: 15, background: 'linear-gradient(90deg, #a78bfa, #818cf8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>FlowKit</span>
        </div>
        {user ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 11, color: '#71717a', maxWidth: 100, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.name || user.email}</span>
            <button onClick={logout} style={{ fontSize: 11, color: '#52525b', background: 'none', border: 'none', cursor: 'pointer' }}>Sign out</button>
          </div>
        ) : (
          <button onClick={() => setScreen('login')} style={{ fontSize: 12, color: '#a78bfa', background: 'none', border: 'none', cursor: 'pointer' }}>Sign in</button>
        )}
      </div>

      {/* Main content */}
      <div style={{ flex: 1, padding: '20px 16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        {replayStatus && (
          <div style={{ padding: '10px 14px', borderRadius: 10, background: replayStatus.startsWith('✓') ? 'rgba(34,197,94,0.1)' : replayStatus.startsWith('✗') ? 'rgba(239,68,68,0.1)' : 'rgba(139,92,246,0.1)', border: `1px solid ${replayStatus.startsWith('✓') ? 'rgba(34,197,94,0.2)' : replayStatus.startsWith('✗') ? 'rgba(239,68,68,0.2)' : 'rgba(139,92,246,0.2)'}`, fontSize: 12, color: replayStatus.startsWith('✓') ? '#4ade80' : replayStatus.startsWith('✗') ? '#f87171' : '#c4b5fd' }}>
            {replayStatus}
          </div>
        )}

        {/* Record CTA */}
        <button
          onClick={startRecording}
          style={{ width: '100%', padding: '14px', borderRadius: 12, background: 'linear-gradient(135deg, #7c3aed, #6366f1)', border: 'none', cursor: 'pointer', color: '#fff', fontWeight: 600, fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, boxShadow: '0 4px 20px rgba(124,58,237,0.3)' }}
        >
          <span style={{ color: '#fca5a5' }}>{Icon.record}</span>
          Start Recording
        </button>

        {/* Workflow list */}
        {workflows.length > 0 && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <span style={{ fontSize: 12, color: '#71717a', fontWeight: 500 }}>WORKFLOWS</span>
              <button onClick={() => setScreen('workflows')} style={{ fontSize: 11, color: '#a78bfa', background: 'none', border: 'none', cursor: 'pointer' }}>
                See all ({workflows.length})
              </button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {workflows.slice(0, 4).map((wf) => (
                <WorkflowCard key={wf.id} wf={wf} onReplay={replayWorkflow} onDelete={deleteWorkflow} onDetail={openDetail} />
              ))}
            </div>
          </div>
        )}

        {workflows.length === 0 && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, color: '#3f3f46', textAlign: 'center', padding: '20px 0' }}>
            <div style={{ width: 40, height: 40, borderRadius: 12, background: 'rgba(139,92,246,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 4 }}>
              {Icon.list}
            </div>
            <p style={{ fontSize: 13, color: '#52525b', fontWeight: 500 }}>No workflows yet</p>
            <p style={{ fontSize: 12, color: '#3f3f46' }}>Hit record and do your task once</p>
          </div>
        )}
      </div>

      {/* Footer */}
      <div style={{ padding: '10px 16px', borderTop: '1px solid rgba(255,255,255,0.04)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 11, color: '#27272a' }}>
          {user ? `${user.plan} plan` : 'Not signed in'}
        </span>
        <a href="https://flowkit.digitaladexpert.de" target="_blank" style={{ fontSize: 11, color: '#3f3f46', textDecoration: 'none' }}>flowkit.de</a>
      </div>
    </div>
  );
}

function WorkflowCard({ wf, onReplay, onDelete, onDetail }: { wf: Workflow; onReplay: (w: Workflow) => void; onDelete: (id: string) => void; onDetail?: (w: Workflow) => void }) {
  const [hover, setHover] = useState(false);
  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 10, background: hover ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', cursor: 'default', transition: 'background 0.15s' }}
    >
      <div
        onClick={() => onDetail && onDetail(wf)}
        style={{ width: 28, height: 28, borderRadius: 7, background: 'rgba(139,92,246,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: '#a78bfa', cursor: onDetail ? 'pointer' : 'default' }}
      >
        {Icon.play}
      </div>
      <div
        onClick={() => onDetail && onDetail(wf)}
        style={{ flex: 1, minWidth: 0, cursor: onDetail ? 'pointer' : 'default' }}
      >
        <p style={{ fontSize: 13, fontWeight: 500, color: '#e4e4e7', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{wf.name}</p>
        <p style={{ fontSize: 11, color: '#52525b' }}>{wf.steps.length} steps · {wf.replayCount} replays</p>
      </div>
      <div style={{ display: 'flex', gap: 4 }}>
        <button
          onClick={(e) => { e.stopPropagation(); onReplay(wf); }}
          style={{ width: 28, height: 28, borderRadius: 7, background: 'rgba(139,92,246,0.15)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#a78bfa' }}
        >
          {Icon.play}
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(wf.id); }}
          style={{ width: 28, height: 28, borderRadius: 7, background: 'transparent', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#52525b' }}
        >
          {Icon.trash}
        </button>
      </div>
    </div>
  );
}

function WorkflowDetailScreen({ workflow, onBack, onUpdate }: { workflow: Workflow; onBack: () => void; onUpdate: (wf: Workflow) => void }) {
  const [activeTab, setActiveTab] = useState<DetailTab>('steps');
  const [localWorkflow, setLocalWorkflow] = useState<Workflow>(workflow);
  const [editingVarIdx, setEditingVarIdx] = useState<number | null>(null);
  const [varInput, setVarInput] = useState('');
  const [schedule, setSchedule] = useState<WorkflowSchedule>(workflow.schedule ?? { enabled: false, type: 'daily', hour: 9, minute: 0 });
  const [dataSets, setDataSets] = useState<Record<string, string>[]>(workflow.dataSets ?? []);
  const [runProgress, setRunProgress] = useState<string | null>(null);
  const [runDone, setRunDone] = useState(false);

  const dynamicSteps = localWorkflow.steps.filter((s) => s.variableName);
  const varNames = dynamicSteps.map((s) => s.variableName as string);

  const tabStyle = (t: DetailTab) => ({
    flex: 1,
    padding: '8px 4px',
    background: 'none',
    border: 'none',
    borderBottom: `2px solid ${activeTab === t ? '#7c3aed' : 'transparent'}`,
    color: activeTab === t ? '#a78bfa' : '#52525b',
    fontSize: 12,
    fontWeight: activeTab === t ? 600 : 400,
    cursor: 'pointer',
    transition: 'all 0.15s',
  });

  function stepIcon(type: WorkflowStep['type']) {
    const icons: Record<string, string> = {
      click: '↗',
      input: '✎',
      navigate: '⇒',
      wait: '⏱',
      scroll: '↕',
      select: '▾',
    };
    return icons[type] || '•';
  }

  function saveVarName(idx: number) {
    const updated = localWorkflow.steps.map((s, i) =>
      i === idx ? { ...s, variableName: varInput.trim() || undefined } : s
    );
    const updatedWf = { ...localWorkflow, steps: updated };
    setLocalWorkflow(updatedWf);
    onUpdate(updatedWf);
    setEditingVarIdx(null);
    setVarInput('');
  }

  function cancelVarEdit() {
    setEditingVarIdx(null);
    setVarInput('');
  }

  async function saveSchedule() {
    const updated = { ...localWorkflow, schedule };
    setLocalWorkflow(updated);
    onUpdate(updated);
  }

  function addDataRow() {
    const emptyRow: Record<string, string> = {};
    varNames.forEach((v) => (emptyRow[v] = ''));
    setDataSets((prev) => [...prev, emptyRow]);
  }

  function updateCell(rowIdx: number, col: string, val: string) {
    setDataSets((prev) => prev.map((row, i) => i === rowIdx ? { ...row, [col]: val } : row));
  }

  async function runWithData() {
    if (dataSets.length === 0) return;
    const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
    if (!tab?.id) return;
    setRunProgress(`Running 0 / ${dataSets.length}...`);
    setRunDone(false);

    const updated = { ...localWorkflow, dataSets };
    onUpdate(updated);

    const result = await chrome.runtime.sendMessage({
      type: 'RUN_WITH_DATA',
      workflow: localWorkflow,
      dataSets,
      tabId: tab.id,
    });
    if (result?.ok) {
      setRunProgress(`Completed ${result.total} / ${result.total}`);
      setRunDone(true);
    } else {
      setRunProgress('Run failed');
    }
  }

  const inp = (extra?: React.CSSProperties): React.CSSProperties => ({
    padding: '6px 8px',
    borderRadius: 6,
    background: '#18181b',
    border: '1px solid #3f3f46',
    color: '#fafafa',
    fontSize: 12,
    outline: 'none',
    ...extra,
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 480, background: '#09090b' }}>
      {/* Header */}
      <div style={{ padding: '12px 14px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', gap: 8 }}>
        <button onClick={onBack} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#71717a', fontSize: 16 }}>←</button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontWeight: 600, fontSize: 13, color: '#e4e4e7', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{localWorkflow.name}</p>
          <p style={{ fontSize: 11, color: '#52525b' }}>{localWorkflow.steps.length} steps</p>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid rgba(255,255,255,0.06)', padding: '0 14px' }}>
        <button style={tabStyle('steps')} onClick={() => setActiveTab('steps')}>Steps</button>
        <button style={tabStyle('schedule')} onClick={() => setActiveTab('schedule')}>Schedule</button>
        <button style={tabStyle('data')} onClick={() => setActiveTab('data')}>Run with Data</button>
      </div>

      {/* Tab Content */}
      <div style={{ flex: 1, overflow: 'auto', padding: '12px 14px' }}>

        {/* Steps Tab */}
        {activeTab === 'steps' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {localWorkflow.steps.map((step, idx) => {
              const isDynamic = step.type === 'input' || step.type === 'select';
              const isEditing = editingVarIdx === idx;
              return (
                <div key={idx} style={{ padding: '8px 10px', borderRadius: 8, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ width: 20, height: 20, borderRadius: 5, background: 'rgba(124,58,237,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, color: '#a78bfa', flexShrink: 0 }}>
                      {stepIcon(step.type)}
                    </span>
                    <span style={{ flex: 1, fontSize: 12, color: '#a1a1aa', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {step.description || `${step.type}${step.selector ? ` — ${step.selector.slice(0, 30)}` : ''}`}
                    </span>
                    {step.variableName && !isEditing && (
                      <span style={{ fontSize: 10, color: '#a78bfa', background: 'rgba(124,58,237,0.15)', padding: '2px 6px', borderRadius: 4, fontFamily: 'monospace', flexShrink: 0 }}>
                        {`{{${step.variableName}}}`}
                      </span>
                    )}
                    {isDynamic && !isEditing && (
                      <button
                        onClick={() => { setEditingVarIdx(idx); setVarInput(step.variableName || ''); }}
                        style={{ width: 22, height: 22, borderRadius: 5, background: 'rgba(255,255,255,0.05)', border: 'none', cursor: 'pointer', color: '#71717a', fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
                        title="Set variable name"
                      >
                        ◇
                      </button>
                    )}
                  </div>
                  {isEditing && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 8 }}>
                      <input
                        autoFocus
                        value={varInput}
                        onChange={(e) => setVarInput(e.target.value)}
                        placeholder="variable name"
                        style={{ ...inp(), flex: 1 }}
                        onKeyDown={(e) => { if (e.key === 'Enter') saveVarName(idx); if (e.key === 'Escape') cancelVarEdit(); }}
                      />
                      <button onClick={() => saveVarName(idx)} style={{ padding: '4px 8px', borderRadius: 5, background: '#7c3aed', border: 'none', cursor: 'pointer', color: '#fff', fontSize: 11 }}>Save</button>
                      <button onClick={cancelVarEdit} style={{ padding: '4px 8px', borderRadius: 5, background: 'transparent', border: '1px solid #3f3f46', cursor: 'pointer', color: '#71717a', fontSize: 11 }}>Cancel</button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Schedule Tab */}
        {activeTab === 'schedule' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {/* Enable toggle */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 13, color: '#e4e4e7' }}>Enable Schedule</span>
              <div
                onClick={() => setSchedule((s) => ({ ...s, enabled: !s.enabled }))}
                style={{ width: 40, height: 22, borderRadius: 11, background: schedule.enabled ? '#7c3aed' : '#27272a', cursor: 'pointer', position: 'relative', transition: 'background 0.2s' }}
              >
                <div style={{ position: 'absolute', top: 3, left: schedule.enabled ? 21 : 3, width: 16, height: 16, borderRadius: '50%', background: '#fff', transition: 'left 0.2s' }} />
              </div>
            </div>

            {schedule.enabled && (
              <>
                {/* Type selector */}
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    onClick={() => setSchedule((s) => ({ ...s, type: 'hourly' }))}
                    style={{ flex: 1, padding: '8px', borderRadius: 8, border: `1px solid ${schedule.type === 'hourly' ? '#7c3aed' : 'rgba(255,255,255,0.06)'}`, background: schedule.type === 'hourly' ? 'rgba(124,58,237,0.15)' : 'transparent', color: schedule.type === 'hourly' ? '#a78bfa' : '#71717a', fontSize: 12, cursor: 'pointer' }}
                  >
                    Hourly
                  </button>
                  <button
                    onClick={() => setSchedule((s) => ({ ...s, type: 'daily' }))}
                    style={{ flex: 1, padding: '8px', borderRadius: 8, border: `1px solid ${schedule.type === 'daily' ? '#7c3aed' : 'rgba(255,255,255,0.06)'}`, background: schedule.type === 'daily' ? 'rgba(124,58,237,0.15)' : 'transparent', color: schedule.type === 'daily' ? '#a78bfa' : '#71717a', fontSize: 12, cursor: 'pointer' }}
                  >
                    Daily
                  </button>
                </div>

                {/* Daily time inputs */}
                {schedule.type === 'daily' && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 12, color: '#71717a' }}>Time:</span>
                    <input
                      type="number"
                      min={0}
                      max={23}
                      value={schedule.hour ?? 9}
                      onChange={(e) => setSchedule((s) => ({ ...s, hour: Number(e.target.value) }))}
                      style={{ ...inp({ width: 52 }) }}
                    />
                    <span style={{ fontSize: 12, color: '#71717a' }}>:</span>
                    <input
                      type="number"
                      min={0}
                      max={59}
                      value={schedule.minute ?? 0}
                      onChange={(e) => setSchedule((s) => ({ ...s, minute: Number(e.target.value) }))}
                      style={{ ...inp({ width: 52 }) }}
                    />
                  </div>
                )}
              </>
            )}

            <button
              onClick={saveSchedule}
              style={{ padding: '10px', borderRadius: 10, background: '#7c3aed', border: 'none', cursor: 'pointer', color: '#fff', fontWeight: 600, fontSize: 13 }}
            >
              Save
            </button>
          </div>
        )}

        {/* Data Tab */}
        {activeTab === 'data' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {varNames.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '24px 0', color: '#52525b', fontSize: 12 }}>
                First make steps dynamic from the Steps tab
              </div>
            ) : (
              <>
                {/* Table */}
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                    <thead>
                      <tr>
                        {varNames.map((v) => (
                          <th key={v} style={{ padding: '6px 8px', textAlign: 'left', color: '#a78bfa', borderBottom: '1px solid rgba(255,255,255,0.06)', fontFamily: 'monospace', fontSize: 11 }}>
                            {`{{${v}}}`}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {dataSets.map((row, rowIdx) => (
                        <tr key={rowIdx}>
                          {varNames.map((v) => (
                            <td key={v} style={{ padding: '4px 4px' }}>
                              <input
                                value={row[v] ?? ''}
                                onChange={(e) => updateCell(rowIdx, v, e.target.value)}
                                style={{ ...inp({ width: '100%' }) }}
                              />
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <button
                  onClick={addDataRow}
                  style={{ padding: '8px', borderRadius: 8, background: 'transparent', border: '1px dashed rgba(255,255,255,0.12)', cursor: 'pointer', color: '#71717a', fontSize: 12 }}
                >
                  + Add row
                </button>

                {dataSets.length > 0 && (
                  <button
                    onClick={runWithData}
                    disabled={!!runProgress && !runDone}
                    style={{ padding: '10px', borderRadius: 10, background: runDone ? 'rgba(34,197,94,0.15)' : '#7c3aed', border: runDone ? '1px solid rgba(34,197,94,0.3)' : 'none', cursor: runProgress && !runDone ? 'not-allowed' : 'pointer', color: runDone ? '#4ade80' : '#fff', fontWeight: 600, fontSize: 13 }}
                  >
                    {runDone ? `✓ ${runProgress}` : runProgress || `Run All (${dataSets.length} row${dataSets.length !== 1 ? 's' : ''})`}
                  </button>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function RecordingScreen({ stepCount, onStop }: { stepCount: number; onStop: () => void }) {
  const [count, setCount] = useState(stepCount);
  useEffect(() => {
    const interval = setInterval(async () => {
      const state = await chrome.runtime.sendMessage({ type: 'GET_RECORDING_STATE' });
      if (state?.steps) setCount(state.steps.length);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 480, gap: 16, padding: 24 }}>
      <div style={{ width: 64, height: 64, borderRadius: 20, background: 'rgba(239,68,68,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', animation: 'pulse 1.5s infinite' }}>
        <div style={{ width: 24, height: 24, borderRadius: '50%', background: '#ef4444' }} />
      </div>
      <div style={{ textAlign: 'center' }}>
        <p style={{ fontWeight: 700, fontSize: 16, color: '#fafafa' }}>Recording...</p>
        <p style={{ fontSize: 13, color: '#71717a', marginTop: 4 }}>{count} steps captured</p>
        <p style={{ fontSize: 12, color: '#3f3f46', marginTop: 8 }}>Perform your task in the browser,<br/>then come back and stop.</p>
      </div>
      <button
        onClick={onStop}
        style={{ marginTop: 8, padding: '12px 28px', borderRadius: 12, background: '#ef4444', border: 'none', cursor: 'pointer', color: '#fff', fontWeight: 600, fontSize: 14, display: 'flex', alignItems: 'center', gap: 8 }}
      >
        Stop Recording
      </button>
      <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.5} }`}</style>
    </div>
  );
}

function SaveScreen({ name, onChange, stepCount, onSave, onDiscard, loading }: any) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', padding: 20, gap: 16, minHeight: 480 }}>
      <div>
        <p style={{ fontWeight: 700, fontSize: 16, color: '#fafafa', marginBottom: 4 }}>Save workflow</p>
        <p style={{ fontSize: 13, color: '#71717a' }}>{stepCount} steps recorded</p>
      </div>
      <div>
        <label style={{ fontSize: 12, color: '#71717a', display: 'block', marginBottom: 8 }}>Workflow name</label>
        <input
          autoFocus
          value={name}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && name.trim() && onSave()}
          placeholder="e.g. Fill CRM Form"
          style={{ width: '100%', padding: '10px 12px', borderRadius: 10, background: '#18181b', border: '1px solid #3f3f46', color: '#fafafa', fontSize: 13, outline: 'none' }}
        />
      </div>
      <div style={{ display: 'flex', gap: 8, marginTop: 'auto' }}>
        <button
          onClick={onDiscard}
          style={{ flex: 1, padding: '11px', borderRadius: 10, background: 'transparent', border: '1px solid #3f3f46', color: '#71717a', fontSize: 13, cursor: 'pointer' }}
        >
          Discard
        </button>
        <button
          onClick={onSave}
          disabled={!name.trim() || loading}
          style={{ flex: 2, padding: '11px', borderRadius: 10, background: name.trim() && !loading ? 'linear-gradient(135deg,#7c3aed,#6366f1)' : '#27272a', border: 'none', color: '#fff', fontWeight: 600, fontSize: 13, cursor: name.trim() && !loading ? 'pointer' : 'not-allowed' }}
        >
          {loading ? 'Saving...' : 'Save Workflow'}
        </button>
      </div>
    </div>
  );
}

function WorkflowsScreen({ workflows, onReplay, onDelete, replayStatus, onBack, onDetail }: any) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 480 }}>
      <div style={{ padding: '14px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', gap: 10 }}>
        <button onClick={onBack} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#71717a', display: 'flex' }}>←</button>
        <span style={{ fontWeight: 600, fontSize: 14, color: '#e4e4e7' }}>All Workflows</span>
        <span style={{ fontSize: 12, color: '#52525b', marginLeft: 'auto' }}>{workflows.length} total</span>
      </div>
      {replayStatus && (
        <div style={{ margin: '8px 12px', padding: '8px 12px', borderRadius: 8, background: 'rgba(139,92,246,0.1)', border: '1px solid rgba(139,92,246,0.2)', fontSize: 12, color: '#c4b5fd' }}>{replayStatus}</div>
      )}
      <div style={{ flex: 1, overflow: 'auto', padding: '8px 12px', display: 'flex', flexDirection: 'column', gap: 6 }}>
        {workflows.length === 0 ? (
          <div style={{ textAlign: 'center', color: '#52525b', fontSize: 13, marginTop: 40 }}>No workflows yet</div>
        ) : (
          workflows.map((wf: Workflow) => (
            <WorkflowCard key={wf.id} wf={wf} onReplay={onReplay} onDelete={onDelete} onDetail={onDetail} />
          ))
        )}
      </div>
    </div>
  );
}

function LoginScreen({ onLogin, onBack, loading }: { onLogin: (email: string, password: string) => void; onBack: () => void; loading: boolean }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const inp = { width: '100%', padding: '10px 12px', borderRadius: 10, background: '#18181b', border: '1px solid #3f3f46', color: '#fafafa', fontSize: 13, outline: 'none', marginTop: 6 };
  return (
    <div style={{ padding: 20, minHeight: 480, display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <button onClick={onBack} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#71717a' }}>←</button>
        <span style={{ fontWeight: 600, fontSize: 14, color: '#e4e4e7' }}>Sign in to FlowKit</span>
      </div>
      <div>
        <label style={{ fontSize: 12, color: '#71717a' }}>Email</label>
        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" style={inp} />
      </div>
      <div>
        <label style={{ fontSize: 12, color: '#71717a' }}>Password</label>
        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" style={inp} />
      </div>
      <button
        onClick={() => onLogin(email, password)}
        disabled={!email || !password || loading}
        style={{ padding: '12px', borderRadius: 12, background: '#7c3aed', border: 'none', cursor: 'pointer', color: '#fff', fontWeight: 600, fontSize: 14, marginTop: 8 }}
      >
        {loading ? 'Signing in...' : 'Sign in'}
      </button>
      <a href="https://flowkit.digitaladexpert.de/register" target="_blank" style={{ textAlign: 'center', fontSize: 12, color: '#a78bfa', textDecoration: 'none' }}>
        Create free account →
      </a>
    </div>
  );
}
