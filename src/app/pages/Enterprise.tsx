import { Link } from "react-router";
import { ArrowRight } from "lucide-react";

export function Enterprise() {
  return (
    <div className="volute-root">
      {/* Header */}
      <header className="v-header">
        <Link to="/" className="v-logo">
          <span className="v-logo-name">Volute</span>
        </Link>
        <a 
          href="mailto:contact@getvolute.com?subject=Enterprise Inquiry" 
          className="v-enterprise-cta"
        >
          Contact Sales
          <ArrowRight size={14} />
        </a>
      </header>

      {/* Main */}
      <main className="v-main v-main-enterprise">
        <div className="v-enterprise-container">
          {/* Hero */}
          <div className="v-enterprise-hero">
            <span className="v-marketing-label">For Firms</span>
            <h1 className="v-enterprise-headline">
              The <em>Best ROI</em> on the Market
            </h1>
            <p className="v-enterprise-subhead">
              Not an LLM wrapper. Volute is a data search and analytics platform 
              with generative AI features built on a proprietary pipeline designed 
              from the ground up to deliver accurate, auditable results.
            </p>
          </div>

          {/* Enterprise Features */}
          <div className="v-enterprise-features">
            {/* Custom Integrations */}
            <section className="v-marketing-section">
              <div className="v-marketing-content">
                <span className="v-marketing-label">Your Data, Integrated</span>
                <h2 className="v-marketing-title">
                  Connect to Internal Data Sources
                </h2>
                <p className="v-marketing-desc">
                  Seamlessly integrate Volute with your firm's internal data infrastructure. 
                  We build custom connectors to your shared drives, data rooms, document vaults, 
                  and proprietary databases—giving your team instant access to institutional 
                  knowledge alongside public market data.
                </p>
                <ul className="v-enterprise-list">
                  <li>SharePoint, Google Drive, Dropbox integrations</li>
                  <li>Secure data room and vault connections</li>
                  <li>Custom database and CRM integrations</li>
                  <li>Full compliance with your security protocols</li>
                </ul>
              </div>
              <div className="v-marketing-visual">
                <div className="v-marketing-placeholder">
                  <span>Internal Data Integration</span>
                </div>
              </div>
            </section>

            {/* Data Vendor Integrations */}
            <section className="v-marketing-section v-marketing-section-reverse">
              <div className="v-marketing-content">
                <span className="v-marketing-label">Premium Data Access</span>
                <h2 className="v-marketing-title">
                  Integrate Your Bloomberg, FactSet, and More
                </h2>
                <p className="v-marketing-desc">
                  Already paying for premium data subscriptions? Maximize your investment 
                  by integrating Bloomberg Terminal, FactSet, Refinitiv, and other data 
                  vendors directly into Volute. Our platform brings together public and 
                  proprietary data in one unified interface.
                </p>
                <ul className="v-enterprise-list">
                  <li>Bloomberg Terminal API integration</li>
                  <li>FactSet data feed connections</li>
                  <li>Refinitiv, S&P Capital IQ, and PitchBook</li>
                  <li>Custom vendor integrations on request</li>
                </ul>
              </div>
              <div className="v-marketing-visual">
                <div className="v-marketing-placeholder">
                  <span>Data Vendor Integrations</span>
                </div>
              </div>
            </section>

            {/* High-Touch Support */}
            <section className="v-marketing-section">
              <div className="v-marketing-content">
                <span className="v-marketing-label">White Glove Service</span>
                <h2 className="v-marketing-title">
                  Custom Features for Your Workflows
                </h2>
                <p className="v-marketing-desc">
                  Every firm has unique needs and workflows. Our high-touch support team 
                  works directly with you to build custom features, templates, and integrations 
                  tailored to your specific use cases. From deal team workflows to industry-specific 
                  analysis templates, we adapt to how you work.
                </p>
                <ul className="v-enterprise-list">
                  <li>Dedicated customer success manager</li>
                  <li>Custom feature development</li>
                  <li>Firm-specific analysis templates</li>
                  <li>Priority support and rapid response times</li>
                </ul>
              </div>
              <div className="v-marketing-visual">
                <div className="v-marketing-placeholder">
                  <span>Custom Workflows</span>
                </div>
              </div>
            </section>
          </div>

          {/* CTA Section */}
          <section className="v-enterprise-cta-section">
            <div className="v-enterprise-cta-content">
              <h2 className="v-marketing-title">
                Ready to Transform Your Research Workflow?
              </h2>
              <p className="v-marketing-desc">
                Schedule a demo to see how Volute's data platform can be 
                customized for your firm's specific needs.
              </p>
              <a 
                href="mailto:contact@getvolute.com?subject=Enterprise Demo Request" 
                className="v-enterprise-cta-button"
              >
                Schedule a Demo
                <ArrowRight size={16} />
              </a>
            </div>
          </section>
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