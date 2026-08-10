'use client';
import { useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  Play, MousePointer2, Zap, Cloud, Shield, BarChart3,
  ChevronDown, CheckCircle2, ArrowRight, Menu, X, Sparkles
} from 'lucide-react';

const nav = [
  { label: 'Features', href: '#features' },
  { label: 'How it works', href: '#how-it-works' },
  { label: 'Pricing', href: '#pricing' },
  { label: 'FAQ', href: '#faq' },
];

const features = [
  {
    icon: MousePointer2,
    title: 'One-Click Recording',
    desc: 'Click record and just do your task. FlowKit captures every click, input, and navigation automatically.',
  },
  {
    icon: Play,
    title: 'Smart Replay',
    desc: 'Replay workflows with intelligent element detection. Falls back to alternative selectors when pages change.',
  },
  {
    icon: Sparkles,
    title: 'AI Suggestions',
    desc: 'FlowKit detects repeated patterns and suggests automation before you even think about it.',
  },
  {
    icon: Cloud,
    title: 'Cloud Sync',
    desc: 'Your workflows sync across all devices and browsers. Never lose a workflow again.',
  },
  {
    icon: Shield,
    title: 'Privacy First',
    desc: 'Workflows are encrypted and stored securely. We never read your data.',
  },
  {
    icon: BarChart3,
    title: 'Usage Analytics',
    desc: 'See which workflows save you the most time. Track replays, success rates and more.',
  },
];

const steps = [
  {
    n: '01',
    title: 'Install the Extension',
    desc: 'Add FlowKit to Chrome in one click. No account required to start recording.',
  },
  {
    n: '02',
    title: 'Record Your Workflow',
    desc: 'Hit record, perform your task as usual. FlowKit captures every action silently in the background.',
  },
  {
    n: '03',
    title: 'Name & Save',
    desc: 'Give your workflow a name. It\'s saved to your account and ready to replay anytime.',
  },
  {
    n: '04',
    title: 'Replay & Automate',
    desc: 'Click replay. FlowKit executes every step automatically — step by step, just like you did it.',
  },
];

const plans = [
  {
    name: 'Free',
    price: '$0',
    period: 'forever',
    desc: 'Perfect for getting started',
    features: ['3 workflows', 'Basic replay', 'Local storage', 'Chrome Extension'],
    cta: 'Get Started Free',
    href: '/register',
    highlight: false,
  },
  {
    name: 'Pro',
    price: '$9',
    period: '/month',
    desc: 'For power users',
    features: [
      'Unlimited workflows',
      'AI suggestions',
      'Cloud sync',
      'Replay history',
      'Priority support',
      'Advanced analytics',
    ],
    cta: 'Start Pro Free',
    href: '/register?plan=pro',
    highlight: true,
  },
];

const faqs = [
  {
    q: 'How does the recording work?',
    a: 'FlowKit\'s content script listens to DOM events (clicks, inputs, navigations) and captures them as structured steps. Nothing leaves your browser until you choose to save to cloud.',
  },
  {
    q: 'Can it handle dynamic pages?',
    a: 'Yes. The replay engine tries multiple selector strategies — CSS selectors, XPath, text content, and positional fallbacks — to find elements even when pages change.',
  },
  {
    q: 'Is my data secure?',
    a: 'Workflows are transmitted over HTTPS and stored encrypted. We never store form values that look like passwords or credit card numbers.',
  },
  {
    q: 'What\'s the difference between Free and Pro?',
    a: 'Free users can create up to 3 workflows with local storage only. Pro unlocks unlimited workflows, cloud sync across devices, AI pattern detection, and full replay history.',
  },
  {
    q: 'Does it work on all websites?',
    a: 'FlowKit works on most websites. Some sites with heavy anti-bot protection may limit replay, but recording always works.',
  },
];

