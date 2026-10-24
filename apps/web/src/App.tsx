import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { OverviewPage } from './pages/OverviewPage';
import { VerifyPage } from './pages/VerifyPage';
import { HistoryPage } from './pages/HistoryPage';
import { AttackLabPage } from './pages/AttackLabPage';
import { ArchitecturePage } from './pages/ArchitecturePage';
import { SecurityPage } from './pages/SecurityPage';
import { DocumentationPage } from './pages/DocumentationPage';
import { fetchChains, fetchHealth, fetchVerificationHistory } from './api';
import { ChainConfig, SUPPORTED_CHAINS, VerificationRecord } from '@crossproof/shared';
import { ActiveVerification } from './types';

export function App() {
  const [activeTab, setActiveTab] = useState<string>('overview');
  const [chains, setChains] = useState<ChainConfig[]>(Object.values(SUPPORTED_CHAINS));
  const [records, setRecords] = useState<VerificationRecord[]>([]);
  const [networkOnline, setNetworkOnline] = useState<boolean>(true);

  const [verifyTxHash, setVerifyTxHash] = useState<string>('');
  const [verifyChainId, setVerifyChainId] = useState<number>(31337);
  const [activeVerification, setActiveVerification] = useState<ActiveVerification | null>(null);

  const loadData = async () => {
    try {
      const health = await fetchHealth();
      setNetworkOnline(health.status === 'ok');

      const chainsRes = await fetchChains();
      if (chainsRes?.chains?.length > 0) {
        setChains(chainsRes.chains);
      }

      const historyRes = await fetchVerificationHistory();
      if (historyRes?.records) {
        setRecords(historyRes.records);
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

  return (
    <div className="app-root tech-grid font-sans">
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        networkOnline={networkOnline}
      />

      <main className="app-main">
        <div className="app-content max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
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
            onVerificationCompleted={(verification) => {
              setActiveVerification(verification);
              void loadData();
            }}
          />
        )}

        {activeTab === 'history' && <HistoryPage records={records} />}

        {activeTab === 'attack-lab' && (
          <AttackLabPage activeVerification={activeVerification} />
        )}

        {activeTab === 'architecture' && <ArchitecturePage />}

        {activeTab === 'security' && <SecurityPage />}

        {activeTab === 'documentation' && <DocumentationPage />}
        </div>
      </main>

      {/* Product Footer */}
      <footer className="app-footer font-mono">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center space-x-2">
            <span className="font-bold text-zinc-300">CROSSPROOF</span>
            <span>&bull;</span>
            <span>Verify Across Chains. Trust the Proof.</span>
          </div>

          <div className="flex items-center space-x-4 text-zinc-400">
            <button onClick={() => setActiveTab('documentation')} className="hover:text-cyan-400">
              Documentation
            </button>
            <button onClick={() => setActiveTab('security')} className="hover:text-cyan-400">
              Trust Assumptions
            </button>
            <button onClick={() => setActiveTab('attack-lab')} className="hover:text-rose-400">
              Attack Lab
            </button>
            <span>EVM Patricia Trie v1.0</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;
