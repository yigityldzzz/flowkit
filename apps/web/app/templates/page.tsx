'use client';
import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { Search, Layers, Copy, Loader2, ChevronLeft, ChevronRight as ChevronRightIcon } from 'lucide-react';
import { templates as templatesApi } from '@/lib/api';
import { Navbar, Footer } from '@/components/SiteChrome';

type Template = {
  id: string;
  title: string;
  description: string;
  category: string;
  cloneCount: number;
  stepCount: number;
  createdAt: string;
  author: { name?: string };
};

export default function TemplatesPage() {
  const [items, setItems] = useState<Template[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [category, setCategory] = useState<string>('');
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await templatesApi.list({ category: category || undefined, search: search || undefined, page });
      setItems(res.templates);
      setTotalPages(res.totalPages);
      setTotal(res.total);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [category, search, page]);

  useEffect(() => {
    templatesApi.categories().then(setCategories).catch(() => setCategories([]));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  function submitSearch(e: React.FormEvent) {
    e.preventDefault();
    setPage(1);
    setSearch(searchInput);
  }

  return (
    <div className="min-h-screen bg-zinc-950">
      <Navbar />

      <main className="pt-32 pb-24 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 mb-6 rounded-full border border-violet-500/30 bg-violet-500/10 text-violet-300 text-xs font-medium">
              <Layers className="w-3 h-3" />
              Community Template Gallery
            </div>
            <h1 className="text-4xl sm:text-5xl font-bold tracking-tight mb-4">
              Don't start from <span className="gradient-text">scratch</span>
            </h1>
            <p className="text-lg text-zinc-400 max-w-xl mx-auto">
              Browse automations built and shared by the FlowKit community. Clone one to your account in a click.
            </p>
          </div>

          {/* Search */}
          <form onSubmit={submitSearch} className="max-w-lg mx-auto mb-6">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Search templates..."
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl pl-11 pr-4 py-3 text-sm text-zinc-100 focus:outline-none focus:border-violet-500 transition-colors"
              />
            </div>
          </form>

          {/* Category filter */}
          <div className="flex flex-wrap items-center justify-center gap-2 mb-12">
            <button
              onClick={() => { setCategory(''); setPage(1); }}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                category === '' ? 'bg-violet-600 text-white' : 'bg-zinc-900 text-zinc-400 hover:text-zinc-200 border border-zinc-800'
              }`}
            >
              All
            </button>
            {categories.map((c) => (
              <button
                key={c}
                onClick={() => { setCategory(c); setPage(1); }}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                  category === c ? 'bg-violet-600 text-white' : 'bg-zinc-900 text-zinc-400 hover:text-zinc-200 border border-zinc-800'
                }`}
              >
                {c}
              </button>
            ))}
          </div>

          {/* Results */}
          {loading ? (
            <div className="flex items-center justify-center py-24">
              <Loader2 className="w-6 h-6 text-violet-400 animate-spin" />
            </div>
          ) : items.length === 0 ? (
            <div className="glass rounded-2xl p-16 text-center max-w-lg mx-auto">
              <div className="w-12 h-12 rounded-2xl bg-violet-500/15 flex items-center justify-center mx-auto mb-4">
                <Layers className="w-6 h-6 text-violet-400" />
              </div>
              <h3 className="font-semibold text-zinc-200 mb-2">No templates found</h3>
              <p className="text-sm text-zinc-500">
                {search || category
                  ? 'Try a different search or category.'
                  : 'Be the first to publish a workflow to the gallery from your dashboard.'}
              </p>
            </div>
          ) : (
            <>
              <p className="text-sm text-zinc-600 mb-4">{total} template{total !== 1 ? 's' : ''}</p>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {items.map((t) => (
                  <Link
                    key={t.id}
                    href={`/templates/${t.id}`}
                    className="glass rounded-2xl p-5 hover:border-violet-500/30 transition-colors group flex flex-col"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs px-2 py-1 rounded-full bg-violet-500/10 text-violet-300 font-medium">
                        {t.category}
                      </span>
                      <span className="flex items-center gap-1 text-xs text-zinc-600">
                        <Copy className="w-3 h-3" />
                        {t.cloneCount}
                      </span>
                    </div>
                    <h3 className="font-semibold text-zinc-100 mb-1.5 group-hover:text-violet-300 transition-colors">
                      {t.title}
                    </h3>
                    <p className="text-sm text-zinc-500 line-clamp-2 flex-1">{t.description}</p>
                    <div className="flex items-center justify-between mt-4 pt-4 border-t border-white/5 text-xs text-zinc-600">
                      <span>{t.stepCount} steps</span>
                      <span>by {t.author?.name || 'a FlowKit user'}</span>
                    </div>
                  </Link>
                ))}
              </div>

              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-3 mt-10">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page <= 1}
                    className="p-2 rounded-lg border border-zinc-800 text-zinc-400 disabled:opacity-30 hover:text-zinc-100 transition-colors"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="text-sm text-zinc-500">Page {page} of {totalPages}</span>
                  <button
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page >= totalPages}
                    className="p-2 rounded-lg border border-zinc-800 text-zinc-400 disabled:opacity-30 hover:text-zinc-100 transition-colors"
                  >
                    <ChevronRightIcon className="w-4 h-4" />
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
