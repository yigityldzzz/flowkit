'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Zap, Play, Trash2, Plus, BarChart3, Clock, CheckCircle2,
  XCircle, LogOut, Settings, ChevronRight, Loader2, RefreshCw
} from 'lucide-react';
import Link from 'next/link';
import { auth, workflows as wfApi, analytics as analyticsApi, clearTokens } from '@/lib/api';

type User = { id: string; email: string; name?: string; plan: string };
type Workflow = {
  id: string; name: string; description?: string;
  replayCount: number; stepCount: number;
  lastRunAt?: string; updatedAt: string;
};
type Analytics = {
  totals: { workflowCount: number; replayCount: number; successCount: number; failCount: number };
  recentReplays: any[];
  topWorkflows: any[];
};

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [wfs, setWfs] = useState<Workflow[]>([]);
  const [stats, setStats] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'workflows' | 'analytics' | 'settings'>('workflows');
  const [deleting, setDeleting] = useState<string | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('fk_access_token');
    if (!token) { router.push('/login'); return; }
    loadAll();
  }, []);

  async function loadAll() {
    setLoading(true);
    try {
      const [u, w, a] = await Promise.all([auth.me(), wfApi.list(), analyticsApi.get()]);
      setUser(u);
      setWfs(w);
      setStats(a);
    } catch {
      router.push('/login');
    } finally {
      setLoading(false);
    }
  }

  async function deleteWorkflow(id: string) {
    if (!confirm('Delete this workflow?')) return;
    setDeleting(id);
    try {
      await wfApi.delete(id);
      setWfs((prev) => prev.filter((w) => w.id !== id));
    } finally {
      setDeleting(null);
    }
  }

  async function logout() {
    try { await auth.logout(); } catch {}
    clearTokens();
    router.push('/');
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <Loader2 className="w-6 h-6 text-violet-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 flex">
      {/* Sidebar */}
      <aside className="w-56 border-r border-white/5 flex flex-col p-4 gap-1 hidden md:flex">
        <div className="flex items-center gap-2 px-2 py-3 mb-4">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center">
            <Zap className="w-4 h-4 text-white" />
          </div>
          <span className="font-bold text-sm gradient-text">FlowKit</span>
        </div>

        {[
          { id: 'workflows', label: 'Workflows', icon: Play },
          { id: 'analytics', label: 'Analytics', icon: BarChart3 },
          { id: 'settings', label: 'Settings', icon: Settings },
        ].map((item) => (
          <button
            key={item.id}
            onClick={() => setTab(item.id as any)}
            className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors text-left ${
              tab === item.id
                ? 'bg-violet-500/15 text-violet-300'
                : 'text-zinc-500 hover:text-zinc-200 hover:bg-white/5'
            }`}
          >
            <item.icon className="w-4 h-4" />
            {item.label}
          </button>
        ))}

        <div className="flex-1" />

        <div className="border-t border-white/5 pt-4 space-y-1">
          <div className="px-3 py-2">
            <p className="text-xs font-medium text-zinc-300 truncate">{user?.name || user?.email}</p>
            <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium mt-1 ${
              user?.plan === 'PRO' ? 'bg-violet-500/20 text-violet-300' : 'bg-zinc-800 text-zinc-400'
            }`}>
              {user?.plan}
            </span>
          </div>
          <button
            onClick={logout}
            className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm text-zinc-600 hover:text-zinc-300 hover:bg-white/5 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Sign out
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-auto">
        <div className="max-w-4xl mx-auto p-6">
          {/* Workflows Tab */}
          {tab === 'workflows' && (
            <div>
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h1 className="text-xl font-bold text-zinc-100">Workflows</h1>
                  <p className="text-sm text-zinc-500 mt-0.5">
                    {wfs.length} workflow{wfs.length !== 1 ? 's' : ''}
                    {user?.plan === 'FREE' && ` · ${3 - wfs.length} free slots remaining`}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button onClick={loadAll} className="p-2 rounded-lg border border-zinc-800 text-zinc-500 hover:text-zinc-300 transition-colors">
                    <RefreshCw className="w-4 h-4" />
                  </button>
                  {user?.plan === 'FREE' && wfs.length >= 3 ? (
                    <Link
                      href="/register?plan=pro"
                      className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium transition-colors"
                    >
                      Upgrade to Pro
                    </Link>
                  ) : (
                    <div className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-dashed border-zinc-700 text-zinc-500 text-sm">
                      <Plus className="w-4 h-4" />
                      Record via Extension
                    </div>
                  )}
                </div>
              </div>

              {wfs.length === 0 ? (
                <div className="glass rounded-2xl p-12 text-center">
                  <div className="w-12 h-12 rounded-2xl bg-violet-500/15 flex items-center justify-center mx-auto mb-4">
                    <Play className="w-6 h-6 text-violet-400" />
                  </div>
                  <h3 className="font-semibold text-zinc-200 mb-2">No workflows yet</h3>
                  <p className="text-sm text-zinc-500 max-w-xs mx-auto">
                    Install the Chrome Extension and start recording your first workflow.
                  </p>
                  <a
                    href="https://chrome.google.com/webstore"
                    className="inline-flex items-center gap-2 mt-6 px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium rounded-lg transition-colors"
                  >
                    <Zap className="w-4 h-4" />
                    Install Extension
                  </a>
                </div>
              ) : (
                <div className="space-y-3">
                  {wfs.map((wf) => (
                    <div key={wf.id} className="glass rounded-xl p-4 flex items-center gap-4 hover:border-violet-500/20 transition-colors group">
                      <div className="w-10 h-10 rounded-lg bg-violet-500/15 flex items-center justify-center flex-shrink-0">
                        <Play className="w-5 h-5 text-violet-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-zinc-200 text-sm truncate">{wf.name}</p>
                        <p className="text-xs text-zinc-600 mt-0.5">
                          {wf.stepCount} steps · {wf.replayCount} replays
                          {wf.lastRunAt && ` · Last run ${new Date(wf.lastRunAt).toLocaleDateString()}`}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => deleteWorkflow(wf.id)}
                          disabled={deleting === wf.id}
                          className="p-1.5 rounded-lg text-zinc-600 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                        >
                          {deleting === wf.id
                            ? <Loader2 className="w-4 h-4 animate-spin" />
                            : <Trash2 className="w-4 h-4" />}
                        </button>
                        <ChevronRight className="w-4 h-4 text-zinc-600" />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Analytics Tab */}
          {tab === 'analytics' && stats && (
            <div>
              <h1 className="text-xl font-bold text-zinc-100 mb-6">Analytics</h1>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                {[
                  { label: 'Workflows', value: stats.totals.workflowCount, icon: Play, color: 'violet' },
                  { label: 'Total Replays', value: stats.totals.replayCount, icon: RefreshCw, color: 'blue' },
                  { label: 'Successful', value: stats.totals.successCount, icon: CheckCircle2, color: 'green' },
                  { label: 'Failed', value: stats.totals.failCount, icon: XCircle, color: 'red' },
                ].map((s) => (
                  <div key={s.label} className="glass rounded-xl p-4">
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-xs text-zinc-500">{s.label}</p>
                      <s.icon className={`w-4 h-4 text-${s.color}-400`} />
                    </div>
                    <p className="text-2xl font-bold text-zinc-100">{s.value}</p>
                  </div>
                ))}
              </div>

              <h2 className="text-sm font-semibold text-zinc-400 mb-3">Recent Activity</h2>
              <div className="space-y-2">
                {stats.recentReplays.length === 0 ? (
                  <div className="glass rounded-xl p-6 text-center text-zinc-600 text-sm">
                    No replay history yet
                  </div>
                ) : (
                  stats.recentReplays.map((r: any) => (
                    <div key={r.id} className="glass rounded-xl px-4 py-3 flex items-center gap-3">
                      {r.status === 'SUCCESS'
                        ? <CheckCircle2 className="w-4 h-4 text-green-400 flex-shrink-0" />
                        : <XCircle className="w-4 h-4 text-red-400 flex-shrink-0" />}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-zinc-300 truncate">{r.workflow?.name || 'Unknown'}</p>
                        <p className="text-xs text-zinc-600">{new Date(r.startedAt).toLocaleString()}</p>
                      </div>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        r.status === 'SUCCESS' ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'
                      }`}>
                        {r.stepsDone}/{r.stepsTotal} steps
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* Settings Tab */}
          {tab === 'settings' && (
            <SettingsTab user={user} onUpdate={(u) => setUser(u)} />
          )}
        </div>
      </main>
    </div>
  );
}

function SettingsTab({ user, onUpdate }: { user: User | null; onUpdate: (u: User) => void }) {
  const [form, setForm] = useState({ name: user?.name || '', currentPassword: '', newPassword: '' });
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setMsg(''); setErr('');
    try {
      const payload: any = {};
      if (form.name) payload.name = form.name;
      if (form.currentPassword && form.newPassword) {
        payload.currentPassword = form.currentPassword;
        payload.newPassword = form.newPassword;
      }
      const updated = await auth.updateProfile(payload);
      onUpdate(updated);
      setMsg('Profile updated successfully.');
      setForm((f) => ({ ...f, currentPassword: '', newPassword: '' }));
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <h1 className="text-xl font-bold text-zinc-100 mb-6">Settings</h1>
      <form onSubmit={save} className="glass rounded-2xl p-6 space-y-4 max-w-md">
        {msg && <div className="px-4 py-3 rounded-lg bg-green-500/10 border border-green-500/20 text-green-400 text-sm">{msg}</div>}
        {err && <div className="px-4 py-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">{err}</div>}

        <div>
          <label className="block text-xs font-medium text-zinc-400 mb-1.5">Email</label>
          <input disabled value={user?.email || ''} className="w-full bg-zinc-900/50 border border-zinc-800 rounded-lg px-3 py-2.5 text-sm text-zinc-500 cursor-not-allowed" />
        </div>

        <div>
          <label className="block text-xs font-medium text-zinc-400 mb-1.5">Name</label>
          <input
            type="text"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2.5 text-sm text-zinc-100 focus:outline-none focus:border-violet-500 transition-colors"
          />
        </div>

        <div className="pt-2 border-t border-white/5">
          <p className="text-xs font-medium text-zinc-400 mb-3">Change password</p>
          <div className="space-y-3">
            <input
              type="password"
              placeholder="Current password"
              value={form.currentPassword}
              onChange={(e) => setForm({ ...form, currentPassword: e.target.value })}
              className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2.5 text-sm text-zinc-100 focus:outline-none focus:border-violet-500 transition-colors"
            />
            <input
              type="password"
              placeholder="New password (min. 8 chars)"
              value={form.newPassword}
              onChange={(e) => setForm({ ...form, newPassword: e.target.value })}
              className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2.5 text-sm text-zinc-100 focus:outline-none focus:border-violet-500 transition-colors"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2.5 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
        >
          {loading && <Loader2 className="w-4 h-4 animate-spin" />}
          Save changes
        </button>
      </form>

      <div className="mt-4 glass rounded-2xl p-4 max-w-md">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-zinc-200">Current plan</p>
            <p className="text-xs text-zinc-500 mt-0.5">{user?.plan === 'PRO' ? 'Unlimited workflows, AI suggestions' : '3 workflows, basic replay'}</p>
          </div>
          <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
            user?.plan === 'PRO' ? 'bg-violet-500/20 text-violet-300' : 'bg-zinc-800 text-zinc-400'
          }`}>
            {user?.plan}
          </span>
        </div>
        {user?.plan === 'FREE' && (
          <Link
            href="/register?plan=pro"
            className="flex items-center justify-center gap-2 mt-4 w-full py-2.5 bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium rounded-lg transition-colors"
          >
            Upgrade to Pro
          </Link>
        )}
      </div>
    </div>
  );
}
