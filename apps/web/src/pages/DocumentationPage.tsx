import React from 'react';
import { BookOpen, CheckCircle2, FileText, Lock, Workflow } from 'lucide-react';

const sections = [
  {
    title: 'What CrossProof verifies',
    icon: CheckCircle2,
    body: 'CrossProof verifies that a source-chain receipt contains an authenticated bridge event, that the receipt is included in the source block receipt trie, and that the destination verifier can safely execute the bound message once.'
  },
  {
    title: 'Verification flow',
    icon: Workflow,
    body: 'The dashboard follows the real application pipeline: source transaction lookup, receipt and Patricia Trie proof construction, local inclusion validation, Mode A header commitment validation, destination contract execution, and destination receipt confirmation.'
  },
  {
    title: 'Security assumptions',
    icon: Lock,
    body: 'The active local demo uses Mode A, an authorized development header oracle. Receipt inclusion, event binding, payload binding, destination-chain checks, and replay protection remain enforced by the verifier, while source-header authenticity is explicitly oracle-backed.'
  },
  {
    title: 'Further reading',
    icon: FileText,
    body: 'For implementation details, review the repository documentation for architecture, protocol encoding, security analysis, demo steps, and known limitations. The UI only reports evidence returned by the current API and verifier flow.'
  }
];

export const DocumentationPage: React.FC = () => (
  <div className="page-stack">
    <div className="page-heading">
      <div className="eyebrow"><BookOpen className="h-4 w-4" /> CrossProof documentation</div>
      <h1>Understand the proof before you trust the message.</h1>
      <p>Concise product and protocol guidance for the current local EVM verification environment.</p>
    </div>

    <div className="doc-callout">
      <div className="doc-callout-mark">01</div>
      <div>
        <p className="doc-callout-title">Evidence-first verification</p>
        <p>CrossProof is an evidence viewer over the source transaction, proof builder, destination verifier, and trust model. It does not treat a backend assertion or a transaction hash alone as proof.</p>
      </div>
    </div>

    <div className="grid gap-4 md:grid-cols-2">
      {sections.map((section) => {
        const Icon = section.icon;
        return (
          <article key={section.title} className="surface-card p-5">
            <div className="card-icon card-icon-blue"><Icon className="h-5 w-5" /></div>
            <h2 className="mt-4 text-base font-semibold text-primary">{section.title}</h2>
            <p className="mt-2 text-sm leading-6 text-secondary">{section.body}</p>
          </article>
        );
      })}
    </div>

    <article className="surface-card p-5">
      <div className="section-title"><BookOpen className="h-4 w-4" /> Supported demo scope</div>
      <div className="mt-4 grid gap-3 text-sm text-secondary md:grid-cols-3">
        <div className="info-chip"><strong>Source</strong><span>Ethereum Local · 31337</span></div>
        <div className="info-chip"><strong>Destination</strong><span>Optimism Local · 31338</span></div>
        <div className="info-chip"><strong>Trust mode</strong><span>Mode A development oracle</span></div>
      </div>
    </article>
  </div>
);
