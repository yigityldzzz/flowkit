import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Terms of Service — FlowKit',
  description: 'FlowKit terms of service. The rules for using the FlowKit Chrome Extension and website.',
}

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-zinc-950 px-4 py-20">
      <div className="max-w-2xl mx-auto">
        <Link href="/" className="text-sm text-violet-400 hover:text-violet-300 transition-colors mb-8 inline-block">
          ← Back to FlowKit
        </Link>

        <h1 className="text-3xl font-bold text-zinc-100 mb-2">Terms of Service</h1>
        <p className="text-sm text-zinc-500 mb-10">Last updated: August 13, 2026</p>

        <div className="prose prose-invert prose-sm max-w-none space-y-8 text-zinc-400 leading-relaxed">

          <section>
            <h2 className="text-lg font-semibold text-zinc-200 mb-3">1. Who we are</h2>
            <p>
              FlowKit is a browser-automation Chrome Extension and companion web app operated by Digital
              Ad Expert / Yiğit Yıldız, a sole proprietor registered with the Albanian National Business
              Center (Qendra Kombëtare e Biznesit), business registration number (NUIS) M61404014A,
              registered address Rruga Astrit Losha, Pallati Marituda, Tiranë, Albania. By installing the
              extension or creating an account, you agree to these Terms.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-zinc-200 mb-3">2. The service</h2>
            <p>
              FlowKit lets you record sequences of browser interactions (clicks, text inputs, page
              navigations) and replay them later. Recorded workflows are stored locally in your browser
              by default; Pro accounts (when available) will additionally sync workflows to our servers in
              encrypted form, as described in our{' '}
              <Link href="/privacy" className="text-violet-400 hover:text-violet-300">Privacy Policy</Link>.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-zinc-200 mb-3">3. Plans and pricing</h2>
            <p>
              The Free plan is available today at no cost, with the limits shown on our{' '}
              <Link href="/#pricing" className="text-violet-400 hover:text-violet-300">pricing page</Link>{' '}
              (currently up to 3 saved workflows). A paid Pro plan is planned but not yet available for
              purchase — where our site shows "Coming Soon," no payment is being collected and no
              subscription exists yet. We will update these Terms and publish separate billing terms
              before Pro becomes purchasable.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-zinc-200 mb-3">4. Acceptable use</h2>
            <p>You agree not to use FlowKit to:</p>
            <ul className="list-disc list-inside space-y-2">
              <li>Automate actions that violate the terms of service of the website you are interacting with</li>
              <li>Record or replay workflows involving other people's accounts or data without authorization</li>
              <li>Attempt to disrupt, overload, or gain unauthorized access to our infrastructure</li>
              <li>Use the extension for any unlawful purpose</li>
            </ul>
            <p className="mt-2">
              You are solely responsible for the workflows you create and run, and for ensuring your use
              of automation complies with the rules of any third-party site you target.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-zinc-200 mb-3">5. Your account</h2>
            <p>
              You are responsible for keeping your login credentials secure and for all activity under
              your account. Notify us at{' '}
              <a href="mailto:info@digitaladexpert.de" className="text-violet-400 hover:text-violet-300">
                info@digitaladexpert.de
              </a>{' '}
              if you suspect unauthorized use of your account.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-zinc-200 mb-3">6. Service availability</h2>
            <p>
              FlowKit is an early-stage product. We do not currently guarantee a specific uptime SLA; the
              service is provided on an "as is" / "as available" basis. We aim to communicate planned
              maintenance and outages when practical, but downtime can occur without notice.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-zinc-200 mb-3">7. Intellectual property</h2>
            <p>
              FlowKit's code, branding, and extension are our property or licensed to us. You retain all
              rights to the workflows you create; we do not claim ownership over your workflow data.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-zinc-200 mb-3">8. Limitation of liability</h2>
            <p>
              FlowKit is provided without warranties of any kind, express or implied. To the maximum
              extent permitted by law, we are not liable for indirect, incidental, or consequential
              damages arising from your use of the extension or website, including damages resulting from
              automated actions performed on third-party websites via workflows you created.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-zinc-200 mb-3">9. Termination</h2>
            <p>
              You may stop using FlowKit and delete your account at any time by contacting{' '}
              <a href="mailto:info@digitaladexpert.de" className="text-violet-400 hover:text-violet-300">
                info@digitaladexpert.de
              </a>. We may suspend or terminate accounts that violate these Terms.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-zinc-200 mb-3">10. Changes to these Terms</h2>
            <p>
              We may update these Terms as the product evolves. Continued use of FlowKit after an update
              constitutes acceptance of the revised Terms. Material changes will be reflected by updating
              the "Last updated" date above.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-zinc-200 mb-3">11. Governing law</h2>
            <p>
              These Terms are governed by the laws of Albania, where the service operator is registered,
              without regard to its conflict-of-law provisions, unless mandatory consumer-protection law
              in your country of residence provides otherwise.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-zinc-200 mb-3">12. Contact</h2>
            <p>
              Questions about these Terms? Reach us at{' '}
              <a href="mailto:info@digitaladexpert.de" className="text-violet-400 hover:text-violet-300">
                info@digitaladexpert.de
              </a>.
            </p>
          </section>

        </div>
      </div>
    </main>
  )
}