function Navbar() {
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
            <a key={n.label} href={n.href} className="text-sm text-zinc-400 hover:text-zinc-100 transition-colors">
              {n.label}
            </a>
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
            <a key={n.label} href={n.href} className="text-sm text-zinc-300" onClick={() => setOpen(false)}>
              {n.label}
            </a>
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

function Hero() {
  return (
    <section className="relative pt-32 pb-24 px-4 text-center overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] rounded-full bg-violet-600/10 blur-[120px]" />
        <div className="absolute top-20 left-1/4 w-[300px] h-[300px] rounded-full bg-indigo-600/5 blur-[80px]" />
      </div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="relative max-w-4xl mx-auto">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 mb-6 rounded-full border border-violet-500/30 bg-violet-500/10 text-violet-300 text-xs font-medium">
          <Sparkles className="w-3 h-3" />
          AI-powered browser automation
        </div>

        <h1 className="text-5xl sm:text-6xl md:text-7xl font-bold tracking-tight mb-6 leading-[1.1]">
          Teach Your Browser{' '}
          <span className="gradient-text">Repetitive Work</span>
        </h1>

        <p className="text-xl text-zinc-400 max-w-2xl mx-auto mb-10 leading-relaxed">
          FlowKit records your repetitive browser tasks and replays them automatically.
          No code. No complex setup. Just record once and let it run.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <a
            href="https://chrome.google.com/webstore"
            className="flex items-center justify-center gap-2 px-8 py-4 bg-violet-600 hover:bg-violet-500 text-white font-semibold rounded-xl transition-all duration-200 shadow-lg shadow-violet-900/40 glow"
          >
            <Zap className="w-5 h-5" />
            Install Extension — Free
          </a>
          <Link
            href="/register"
            className="flex items-center justify-center gap-2 px-8 py-4 border border-zinc-700 hover:border-zinc-500 text-zinc-300 font-medium rounded-xl transition-all duration-200 hover:bg-white/5"
          >
            Start Free
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        <p className="mt-4 text-sm text-zinc-600">No credit card required · 3 workflows free forever</p>
      </motion.div>

      {/* Fake UI preview */}
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0.3 }}
        className="relative max-w-3xl mx-auto mt-16"
      >
        <div className="glass rounded-2xl overflow-hidden glow">
          <div className="bg-zinc-900/80 px-4 py-3 flex items-center gap-2 border-b border-white/5">
            <div className="flex gap-1.5">
              <div className="w-3 h-3 rounded-full bg-red-500/60" />
              <div className="w-3 h-3 rounded-full bg-yellow-500/60" />
              <div className="w-3 h-3 rounded-full bg-green-500/60" />
            </div>
            <div className="flex-1 flex justify-center">
              <div className="bg-zinc-800 rounded px-6 py-1 text-xs text-zinc-500">flowkit.digitaladexpert.de/dashboard</div>
            </div>
          </div>
          <div className="p-6 grid grid-cols-3 gap-4">
            {['Fill CRM Form', 'Weekly Report', 'Post to Socials'].map((name, i) => (
              <div key={name} className="bg-zinc-900/60 rounded-xl p-4 border border-white/5 hover:border-violet-500/30 transition-colors cursor-pointer group">
                <div className="w-8 h-8 rounded-lg bg-violet-500/20 flex items-center justify-center mb-3 group-hover:bg-violet-500/30 transition-colors">
                  <Play className="w-4 h-4 text-violet-400" />
                </div>
                <p className="text-sm font-medium text-zinc-200">{name}</p>
                <p className="text-xs text-zinc-500 mt-1">{[8, 3, 12][i]} steps</p>
              </div>
            ))}
          </div>
        </div>
      </motion.div>
    </section>
  );
}

