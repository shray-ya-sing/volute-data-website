import { useNavigate, Link } from "react-router";
import { ArrowLeft } from "lucide-react";

export function Terms() {
  const navigate = useNavigate();

  return (
    <div className="volute-root">
      {/* Header */}
      <header className="v-header">
        <a className="v-logo" href="/">
          <span className="v-logo-name">Volute</span>
        </a>
        <button
          onClick={() => navigate("/")}
          className="text-sm text-gray-600 hover:text-gray-900 flex items-center gap-2 transition-colors"
        >
          <ArrowLeft size={16} />
          Back to Home
        </button>
      </header>

      {/* Main Content */}
      <main className="v-main">
        <div className="max-w-4xl mx-auto px-6 py-16">
          <h1 className="text-4xl font-bold text-gray-900 mb-8">Terms of Service</h1>
          
          <div className="prose prose-gray max-w-none">
            <p className="text-gray-600 mb-8">
              <strong>Last Updated:</strong> March 13, 2026
            </p>

            <section className="mb-10">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">1. Acceptance of Terms</h2>
              <p className="text-gray-600 leading-relaxed mb-4">
                By accessing and using Volute ("Service"), you accept and agree to be bound by these Terms of Service ("Terms"). If you do not agree to these Terms, please do not use our Service.
              </p>
            </section>

            <section className="mb-10">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">2. Description of Service</h2>
              <p className="text-gray-600 leading-relaxed mb-4">
                Volute is a data aggregation and presentation platform that enables users to generate presentation slides based on financial data and natural language prompts. The Service includes access to:
              </p>
              <ul className="list-disc pl-6 text-gray-600 space-y-2 mb-4">
                <li>AI-powered research and data aggregation</li>
                <li>Automated slide generation</li>
                <li>Citation-linked sources</li>
                <li>Export capabilities (PDF, PNG, PPTX)</li>
              </ul>
            </section>

            <section className="mb-10">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">3. User Accounts</h2>
              <h3 className="text-xl font-medium text-gray-800 mb-3 mt-6">3.1 Account Registration</h3>
              <p className="text-gray-600 leading-relaxed mb-4">
                You may be required to create an account to access certain features. You must provide accurate, current, and complete information during registration and keep your account information up to date.
              </p>

              <h3 className="text-xl font-medium text-gray-800 mb-3 mt-6">3.2 Account Security</h3>
              <p className="text-gray-600 leading-relaxed mb-4">
                You are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account. Notify us immediately of any unauthorized use.
              </p>
            </section>

            <section className="mb-10">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">4. Acceptable Use</h2>
              <p className="text-gray-600 leading-relaxed mb-4">
                You agree to use the Service only for lawful purposes. You shall not:
              </p>
              <ul className="list-disc pl-6 text-gray-600 space-y-2 mb-4">
                <li>Violate any applicable laws or regulations</li>
                <li>Infringe on intellectual property rights</li>
                <li>Transmit malicious code or disrupt the Service</li>
                <li>Attempt to gain unauthorized access to the Service or related systems</li>
                <li>Use the Service to generate misleading or fraudulent content</li>
                <li>Scrape, copy, or download large portions of data without permission</li>
                <li>Use automated systems to access the Service in ways that send more requests than a human could reasonably produce</li>
              </ul>
            </section>

            <section className="mb-10">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">5. Intellectual Property</h2>
              <h3 className="text-xl font-medium text-gray-800 mb-3 mt-6">5.1 Our Content</h3>
              <p className="text-gray-600 leading-relaxed mb-4">
                The Service and its original content (excluding user-generated content), features, and functionality are owned by Volute and are protected by international copyright, trademark, and other intellectual property laws.
              </p>

              <h3 className="text-xl font-medium text-gray-800 mb-3 mt-6">5.2 Your Content</h3>
              <p className="text-gray-600 leading-relaxed mb-4">
                You retain ownership of any content you create using the Service. By using the Service, you grant us a limited, non-exclusive license to use your content solely to provide and improve the Service.
              </p>

              <h3 className="text-xl font-medium text-gray-800 mb-3 mt-6">5.3 Generated Content</h3>
              <p className="text-gray-600 leading-relaxed mb-4">
                Presentations and slides you generate using the Service are yours to use, subject to any applicable third-party data provider terms. You are responsible for ensuring proper attribution and compliance with source material licenses.
              </p>
            </section>

            <section className="mb-10">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">6. Data Accuracy and Disclaimer</h2>
              <p className="text-gray-600 leading-relaxed mb-4">
                While we strive to provide accurate and up-to-date information, the Service aggregates data from various third-party sources. We do not guarantee the accuracy, completeness, or reliability of any data or content generated through the Service.
              </p>
              <p className="text-gray-600 leading-relaxed mb-4">
                <strong>THE SERVICE IS PROVIDED "AS IS" WITHOUT WARRANTIES OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, OR NON-INFRINGEMENT.</strong>
              </p>
            </section>

            <section className="mb-10">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">7. Limitation of Liability</h2>
              <p className="text-gray-600 leading-relaxed mb-4">
                TO THE MAXIMUM EXTENT PERMITTED BY LAW, VOLUTE SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, OR ANY LOSS OF PROFITS OR REVENUES, WHETHER INCURRED DIRECTLY OR INDIRECTLY, OR ANY LOSS OF DATA, USE, OR GOODWILL ARISING OUT OF YOUR USE OF THE SERVICE.
              </p>
            </section>

            <section className="mb-10">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">8. Subscription and Payment</h2>
              <h3 className="text-xl font-medium text-gray-800 mb-3 mt-6">8.1 Fees</h3>
              <p className="text-gray-600 leading-relaxed mb-4">
                Certain features of the Service may require payment of fees. All fees are non-refundable unless otherwise stated.
              </p>

              <h3 className="text-xl font-medium text-gray-800 mb-3 mt-6">8.2 Automatic Renewal</h3>
              <p className="text-gray-600 leading-relaxed mb-4">
                Subscriptions automatically renew unless canceled before the renewal date. You can cancel your subscription at any time through your account settings.
              </p>
            </section>

            <section className="mb-10">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">9. Termination</h2>
              <p className="text-gray-600 leading-relaxed mb-4">
                We may terminate or suspend your account and access to the Service immediately, without prior notice, for any reason, including if you breach these Terms. Upon termination, your right to use the Service will immediately cease.
              </p>
            </section>

            <section className="mb-10">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">10. Modifications to Service</h2>
              <p className="text-gray-600 leading-relaxed mb-4">
                We reserve the right to modify, suspend, or discontinue the Service (or any part thereof) at any time with or without notice. We shall not be liable to you or any third party for any modification, suspension, or discontinuance of the Service.
              </p>
            </section>

            <section className="mb-10">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">11. Changes to Terms</h2>
              <p className="text-gray-600 leading-relaxed mb-4">
                We may revise these Terms from time to time. The most current version will always be posted on this page. By continuing to use the Service after revisions become effective, you agree to be bound by the revised Terms.
              </p>
            </section>

            <section className="mb-10">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">12. Governing Law</h2>
              <p className="text-gray-600 leading-relaxed mb-4">
                These Terms shall be governed by and construed in accordance with the laws of the United States, without regard to its conflict of law provisions.
              </p>
            </section>

            <section className="mb-10">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">13. Dispute Resolution</h2>
              <p className="text-gray-600 leading-relaxed mb-4">
                Any disputes arising out of or relating to these Terms or the Service shall be resolved through binding arbitration in accordance with the rules of the American Arbitration Association, rather than in court.
              </p>
            </section>

            <section className="mb-10">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">14. Contact Information</h2>
              <p className="text-gray-600 leading-relaxed mb-4">
                If you have any questions about these Terms, please contact us:
              </p>
              <ul className="list-none text-gray-600 space-y-2">
                <li>
                  <strong>Email:</strong>{" "}
                  <a href="mailto:legal@getvolute.com" className="text-blue-600 hover:underline">
                    legal@getvolute.com
                  </a>
                </li>
                <li><strong>Website:</strong> www.getvolute.com</li>
              </ul>
            </section>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="v-footer">
        <span className="v-footer-copy">© 2026 Volute</span>
        <div className="v-footer-links">
          <Link to="/privacy">Privacy</Link>
          <Link to="/terms">Terms</Link>
          <a href="mailto:contact@getvolute.com">Contact</a>
        </div>
      </footer>
    </div>
  );
}