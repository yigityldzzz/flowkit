'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft, Copy, Loader2, MousePointer2, Keyboard, Navigation,
  Clock, MousePointer, ListFilter, CheckCircle2, AlertCircle
} from 'lucide-react';
import { templates as templatesApi } from '@/lib/api';
import { Navbar, Footer } from '@/components/SiteChrome';

type Step = {
  type: 'click' | 'input' | 'navigate' | 'wait' | 'scroll' | 'select';
  selector?: string;
  value?: string;
  url?: string;
  delay?: number;
  description?: string;
};

type TemplateDetail = {
  id: string;
  title: string;
  description: string;
  category: string;
  steps: Step[];
  cloneCount: number;
  createdAt: string;
  author: { name?: string };
};

const STEP_ICONS: Record<Step['type'], any> = {
  click: MousePointer2,
  input: Keyboard,
  navigate: Navigation,
  wait: Clock,
  scroll: MousePointer,
  select: ListFilter,
};

function stepLabel(step: Step): string {
  if (step.description) return step.description;
  switch (step.type) {
    case 'navigate': return `Go to ${step.url || 'page'}`;
    case 'click': return `Click ${step.selector || 'element'}`;
    case 'input': return `Type into ${step.selector || 'field'}`;
    case 'wait': return `Wait ${step.delay ? `${step.delay}ms` : ''}`;
    case 'scroll': return 'Scroll page';
    case 'select': return `Select option in ${step.selector || 'field'}`;
    default: return step.type;
  }
}

export default function TemplateDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [template, setTemplate] = useState<TemplateDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [cloning, setCloning] = useState(false);
  const [cloneError, setCloneError] = useState('');
  const [cloneSuccess, setCloneSuccess] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    setIsLoggedIn(!!localStorage.getItem('fk_access_token'));
    templatesApi.get(params.id)
      .then(setTemplate)
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [params.id]);

  async function clone() {
    if (!isLoggedIn) return;
    setCloning(true);
    setCloneError('');
    try {
      await templatesApi.clone(params.id);
      setCloneSuccess(true);
    } catch (e: any) {
      setCloneError(e.data?.error || e.message || 'Failed to clone template.');
    } finally {
      setCloning(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <Loader2 className="w-6 h-6 text-violet-400 animate-spin" />
      </div>
    );
  }

  if (notFound || !template) {
    return (
      <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center px-4 text-center">
        <h1 className="text-2xl font-bold text-zinc-100 mb-2">Template not found</h1>
        <p className="text-zinc-500 mb-6">This template may have been unpublished by its author.</p>
        <Link href="/templates" className="text-violet-400 hover:text-violet-300 transition-colors">
          ← Back to Template Gallery
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950">
      <Navbar />

      <main className="pt-28 pb-24 px-4">
        <div className="max-w-3xl mx-auto">
          <Link href="/templates" className="inline-flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-300 transition-colors mb-8">
            <ArrowLeft className="w-4 h-4" />
            Back to Template Gallery
          </Link>

          <div className="glass rounded-2xl p-8">
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs px-2.5 py-1 rounded-full bg-violet-500/10 text-violet-300 font-medium">
                {template.category}
              </span>
              <span className="flex items-center gap-1.5 text-xs text-zinc-600">
                <Copy className="w-3.5 h-3.5" />
                {template.cloneCount} clone{template.cloneCount !== 1 ? 's' : ''}
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-bold text-zinc-100 mb-3">{template.title}</h1>
            <p className="text-zinc-400 leading-relaxed mb-2">{template.description}</p>
            <p className="text-sm text-zinc-600 mb-8">
              Published by {template.author?.name || 'a FlowKit user'} · {template.steps.length} steps
            </p>

            {/* Clone CTA */}
            {cloneSuccess ? (
              <div className="flex items-center gap-3 px-4 py-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm mb-8">
                <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
                <span className="flex-1">Added to your workflows.</span>
                <Link href="/dashboard" className="font-semibold hover:underline flex-shrink-0">Open Dashboard →</Link>
              </div>
            ) : isLoggedIn ? (
              <div className="mb-8">
                {cloneError && (
                  <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm mb-3">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    {cloneError}
                  </div>
                )}
                <button
                  onClick={clone}
                  disabled={cloning}
                  className="flex items-center justify-center gap-2 w-full sm:w-auto px-6 py-3 bg-violet-600 hover:bg-violet-500 disabled:opacity-60 text-white font-semibold rounded-xl transition-colors"
                >
                  {cloning ? <Loader2 className="w-4 h-4 animate-spin" /> : <Copy className="w-4 h-4" />}
                  Clone to My Workflows
                </button>
              </div>
            ) : (
              <div className="flex flex-col sm:flex-row items-center gap-3 px-4 py-4 rounded-xl bg-zinc-900/60 border border-zinc-800 mb-8">
                <p className="text-sm text-zinc-400 flex-1 text-center sm:text-left">
                  Sign in or create a free account to clone this template.
                </p>
                <div className="flex gap-2 flex-shrink-0">
                  <Link href="/login" className="px-4 py-2 text-sm border border-zinc-700 text-zinc-300 rounded-lg hover:bg-white/5 transition-colors">
                    Sign in
                  </Link>
                  <Link href="/register" className="px-4 py-2 text-sm bg-violet-600 hover:bg-violet-500 text-white rounded-lg transition-colors">
                    Sign up free
                  </Link>
                </div>
              </div>
            )}

            {/* Steps preview */}
            <h2 className="text-sm font-semibold text-zinc-400 mb-3">Steps preview</h2>
            <div className="space-y-2">
              {template.steps.map((step, i) => {
                const Icon = STEP_ICONS[step.type] || MousePointer2;
                return (
                  <div key={i} className="flex items-center gap-3 px-4 py-2.5 rounded-lg bg-zinc-900/60 border border-zinc-800/60">
                    <span className="w-5 h-5 rounded-full bg-zinc-800 text-zinc-500 text-xs flex items-center justify-center flex-shrink-0">
                      {i + 1}
                    </span>
                    <Icon className="w-4 h-4 text-violet-400 flex-shrink-0" />
                    <span className="text-sm text-zinc-300 truncate">{stepLabel(step)}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