function Features() {
  return (
    <section id="features" className="py-24 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <p className="text-violet-400 text-sm font-medium mb-3 uppercase tracking-wider">Features</p>
          <h2 className="text-4xl font-bold gradient-text mb-4">Everything you need</h2>
          <p className="text-zinc-400 max-w-lg mx-auto">
            Powerful enough for developers. Simple enough for everyone else.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="glass rounded-2xl p-6 hover:border-violet-500/30 transition-colors group"
            >
              <div className="w-10 h-10 rounded-xl bg-violet-500/15 flex items-center justify-center mb-4 group-hover:bg-violet-500/25 transition-colors">
                <f.icon className="w-5 h-5 text-violet-400" />
              </div>
              <h3 className="font-semibold text-zinc-100 mb-2">{f.title}</h3>
              <p className="text-sm text-zinc-500 leading-relaxed">{f.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

function HowItWorks() {
  return (
    <section id="how-it-works" className="py-24 px-4 relative">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] rounded-full bg-indigo-600/8 blur-[100px]" />
      </div>
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-16">
          <p className="text-violet-400 text-sm font-medium mb-3 uppercase tracking-wider">How it works</p>
          <h2 className="text-4xl font-bold gradient-text mb-4">Up and running in minutes</h2>
        </div>
        <div className="space-y-6">
          {steps.map((s, i) => (
            <motion.div
              key={s.n}
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.15 }}
              className="glass rounded-2xl p-6 flex gap-6 items-start"
            >
              <div className="text-4xl font-bold text-violet-500/30 tabular-nums leading-none flex-shrink-0 w-12">{s.n}</div>
              <div>
                <h3 className="font-semibold text-zinc-100 mb-1">{s.title}</h3>
                <p className="text-sm text-zinc-500 leading-relaxed">{s.desc}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Pricing() {
  return (
    <section id="pricing" className="py-24 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-16">
          <p className="text-violet-400 text-sm font-medium mb-3 uppercase tracking-wider">Pricing</p>
          <h2 className="text-4xl font-bold gradient-text mb-4">Simple, transparent pricing</h2>
          <p className="text-zinc-400">Start free. Upgrade when you need more.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl mx-auto">
          {plans.map((p) => (
            <div
              key={p.name}
              className={`rounded-2xl p-8 ${p.highlight
                ? 'bg-gradient-to-b from-violet-600/20 to-transparent border-2 border-violet-500/40 relative overflow-hidden'
                : 'glass'
              }`}
            >
              {p.highlight && (
                <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-violet-400 to-transparent" />
              )}

              {/* Pro — Coming Soon badge */}
              {p.highlight && (
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-400 text-xs font-semibold mb-3 tracking-wide">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse inline-block" />
                  Coming Soon
                </div>
              )}

              <h3 className="text-xl font-bold text-zinc-100 mb-1">{p.name}</h3>
              <p className="text-zinc-500 text-sm mb-4">{p.desc}</p>

              {p.highlight ? (
                <div className="mb-6">
                  <div className="flex items-baseline gap-2">
                    <span className="text-4xl font-bold text-zinc-500 line-through decoration-zinc-600">{p.price}</span>
                    <span className="text-zinc-600 text-sm line-through">{p.period}</span>
                  </div>
                  <p className="text-xs text-zinc-600 mt-1">Pricing will be announced at launch</p>
                </div>
              ) : (
                <div className="flex items-baseline gap-1 mb-6">
                  <span className="text-4xl font-bold text-zinc-100">{p.price}</span>
                  <span className="text-zinc-500 text-sm">{p.period}</span>
                </div>
              )}

              <ul className="space-y-3 mb-8">
                {p.features.map((f) => (
                  <li key={f} className={`flex items-center gap-2 text-sm ${p.highlight ? 'text-zinc-500' : 'text-zinc-300'}`}>
                    <CheckCircle2 className={`w-4 h-4 flex-shrink-0 ${p.highlight ? 'text-zinc-600' : 'text-violet-400'}`} />
                    {f}
                  </li>
                ))}
              </ul>

              {p.highlight ? (
                <div className="w-full text-center py-3 rounded-xl font-medium text-sm bg-zinc-800/60 border border-zinc-700/50 text-zinc-500 cursor-default select-none">
                  Notify me at launch →
                </div>
              ) : (
                <Link
                  href={p.href}
                  className="block w-full text-center py-3 rounded-xl font-medium text-sm transition-all duration-200 border border-zinc-700 hover:border-zinc-500 text-zinc-300 hover:bg-white/5"
                >
                  {p.cta}
                </Link>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function FAQ() {
  const [open, setOpen] = useState<number | null>(null);
  return (
    <section id="faq" className="py-24 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-12">
          <p className="text-violet-400 text-sm font-medium mb-3 uppercase tracking-wider">FAQ</p>
          <h2 className="text-3xl font-bold gradient-text mb-4">Common questions</h2>
        </div>
        <div className="space-y-3">
          {faqs.map((f, i) => (
            <div key={i} className="glass rounded-xl overflow-hidden">
              <button
                className="w-full flex items-center justify-between gap-4 px-5 py-4 text-left"
                onClick={() => setOpen(open === i ? null : i)}
              >
                <span className="text-sm font-medium text-zinc-200">{f.q}</span>
                <ChevronDown
                  className={`w-4 h-4 text-zinc-500 flex-shrink-0 transition-transform duration-200 ${open === i ? 'rotate-180' : ''}`}
                />
              </button>
              {open === i && (
                <div className="px-5 pb-4 text-sm text-zinc-500 leading-relaxed border-t border-white/5 pt-3">
                  {f.a}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function CTA() {
  return (
    <section className="py-24 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="relative rounded-3xl overflow-hidden bg-gradient-to-br from-violet-600/20 via-zinc-900 to-zinc-900 border border-violet-500/20 p-12 text-center">
          <div className="absolute inset-0 bg-gradient-to-br from-violet-600/5 to-transparent pointer-events-none" />
          <h2 className="relative text-3xl md:text-4xl font-bold text-white mb-4">
            Ready to automate your workflow?
          </h2>
          <p className="relative text-zinc-400 mb-8 max-w-md mx-auto">
            Join thousands of users saving hours every week with FlowKit. Start free, no card required.
          </p>
          <div className="relative flex flex-col sm:flex-row gap-3 justify-center">
            <a
              href="https://chrome.google.com/webstore"
              className="flex items-center justify-center gap-2 px-8 py-4 bg-violet-600 hover:bg-violet-500 text-white font-semibold rounded-xl transition-all duration-200 shadow-lg shadow-violet-900/40"
            >
              <Zap className="w-5 h-5" />
              Install Extension — Free
            </a>
            <Link
              href="/register"
              className="flex items-center justify-center gap-2 px-8 py-4 border border-zinc-700 hover:border-zinc-500 text-zinc-300 font-medium rounded-xl transition-all duration-200 hover:bg-white/5"
            >
              Start Free
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

function Footer() {
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
          <Link href="/privacy" className="hover:text-zinc-400 transition-colors">Privacy</Link>
          <Link href="/terms" className="hover:text-zinc-400 transition-colors">Terms</Link>
          <a href="mailto:info@digitaladexpert.de" className="hover:text-zinc-400 transition-colors">Contact</a>
        </div>
        <p className="text-sm text-zinc-700">© 2026 FlowKit · Digital Ad Expert</p>
      </div>
    </footer>
  );
}

export default function LandingPage() {
  return (
    <main className="relative bg-zinc-950 min-h-screen">
      <Navbar />
      <Hero />
      <Features />
      <HowItWorks />
      <Pricing />
      <FAQ />
      <CTA />
      <Footer />
    </main>
  );
}
