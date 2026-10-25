import React, { useState, useEffect } from 'react';
import { Sidebar, TopStatusBar } from './components/Navbar';
import { OverviewPage } from './pages/OverviewPage';
import { VerifyPage } from './pages/VerifyPage';
import { HistoryPage } from './pages/HistoryPage';
import { AttackLabPage } from './pages/AttackLabPage';
import { ArchitecturePage } from './pages/ArchitecturePage';
import { SecurityPage } from './pages/SecurityPage';
import { DocumentationPage } from './pages/DocumentationPage';
import { fetchChains, fetchHealth, fetchVerificationHistory } from './api';
import { ChainConfig, SUPPORTED_CHAINS, VerificationRecord, CrossChainProofData } from '@crossproof/shared';

export function App() {
  const [activeTab, setActiveTab] = useState<string>('overview');
  const [chains, setChains] = useState<ChainConfig[]>(Object.values(SUPPORTED_CHAINS));
  const [records, setRecords] = useState<VerificationRecord[]>([]);
  const [networkOnline, setNetworkOnline] = useState<boolean>(true);
  const [relayerAddress, setRelayerAddress] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [verifyTxHash, setVerifyTxHash] = useState<string>('');
  const [verifyChainId, setVerifyChainId] = useState<number>(31337);

  // P1 fix: Store the most recent authentic verified proof to feed into the Attack Lab
  const [lastVerifiedProof, setLastVerifiedProof] = useState<CrossChainProofData | null>(null);

  const loadData = async () => {
    try {
      const health = await fetchHealth();
      setNetworkOnline(health.status === 'ok');
      setRelayerAddress(health.relayerAddress || null);

      const chainsRes = await fetchChains();
      if (chainsRes?.chains?.length > 0) {
        setChains(chainsRes.chains);
      }

      const historyRes = await fetchVerificationHistory();
      if (historyRes?.records) {
        setRecords(historyRes.records);

        // If no active proof is loaded in memory yet, seed from the latest verified record with proof
        setLastVerifiedProof((current) => {
          if (current) return current;
          const found = historyRes.records.find(
            (r: VerificationRecord) => r.status === 'VERIFIED' && r.proof
          );
          return (found?.proof as CrossChainProofData) || null;
        });
      }
    } catch {
      setNetworkOnline(false);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleSelectTxForVerification = (chainId: number, txHash: string) => {
    setVerifyChainId(chainId);
    setVerifyTxHash(txHash);
    setActiveTab('verify');
  };

  const pageTitles: Record<string, string> = {
    overview: 'Overview',
    verify: 'Verify Transaction',
    history: 'Verification History',
    'attack-lab': 'Attack Lab',
    architecture: 'Protocol Architecture',
    security: 'Trust Model',
    documentation: 'Documentation'
  };

  return (
    <div className="theme-shell app-shell">
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      <div className="app-column">
        <TopStatusBar
          pageTitle={pageTitles[activeTab] || 'CrossProof'}
          networkOnline={networkOnline}
          relayerAddress={relayerAddress}
          onOpenSidebar={() => setSidebarOpen(true)}
        />

        <main className="app-main">
        {activeTab === 'overview' && (
          <OverviewPage
            chains={chains}
            records={records}
            onSelectTxForVerification={handleSelectTxForVerification}
            onNavigate={setActiveTab}
          />
        )}

        {activeTab === 'verify' && (
          <VerifyPage
            chains={chains}
            initialTxHash={verifyTxHash}
            initialChainId={verifyChainId}
            onVerificationCompleted={loadData}
            onProofReady={(proof) => setLastVerifiedProof(proof)}
          />
        )}

        {activeTab === 'history' && <HistoryPage records={records} />}

        {activeTab === 'attack-lab' && (
          <AttackLabPage
            lastVerifiedProof={lastVerifiedProof}
            chains={chains}
            onNavigateToVerify={() => setActiveTab('verify')}
          />
        )}

        {activeTab === 'architecture' && <ArchitecturePage />}

        {activeTab === 'security' && <SecurityPage />}

        {activeTab === 'documentation' && <DocumentationPage />}
        </main>

        <footer className="app-footer">
          <span className="app-footer-brand">CROSSPROOF</span>
          <span>Verify across chains. Trust the proof.</span>
          <span className="app-footer-technical">EVM Patricia Trie v1.0</span>
        </footer>
      </div>
    </div>
  );
}

export default App;
