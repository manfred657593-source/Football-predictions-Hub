import React, { useState, useEffect } from 'react';
import {
  Key,
  ShieldCheck,
  RefreshCw,
  Save,
  Check,
  X,
  ExternalLink,
  Zap,
  Cpu,
  Database,
  Globe,
  Flame,
  CheckCircle2,
  AlertTriangle,
  Eye,
  EyeOff,
  Activity,
  Terminal,
} from 'lucide-react';

interface ApiKeyConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  onKeysSaved?: () => void;
}

export const ApiKeyConfigModal: React.FC<ApiKeyConfigModalProps> = ({
  isOpen,
  onClose,
  onKeysSaved,
}) => {
  const [loading, setLoading] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);
  const [saveStatusMsg, setSaveStatusMsg] = useState<string>('');

  // Form input states
  const [nvidiaKey, setNvidiaKey] = useState<string>('');
  const [geminiKey, setGeminiKey] = useState<string>('');
  const [footballDataKey, setFootballDataKey] = useState<string>('');
  const [oddsApiKey, setOddsApiKey] = useState<string>('');
  const [statsbombKey, setStatsbombKey] = useState<string>('');
  const [sportmonksKey, setSportmonksKey] = useState<string>('');
  const [appsScriptUrl, setAppsScriptUrl] = useState<string>('');

  // Key Visibility states
  const [showNvidia, setShowNvidia] = useState<boolean>(false);
  const [showGemini, setShowGemini] = useState<boolean>(false);
  const [showFootballData, setShowFootballData] = useState<boolean>(false);
  const [showOddsApi, setShowOddsApi] = useState<boolean>(false);
  const [showStatsbomb, setShowStatsbomb] = useState<boolean>(false);
  const [showSportmonks, setShowSportmonks] = useState<boolean>(false);

  // Status & Masked data from server
  const [serverStatus, setServerStatus] = useState<any>(null);

  // Connection testing state per service
  const [testingService, setTestingService] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<Record<string, { success: boolean; message: string; latencyMs?: number }>>({});

  // Fetch key status from backend
  const fetchKeyStatus = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/system/keys-status');
      if (res.ok) {
        const data = await res.json();
        setServerStatus(data);
        if (data.googleAppsScriptUrl) setAppsScriptUrl(data.googleAppsScriptUrl);
      }
    } catch (err) {
      console.warn('Failed to fetch key status:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchKeyStatus();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Save keys handler
  const handleSaveKeys = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSaveStatusMsg('');

    try {
      const res = await fetch('/api/system/save-keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nvidiaKey,
          geminiKey,
          footballDataKey,
          oddsApiKey,
          statsbombKey,
          sportmonksKey,
          googleAppsScriptUrl: appsScriptUrl,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setSaveStatusMsg('✅ API keys updated and saved to .env successfully!');
        setNvidiaKey('');
        setGeminiKey('');
        setFootballDataKey('');
        setOddsApiKey('');
        setStatsbombKey('');
        setSportmonksKey('');
        await fetchKeyStatus();
        if (onKeysSaved) onKeysSaved();
        setTimeout(() => setSaveStatusMsg(''), 4000);
      } else {
        setSaveStatusMsg('❌ Failed to save API keys to server.');
      }
    } catch (err: any) {
      setSaveStatusMsg(`❌ Save error: ${err?.message || String(err)}`);
    } finally {
      setSaving(false);
    }
  };

  // Test individual connection handler
  const handleTestConnection = async (service: string) => {
    setTestingService(service);
    try {
      const res = await fetch('/api/system/test-key', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ service }),
      });

      const data = await res.json();
      setTestResults((prev) => ({
        ...prev,
        [service]: {
          success: data.success,
          message: data.message,
          latencyMs: data.latencyMs,
        },
      }));
    } catch (err: any) {
      setTestResults((prev) => ({
        ...prev,
        [service]: {
          success: false,
          message: `Network or Server Connection Error: ${err?.message || String(err)}`,
        },
      }));
    } finally {
      setTestingService(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-4xl shadow-2xl overflow-hidden my-8">
        {/* Header */}
        <div className="bg-slate-950 border-b border-slate-800 p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
              <Key className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-100 font-mono tracking-tight flex items-center gap-2">
                API Keys & Telemetry Secret Settings
                <span className="px-2 py-0.5 text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 rounded">
                  TERMUX LOCAL READY
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                Configure API keys for NVIDIA NIM, Gemini, Football-Data, The Odds API, and Google Apps Script. Saved keys persist directly to <code className="text-emerald-400">.env</code>.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-100 bg-slate-900 border border-slate-800 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Termux Local Banner */}
        <div className="bg-emerald-950/40 border-b border-emerald-500/30 px-5 py-3 flex items-center gap-3 text-xs font-mono text-emerald-300">
          <Terminal className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>
            <strong>Local / Termux Execution Detected:</strong> Entering keys below applies them immediately in memory and writes them to <code className="bg-slate-900 px-1 py-0.5 rounded border border-emerald-500/40 text-emerald-300">.env</code> on disk without needing to restart your Node.js process.
          </span>
        </div>

        {/* Content Body */}
        <form onSubmit={handleSaveKeys} className="p-6 space-y-6 font-mono text-xs max-h-[75vh] overflow-y-auto">
          {saveStatusMsg && (
            <div className={`p-3 rounded-lg border text-xs font-bold font-mono ${saveStatusMsg.includes('✅') ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300' : 'bg-rose-500/20 border-rose-500/40 text-rose-300'}`}>
              {saveStatusMsg}
            </div>
          )}

          {/* Key Inputs Grid */}
          <div className="space-y-4">
            {/* 1. NVIDIA NIM API KEY */}
            <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-2">
              <div className="flex items-center justify-between">
                <label className="font-bold text-slate-200 text-xs flex items-center gap-2">
                  <Cpu className="w-4 h-4 text-emerald-400" />
                  NVIDIA NIM API Key (<code className="text-emerald-400">NVIDIA_API_KEY</code>)
                  {serverStatus?.configured?.nvidiaNim ? (
                    <span className="px-1.5 py-0.5 rounded text-[10px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                      CONFIGURED: {serverStatus.nvidiaKeyMasked}
                    </span>
                  ) : (
                    <span className="px-1.5 py-0.5 rounded text-[10px] bg-amber-500/20 text-amber-400 border border-amber-500/30">
                      MISSING (FALLBACK ACTIVE)
                    </span>
                  )}
                </label>

                <a
                  href="https://build.nvidia.com/explore/discover"
                  target="_blank"
                  rel="noreferrer"
                  className="text-emerald-400 hover:underline text-[11px] flex items-center gap-1"
                >
                  Get Free Key <ExternalLink className="w-3 h-3" />
                </a>
              </div>

              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <input
                    type={showNvidia ? 'text' : 'password'}
                    placeholder={serverStatus?.configured?.nvidiaNim ? '•••••••••••• (Leave empty to keep existing key)' : 'Paste nvapi-... key here'}
                    value={nvidiaKey}
                    onChange={(e) => setNvidiaKey(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-slate-100 focus:outline-none focus:border-emerald-500 text-xs"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNvidia(!showNvidia)}
                    className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-200 cursor-pointer"
                  >
                    {showNvidia ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => handleTestConnection('nvidia')}
                  disabled={testingService === 'nvidia'}
                  className="px-3 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 rounded-lg font-bold transition-colors cursor-pointer disabled:opacity-50 flex items-center gap-1.5 whitespace-nowrap"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${testingService === 'nvidia' ? 'animate-spin text-emerald-400' : ''}`} />
                  <span>TEST PING</span>
                </button>
              </div>

              {testResults['nvidia'] && (
                <div className={`p-2 rounded text-[11px] border ${testResults['nvidia'].success ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300' : 'bg-rose-500/10 border-rose-500/30 text-rose-300'}`}>
                  {testResults['nvidia'].message} {testResults['nvidia'].latencyMs && `(${testResults['nvidia'].latencyMs}ms)`}
                </div>
              )}
            </div>

            {/* 2. GEMINI AI API KEY */}
            <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-2">
              <div className="flex items-center justify-between">
                <label className="font-bold text-slate-200 text-xs flex items-center gap-2">
                  <Zap className="w-4 h-4 text-cyan-400" />
                  Gemini API Key (<code className="text-cyan-400">GEMINI_API_KEY</code>)
                  {serverStatus?.configured?.geminiAi ? (
                    <span className="px-1.5 py-0.5 rounded text-[10px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                      CONFIGURED: {serverStatus.geminiKeyMasked}
                    </span>
                  ) : (
                    <span className="px-1.5 py-0.5 rounded text-[10px] bg-amber-500/20 text-amber-400 border border-amber-500/30">
                      MISSING
                    </span>
                  )}
                </label>

                <a
                  href="https://aistudio.google.com/app/apikey"
                  target="_blank"
                  rel="noreferrer"
                  className="text-cyan-400 hover:underline text-[11px] flex items-center gap-1"
                >
                  Get Key <ExternalLink className="w-3 h-3" />
                </a>
              </div>

              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <input
                    type={showGemini ? 'text' : 'password'}
                    placeholder={serverStatus?.configured?.geminiAi ? '•••••••••••• (Leave empty to keep existing key)' : 'Paste AIzaSy... key here'}
                    value={geminiKey}
                    onChange={(e) => setGeminiKey(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-slate-100 focus:outline-none focus:border-cyan-500 text-xs"
                  />
                  <button
                    type="button"
                    onClick={() => setShowGemini(!showGemini)}
                    className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-200 cursor-pointer"
                  >
                    {showGemini ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => handleTestConnection('gemini')}
                  disabled={testingService === 'gemini'}
                  className="px-3 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 rounded-lg font-bold transition-colors cursor-pointer disabled:opacity-50 flex items-center gap-1.5 whitespace-nowrap"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${testingService === 'gemini' ? 'animate-spin text-cyan-400' : ''}`} />
                  <span>TEST PING</span>
                </button>
              </div>

              {testResults['gemini'] && (
                <div className={`p-2 rounded text-[11px] border ${testResults['gemini'].success ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300' : 'bg-rose-500/10 border-rose-500/30 text-rose-300'}`}>
                  {testResults['gemini'].message} {testResults['gemini'].latencyMs && `(${testResults['gemini'].latencyMs}ms)`}
                </div>
              )}
            </div>

            {/* 3. FOOTBALL-DATA.ORG API KEY */}
            <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-2">
              <div className="flex items-center justify-between">
                <label className="font-bold text-slate-200 text-xs flex items-center gap-2">
                  <Database className="w-4 h-4 text-emerald-400" />
                  Football-Data.org Token (<code className="text-emerald-400">FOOTBALL_DATA_API_KEY</code>)
                  {serverStatus?.configured?.footballDataOrg ? (
                    <span className="px-1.5 py-0.5 rounded text-[10px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                      CONFIGURED: {serverStatus.footballDataKeyMasked}
                    </span>
                  ) : (
                    <span className="px-1.5 py-0.5 rounded text-[10px] bg-slate-800 text-slate-400 border border-slate-700">
                      KEY OPTIONAL
                    </span>
                  )}
                </label>

                <a
                  href="https://www.football-data.org/client/register"
                  target="_blank"
                  rel="noreferrer"
                  className="text-emerald-400 hover:underline text-[11px] flex items-center gap-1"
                >
                  Get Free Token <ExternalLink className="w-3 h-3" />
                </a>
              </div>

              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <input
                    type={showFootballData ? 'text' : 'password'}
                    placeholder={serverStatus?.configured?.footballDataOrg ? '•••••••••••• (Leave empty to keep existing key)' : 'Paste football-data token here'}
                    value={footballDataKey}
                    onChange={(e) => setFootballDataKey(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-slate-100 focus:outline-none focus:border-emerald-500 text-xs"
                  />
                  <button
                    type="button"
                    onClick={() => setShowFootballData(!showFootballData)}
                    className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-200 cursor-pointer"
                  >
                    {showFootballData ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => handleTestConnection('football-data')}
                  disabled={testingService === 'football-data'}
                  className="px-3 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 rounded-lg font-bold transition-colors cursor-pointer disabled:opacity-50 flex items-center gap-1.5 whitespace-nowrap"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${testingService === 'football-data' ? 'animate-spin text-emerald-400' : ''}`} />
                  <span>TEST PING</span>
                </button>
              </div>

              {testResults['football-data'] && (
                <div className={`p-2 rounded text-[11px] border ${testResults['football-data'].success ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300' : 'bg-rose-500/10 border-rose-500/30 text-rose-300'}`}>
                  {testResults['football-data'].message} {testResults['football-data'].latencyMs && `(${testResults['football-data'].latencyMs}ms)`}
                </div>
              )}
            </div>

            {/* 4. THE ODDS API KEY */}
            <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-2">
              <div className="flex items-center justify-between">
                <label className="font-bold text-slate-200 text-xs flex items-center gap-2">
                  <Flame className="w-4 h-4 text-violet-400" />
                  The Odds API Key (<code className="text-violet-400">ODDS_API_KEY</code>)
                  {serverStatus?.configured?.theOddsApi ? (
                    <span className="px-1.5 py-0.5 rounded text-[10px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                      CONFIGURED: {serverStatus.oddsApiKeyMasked}
                    </span>
                  ) : (
                    <span className="px-1.5 py-0.5 rounded text-[10px] bg-slate-800 text-slate-400 border border-slate-700">
                      KEY OPTIONAL
                    </span>
                  )}
                </label>

                <a
                  href="https://the-odds-api.com/#get-access"
                  target="_blank"
                  rel="noreferrer"
                  className="text-violet-400 hover:underline text-[11px] flex items-center gap-1"
                >
                  Get Key <ExternalLink className="w-3 h-3" />
                </a>
              </div>

              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <input
                    type={showOddsApi ? 'text' : 'password'}
                    placeholder={serverStatus?.configured?.theOddsApi ? '•••••••••••• (Leave empty to keep existing key)' : 'Paste odds-api key here'}
                    value={oddsApiKey}
                    onChange={(e) => setOddsApiKey(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-slate-100 focus:outline-none focus:border-violet-500 text-xs"
                  />
                  <button
                    type="button"
                    onClick={() => setShowOddsApi(!showOddsApi)}
                    className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-200 cursor-pointer"
                  >
                    {showOddsApi ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => handleTestConnection('odds-api')}
                  disabled={testingService === 'odds-api'}
                  className="px-3 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 rounded-lg font-bold transition-colors cursor-pointer disabled:opacity-50 flex items-center gap-1.5 whitespace-nowrap"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${testingService === 'odds-api' ? 'animate-spin text-violet-400' : ''}`} />
                  <span>TEST PING</span>
                </button>
              </div>

              {testResults['odds-api'] && (
                <div className={`p-2 rounded text-[11px] border ${testResults['odds-api'].success ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300' : 'bg-rose-500/10 border-rose-500/30 text-rose-300'}`}>
                  {testResults['odds-api'].message} {testResults['odds-api'].latencyMs && `(${testResults['odds-api'].latencyMs}ms)`}
                </div>
              )}
            </div>

            {/* 5. GOOGLE APPS SCRIPT WEB APP URL */}
            <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-2">
              <label className="font-bold text-slate-200 text-xs flex items-center gap-2">
                <Globe className="w-4 h-4 text-purple-400" />
                Google Apps Script Proxy Web App URL
                {serverStatus?.googleAppsScriptUrl ? (
                  <span className="px-1.5 py-0.5 rounded text-[10px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                    CONNECTED
                  </span>
                ) : (
                  <span className="px-1.5 py-0.5 rounded text-[10px] bg-slate-800 text-slate-400 border border-slate-700">
                    OPTIONAL
                  </span>
                )}
              </label>

              <input
                type="text"
                placeholder="https://script.google.com/macros/s/AKfycb.../exec"
                value={appsScriptUrl}
                onChange={(e) => setAppsScriptUrl(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-slate-100 focus:outline-none focus:border-purple-500 text-xs"
              />
            </div>

            {/* 6. SOFASCORE & FOTMOB AUTOMATIC FEEDS */}
            <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
              <div>
                <span className="font-bold text-slate-200 flex items-center gap-2">
                  <Activity className="w-4 h-4 text-amber-400" />
                  SofaScore Live & FotMob Today Direct API Feeds
                </span>
                <p className="text-[11px] text-slate-400">
                  No key required. These real-time sports endpoints connect directly via server proxy headers.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleTestConnection('sofascore')}
                  disabled={testingService === 'sofascore'}
                  className="px-2.5 py-1.5 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 rounded font-bold transition-colors cursor-pointer text-[11px] flex items-center gap-1"
                >
                  <RefreshCw className={`w-3 h-3 ${testingService === 'sofascore' ? 'animate-spin' : ''}`} />
                  TEST SOFASCORE
                </button>

                <button
                  type="button"
                  onClick={() => handleTestConnection('fotmob')}
                  disabled={testingService === 'fotmob'}
                  className="px-2.5 py-1.5 bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/40 text-cyan-300 rounded font-bold transition-colors cursor-pointer text-[11px] flex items-center gap-1"
                >
                  <RefreshCw className={`w-3 h-3 ${testingService === 'fotmob' ? 'animate-spin' : ''}`} />
                  TEST FOTMOB
                </button>
              </div>
            </div>
            {testResults['sofascore'] && (
              <div className={`p-2 rounded text-[11px] border ${testResults['sofascore'].success ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300' : 'bg-rose-500/10 border-rose-500/30 text-rose-300'}`}>
                {testResults['sofascore'].message} {testResults['sofascore'].latencyMs && `(${testResults['sofascore'].latencyMs}ms)`}
              </div>
            )}
            {testResults['fotmob'] && (
              <div className={`p-2 rounded text-[11px] border ${testResults['fotmob'].success ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300' : 'bg-rose-500/10 border-rose-500/30 text-rose-300'}`}>
                {testResults['fotmob'].message} {testResults['fotmob'].latencyMs && `(${testResults['fotmob'].latencyMs}ms)`}
              </div>
            )}
          </div>

          {/* Footer Actions */}
          <div className="pt-4 border-t border-slate-800 flex items-center justify-between">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl transition-colors cursor-pointer"
            >
              CLOSE
            </button>

            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl transition-all shadow-lg shadow-emerald-500/20 cursor-pointer flex items-center gap-2 disabled:opacity-50"
            >
              <Save className={`w-4 h-4 ${saving ? 'animate-spin' : ''}`} />
              <span>{saving ? 'SAVING TO .ENV...' : 'SAVE ALL KEYS TO .ENV'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
