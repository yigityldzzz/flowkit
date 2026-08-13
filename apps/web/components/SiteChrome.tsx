'use client';
import { useState } from 'react';
import Link from 'next/link';
import { Zap, Menu, X } from 'lucide-react';

const nav = [
  { label: 'Templates', href: '/templates' },
  { label: 'Features', href: '/#features' },
  { label: 'Pricing', href: '/#pricing' },
];

export function Navbar() {
  const [open, setOpen] = useState(false);
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 border-b border-white/5 bg-zinc-950/80 backdrop-blur-xl">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 font-bold text-lg">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center">
            <Zap className="w-4 h-4 text-white" />
          </div>
          <span className="gradient-text">FlowKit</span>
        </Link>

        <div className="hidden md:flex items-center gap-6">
          {nav.map((n) => (
            <Link key={n.label} href={n.href} className="text-sm text-zinc-400 hover:text-zinc-100 transition-colors">
              {n.label}
            </Link>
          ))}
        </div>

        <div className="hidden md:flex items-center gap-3">
          <Link href="/login" className="text-sm text-zinc-400 hover:text-zinc-100 transition-colors px-4 py-2">
            Sign in
          </Link>
          <Link
            href="/register"
            className="text-sm font-medium px-4 py-2 rounded-lg bg-violet-600 hover:bg-violet-500 text-white transition-colors"
          >
            Get Started
          </Link>
        </div>

        <button className="md:hidden text-zinc-400" onClick={() => setOpen(!open)}>
          {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {open && (
        <div className="md:hidden border-t border-white/5 bg-zinc-950 px-4 py-4 flex flex-col gap-4">
          {nav.map((n) => (
            <Link key={n.label} href={n.href} className="text-sm text-zinc-300" onClick={() => setOpen(false)}>
              {n.label}
            </Link>
          ))}
          <div className="flex flex-col gap-2 pt-2 border-t border-white/5">
            <Link href="/login" className="text-sm text-zinc-400 py-2">Sign in</Link>
            <Link href="/register" className="text-sm font-medium px-4 py-2 rounded-lg bg-violet-600 text-white text-center">
              Get Started
            </Link>
          </div>
        </div>
      )}
    </nav>
  );
}

export function Footer() {
  return (
    <footer className="border-t border-white/5 py-12 px-4">
      <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center">
            <Zap className="w-3.5 h-3.5 text-white" />
          </div>
          <span className="font-semibold gradient-text">FlowKit</span>
        </div>
        <div className="flex items-center gap-6 text-sm text-zinc-600">
          <Link href="/templates" className="hover:text-zinc-400 transition-colors">Templates</Link>
          <Link href="/privacy" className="hover:text-zinc-400 transition-colors">Privacy</Link>
          <Link href="/terms" className="hover:text-zinc-400 transition-colors">Terms</Link>
          <a href="mailto:info@digitaladexpert.de" className="hover:text-zinc-400 transition-colors">Contact</a>
        </div>
        <p className="text-sm text-zinc-700">© 2026 FlowKit · Digital Ad Expert</p>
      </div>
    </footer>
  );
}
