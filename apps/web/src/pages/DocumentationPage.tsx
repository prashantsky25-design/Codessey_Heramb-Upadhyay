import React from 'react';
import { BookOpen, CheckCircle2, Code2, FileKey2, Layers3, ShieldCheck } from 'lucide-react';

const sections = [
  {
    title: '1. Dispatch on the source chain',
    icon: FileKey2,
    body: 'SourceBridge emits a domain-separated MessageDispatched event containing the source contract, destination chain, receiver, nonce, payload, and payload hash.'
  },
  {
    title: '2. Build the receipt proof',
    icon: Layers3,
    body: 'CrossProof encodes every receipt in the block, rebuilds the receipts Patricia Trie, checks the canonical receiptsRoot, and extracts the proof path for the requested transaction index.'
  },
  {
    title: '3. Authenticate the header',
    icon: ShieldCheck,
    body: 'The destination verifier checks that the source block hash and receiptsRoot were committed by the configured header verifier. Local development uses the explicit Mode A oracle.'
  },
  {
    title: '4. Verify and execute once',
    icon: CheckCircle2,
    body: 'DestinationVerifier validates inclusion, binds the payload to the authenticated event, enforces the destination domain, marks the message as processed, and then calls the receiver.'
  }
];

export const DocumentationPage: React.FC = () => (
  <div className="space-y-6 vecna-fracture">
    <header className="max-w-3xl space-y-3">
      <div className="flex items-center gap-2 accent-text">
        <BookOpen className="h-6 w-6" />
        <span className="text-xs font-semibold tracking-wider">PROTOCOL DOCUMENTATION</span>
      </div>
      <h1 className="text-3xl font-bold tracking-tight text-strong sm:text-4xl">Verify the evidence, not the messenger.</h1>
      <p className="max-w-2xl text-sm leading-7 text-secondary">
        CrossProof turns a source-chain transaction receipt into evidence that a destination contract can validate itself. This page describes the real data path used by the local demo.
      </p>
    </header>

    <section className="surface-card grid gap-4 p-5 sm:grid-cols-3 sm:p-6">
      <div className="sm:col-span-2">
        <div className="mb-2 flex items-center gap-2 accent-text">
          <Code2 className="h-4 w-4" />
          <span className="text-xs font-semibold">CORE GUARANTEE</span>
        </div>
        <p className="text-sm leading-7 text-secondary">
          A relayer may transport bytes, but it cannot change the canonical receipt, source header commitment, event payload hash, destination chain, or replay state without the verifier rejecting the call.
        </p>
      </div>
      <div className="technical-data rounded-lg border border-[var(--line)] bg-[var(--surface-inset)] p-4 text-xs text-secondary">
        <div className="mb-2 text-primary">Proof envelope</div>
        <div>txIndex → receiptRlp</div>
        <div>receiptRlp → receiptsRoot</div>
        <div>receiptsRoot → header</div>
        <div>messageId → replay lock</div>
      </div>
    </section>

    <section className="grid gap-4 md:grid-cols-2">
      {sections.map(({ title, icon: Icon, body }) => (
        <article key={title} className="surface-card-raised p-5">
        <div className="mb-3 flex items-center gap-2 text-primary">
            <Icon className="h-4 w-4 accent-text" />
            <h2 className="text-sm font-semibold">{title}</h2>
          </div>
          <p className="text-sm leading-7 text-secondary">{body}</p>
        </article>
      ))}
    </section>

    <section className="surface-card-raised p-5 sm:p-6">
      <h2 className="mb-3 text-sm font-semibold text-primary">Development trust model</h2>
      <p className="text-sm leading-7 text-secondary">
        The local demo uses Mode A: the receipts proof is cryptographic, while the source header commitment is supplied by a local DevHeaderOracle. Production deployments should replace that oracle with a finalized light-client or consensus-backed header verifier.
      </p>
    </section>
  </div>
);
