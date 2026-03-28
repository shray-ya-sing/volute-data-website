import { useNavigate, Link } from "react-router";
import { ArrowLeft } from "lucide-react";

export function Privacy() {
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
          <h1 className="text-4xl font-bold text-gray-900 mb-8">Privacy Policy</h1>
          
          <div className="prose prose-gray max-w-none">
            <p className="text-gray-600 mb-8">
              <strong>Last Updated:</strong> March 13, 2026
            </p>

            <section className="mb-10">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">1. Introduction</h2>
              <p className="text-gray-600 leading-relaxed mb-4">
                Volute ("we," "our," or "us") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our platform.
              </p>
            </section>

            <section className="mb-10">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">2. Information We Collect</h2>
              <h3 className="text-xl font-medium text-gray-800 mb-3 mt-6">2.1 Information You Provide</h3>
              <p className="text-gray-600 leading-relaxed mb-4">
                When you use Volute, you may provide us with:
              </p>
              <ul className="list-disc pl-6 text-gray-600 space-y-2 mb-4">
                <li>Account information (email, name, password)</li>
                <li>Research queries and prompts you enter</li>
                <li>Images and files you upload</li>
                <li>Presentation content you generate</li>
              </ul>

              <h3 className="text-xl font-medium text-gray-800 mb-3 mt-6">2.2 Automatically Collected Information</h3>
              <p className="text-gray-600 leading-relaxed mb-4">
                We automatically collect certain information about your device and how you interact with our service:
              </p>
              <ul className="list-disc pl-6 text-gray-600 space-y-2 mb-4">
                <li>Browser type and version</li>
                <li>Operating system</li>
                <li>IP address</li>
                <li>Usage data (features used, time spent, interactions)</li>
                <li>Cookies and similar tracking technologies</li>
              </ul>
            </section>

            <section className="mb-10">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">3. How We Use Your Information</h2>
              <p className="text-gray-600 leading-relaxed mb-4">
                We use the information we collect to:
              </p>
              <ul className="list-disc pl-6 text-gray-600 space-y-2 mb-4">
                <li>Provide, maintain, and improve our services</li>
                <li>Process your research queries and generate presentations</li>
                <li>Send you technical notices and support messages</li>
                <li>Respond to your comments and questions</li>
                <li>Analyze usage patterns to improve user experience</li>
                <li>Detect, prevent, and address technical issues or fraudulent activity</li>
              </ul>
            </section>

            <section className="mb-10">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">4. Data Sharing and Disclosure</h2>
              <p className="text-gray-600 leading-relaxed mb-4">
                We do not sell your personal information. We may share your information only in the following circumstances:
              </p>
              <ul className="list-disc pl-6 text-gray-600 space-y-2 mb-4">
                <li><strong>Service Providers:</strong> With third-party vendors who perform services on our behalf (e.g., hosting, analytics)</li>
                <li><strong>Legal Requirements:</strong> When required by law or to protect our rights</li>
                <li><strong>Business Transfers:</strong> In connection with a merger, acquisition, or sale of assets</li>
                <li><strong>With Your Consent:</strong> When you explicitly consent to sharing</li>
              </ul>
            </section>

            <section className="mb-10">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">5. Data Security</h2>
              <p className="text-gray-600 leading-relaxed mb-4">
                We implement appropriate technical and organizational measures to protect your data against unauthorized access, alteration, disclosure, or destruction. However, no method of transmission over the internet is 100% secure.
              </p>
            </section>

            <section className="mb-10">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">6. Data Retention</h2>
              <p className="text-gray-600 leading-relaxed mb-4">
                We retain your information for as long as necessary to provide our services and comply with legal obligations. You can request deletion of your data by contacting us at{" "}
                <a href="mailto:privacy@getvolute.com" className="text-blue-600 hover:underline">
                  privacy@getvolute.com
                </a>
                .
              </p>
            </section>

            <section className="mb-10">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">7. Your Rights</h2>
              <p className="text-gray-600 leading-relaxed mb-4">
                Depending on your location, you may have certain rights regarding your personal information:
              </p>
              <ul className="list-disc pl-6 text-gray-600 space-y-2 mb-4">
                <li>Access your personal data</li>
                <li>Correct inaccurate data</li>
                <li>Request deletion of your data</li>
                <li>Object to or restrict processing</li>
                <li>Data portability</li>
                <li>Withdraw consent</li>
              </ul>
            </section>

            <section className="mb-10">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">8. Cookies</h2>
              <p className="text-gray-600 leading-relaxed mb-4">
                We use cookies and similar tracking technologies to track activity on our service and hold certain information. You can instruct your browser to refuse all cookies or to indicate when a cookie is being sent.
              </p>
            </section>

            <section className="mb-10">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">9. Children's Privacy</h2>
              <p className="text-gray-600 leading-relaxed mb-4">
                Our service is not intended for children under 13 years of age. We do not knowingly collect personal information from children under 13.
              </p>
            </section>

            <section className="mb-10">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">10. Changes to This Policy</h2>
              <p className="text-gray-600 leading-relaxed mb-4">
                We may update this Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page and updating the "Last Updated" date.
              </p>
            </section>

            <section className="mb-10">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">11. Contact Us</h2>
              <p className="text-gray-600 leading-relaxed mb-4">
                If you have any questions about this Privacy Policy, please contact us:
              </p>
              <ul className="list-none text-gray-600 space-y-2">
                <li>
                  <strong>Email:</strong>{" "}
                  <a href="mailto:privacy@getvolute.com" className="text-blue-600 hover:underline">
                    privacy@getvolute.com
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