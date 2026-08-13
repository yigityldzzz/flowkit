import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Privacy Policy — FlowKit',
  description: 'FlowKit privacy policy. How we collect, use, and protect your data.',
}

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-zinc-950 px-4 py-20">
      <div className="max-w-2xl mx-auto">
        <Link href="/" className="text-sm text-violet-400 hover:text-violet-300 transition-colors mb-8 inline-block">
          ← Back to FlowKit
        </Link>

        <h1 className="text-3xl font-bold text-zinc-100 mb-2">Privacy Policy</h1>
        <p className="text-sm text-zinc-500 mb-10">Last updated: May 24, 2026</p>

        <div className="prose prose-invert prose-sm max-w-none space-y-8 text-zinc-400 leading-relaxed">

          <section>
            <h2 className="text-lg font-semibold text-zinc-200 mb-3">1. Overview</h2>
            <p>
              FlowKit ("we", "our", "us") is a browser automation tool developed by Digital Ad Expert.
              This Privacy Policy explains what data we collect through the FlowKit Chrome Extension
              and website, how we use it, and your rights regarding that data.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-zinc-200 mb-3">2. Data We Collect</h2>
            <h3 className="text-base font-medium text-zinc-300 mb-2">Account data</h3>
            <p>
              When you create an account, we collect your email address and a hashed version of your
              password. We never store passwords in plain text.
            </p>
            <h3 className="text-base font-medium text-zinc-300 mb-2 mt-4">Workflow data</h3>
            <p>
              When you record a workflow, the extension captures the sequence of interactions you perform
              (clicks, text inputs, page navigations). This data is stored locally on your device and,
              if you are signed in with a Pro account, synced to our servers in encrypted form.
            </p>
            <p className="mt-2">
              <strong className="text-zinc-300">We never record password fields.</strong> Any input field
              of type <code className="text-violet-400">password</code> is automatically excluded from recording.
            </p>
            <h3 className="text-base font-medium text-zinc-300 mb-2 mt-4">Usage analytics</h3>
            <p>
              We collect aggregate, non-identifiable usage data such as workflow count and replay count
              to improve the product.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-zinc-200 mb-3">3. How We Use Your Data</h2>
            <ul className="list-disc list-inside space-y-2">
              <li>To provide and maintain the FlowKit service</li>
              <li>To sync your workflows across devices (Pro plan)</li>
              <li>To authenticate your account securely</li>
              <li>To improve the product based on aggregate usage patterns</li>
            </ul>
            <p className="mt-4">
              We do <strong className="text-zinc-300">not</strong> sell, rent, or transfer your personal
              data to third parties. We do not use your data for advertising or creditworthiness purposes.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-zinc-200 mb-3">4. Data Storage &amp; Security</h2>
            <p>
              Workflow data is stored locally in <code className="text-violet-400">chrome.storage.local</code> on
              your device. Cloud-synced data is stored in encrypted form in our PostgreSQL database hosted
              on a private server. All data is transmitted over HTTPS (TLS 1.2+).
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-zinc-200 mb-3">5. Chrome Extension Permissions</h2>
            <ul className="list-disc list-inside space-y-2">
              <li><strong className="text-zinc-300">storage</strong> — saves workflows and auth tokens locally</li>
              <li><strong className="text-zinc-300">tabs</strong> — sends recording commands to the active tab</li>
              <li><strong className="text-zinc-300">activeTab</strong> — injects recorder only when user starts recording</li>
              <li><strong className="text-zinc-300">scripting</strong> — executes replay steps on demand</li>
              <li><strong className="text-zinc-300">host permissions (&lt;all_urls&gt;)</strong> — allows recording and replay on any site chosen by the user</li>
            </ul>
            <p className="mt-4">
              The extension only activates recording when you explicitly press "Start Recording".
              It does not monitor your browsing activity passively.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-zinc-200 mb-3">6. Data Retention</h2>
            <p>
              Local workflow data remains on your device until you delete it. Cloud data is retained
              while your account is active. You can delete your account and all associated data at
              any time by contacting us at{' '}
              <a href="mailto:info@digitaladexpert.de" className="text-violet-400 hover:text-violet-300">
                info@digitaladexpert.de
              </a>.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-zinc-200 mb-3">7. Third Parties</h2>
            <p>
              We do not share your personal data with third parties except as required by law.
              We do not use third-party analytics SDKs that track individual users.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-zinc-200 mb-3">8. Your Rights</h2>
            <p>
              You have the right to access, correct, or delete your personal data at any time.
              To exercise these rights, contact us at{' '}
              <a href="mailto:info@digitaladexpert.de" className="text-violet-400 hover:text-violet-300">
                info@digitaladexpert.de
              </a>.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-zinc-200 mb-3">9. Contact</h2>
            <p>
              Digital Ad Expert<br />
              <a href="mailto:info@digitaladexpert.de" className="text-violet-400 hover:text-violet-300">
                info@digitaladexpert.de
              </a><br />
              <a href="https://flowkit.digitaladexpert.de" className="text-violet-400 hover:text-violet-300">
                flowkit.digitaladexpert.de
              </a>
            </p>
            <p className="mt-3 text-xs text-zinc-500">
              FlowKit is operated by Digital Ad Expert / Yiğit Yıldız, a sole proprietor registered with
              the Albanian National Business Center (Qendra Kombëtare e Biznesit), business registration
              number (NUIS) M61404014A. Registered address: Rruga Astrit Losha, Pallati Marituda, Tiranë,
              Albania.
            </p>
          </section>

        </div>
      </div>
    </main>
  )
}
