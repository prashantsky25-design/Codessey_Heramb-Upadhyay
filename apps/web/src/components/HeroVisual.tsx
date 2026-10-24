import React, { useState } from 'react';
import { ArrowRight, CheckCircle2, ChevronRight, Cpu, ShieldCheck } from 'lucide-react';

interface FlowNode {
  id: string;
  label: string;
  chain: string;
  description: string;
  items: string[];
  tone: 'source' | 'engine' | 'destination';
}

const FLOW_NODES: FlowNode[] = [
  {
    id: 'source',
    label: 'Source Blockchain',
    chain: 'Ethereum Local · 31337',
    description: 'Origin transaction and receipt',
    items: ['Transaction receipt', 'MessageDispatched event', 'Canonical block data'],
    tone: 'source'
  },
  {
    id: 'engine',
    label: 'CrossProof Engine',
    chain: 'Cryptographic verification',
    description: 'Proof construction and validation',
    items: ['Receipt inclusion', 'Header commitment', 'Payload binding'],
    tone: 'engine'
  },
  {
    id: 'destination',
    label: 'Destination Blockchain',
    chain: 'Optimism Local · 31338',
    description: 'Verified execution target',
    items: ['Replay protection', 'Destination verifier', 'Receiver callback'],
    tone: 'destination'
  }
];

export const HeroVisual: React.FC = () => {
  const [selectedId, setSelectedId] = useState('engine');
  const selected = FLOW_NODES.find((node) => node.id === selectedId) || FLOW_NODES[1];

  return (
    <section className="hero-flow-panel" aria-label="Cross-chain verification flow">
      <div className="hero-flow-glow hero-flow-glow-left" />
      <div className="hero-flow-glow hero-flow-glow-right" />
      <div className="hero-flow-header">
        <div>
          <div className="eyebrow"><span className="hero-live-dot" /> Live verification path</div>
          <h2>Proof moves. Trust stays.</h2>
        </div>
        <span className="hero-flow-badge">EVM · Fail-closed</span>
      </div>

      <div className="hero-flow-nodes">
        {FLOW_NODES.map((node, index) => {
          const isSelected = selectedId === node.id;
          return (
            <React.Fragment key={node.id}>
              <button className={`hero-flow-node hero-flow-node-${node.tone} ${isSelected ? 'is-selected' : ''}`} onClick={() => setSelectedId(node.id)} aria-pressed={isSelected}>
                <div className="hero-node-icon">
                  {node.tone === 'engine' ? <ShieldCheck className="h-6 w-6" /> : <Cpu className="h-5 w-5" />}
                </div>
                <div className="hero-node-copy">
                  <span className="hero-node-label">{node.label}</span>
                  <span className="hero-node-chain">{node.chain}</span>
                  <span className="hero-node-description">{node.description}</span>
                </div>
                {isSelected && <ChevronRight className="hero-node-chevron h-4 w-4" />}
              </button>
              {index < FLOW_NODES.length - 1 && (
                <div className="hero-connector" aria-hidden="true">
                  <div className="hero-connector-line"><span /></div>
                  <ArrowRight className="h-4 w-4" />
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>

      <div className="hero-flow-detail">
        <div className="hero-detail-heading"><span>Selected layer</span><strong>{selected.label}</strong></div>
        <div className="hero-detail-items">
          {selected.items.map((item) => <span key={item}><CheckCircle2 className="h-3.5 w-3.5" /> {item}</span>)}
        </div>
      </div>
    </section>
  );
};
