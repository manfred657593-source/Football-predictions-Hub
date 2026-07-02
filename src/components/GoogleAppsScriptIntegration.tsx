import React, { useState, useEffect } from 'react';
import {
  FileCode,
  CheckCircle2,
  AlertTriangle,
  Send,
  RefreshCw,
  ExternalLink,
  Table,
  Copy,
  Check,
  Code2,
  Database,
  ArrowRight,
} from 'lucide-react';
import { GoogleAppsScriptConfig, Team, PredictionResult } from '../types';

interface GoogleAppsScriptIntegrationProps {
  currentHomeTeam?: Team;
  currentAwayTeam?: Team;
  currentPrediction?: PredictionResult;
  className?: string;
}

export const GoogleAppsScriptIntegration: React.FC<GoogleAppsScriptIntegrationProps> = ({
  currentHomeTeam,
  currentAwayTeam,
  currentPrediction,
  className = '',
}) => {
  const [config, setConfig] = useState<GoogleAppsScriptConfig>({
    deploymentId: 'AKfycbx6iTTNhA84pDolIeibOjbGTUKJNX2n7cXCwREa3nq3c7kmlKisERLupcuWJPxW17xS',
    webAppUrl:
      'https://script.google.com/macros/s/AKfycbx6iTTNhA84pDolIeibOjbGTUKJNX2n7cXCwREa3nq3c7kmlKisERLupcuWJPxW17xS/exec',
    status: 'CONNECTED',
    lastSyncTimestamp: null,
    lastError: null,
  });

  const [testAction, setTestAction] = useState<string>('live');
  const [testing, setTesting] = useState<boolean>(false);
  const [testResponse, setTestResponse] = useState<any | null>(null);
  const [exporting, setExporting] = useState<boolean>(false);
  const [exportSuccessMessage, setExportSuccessMessage] = useState<string | null>(null);
  const [copiedUrl, setCopiedUrl] = useState<boolean>(false);
  const [editingUrl, setEditingUrl] = useState<boolean>(false);
  const [inputUrl, setInputUrl] = useState<string>(config.webAppUrl);

  // Fetch current config on load
  useEffect(() => {
    fetch('/api/apps-script/config')
      .then((res) => res.json())
      .then((data) => {
        if (data && data.deploymentId) {
          setConfig(data);
          setInputUrl(data.webAppUrl);
        }
      })
      .catch((err) => console.warn('Apps script config fetch error:', err));
  }, []);

  const handleTestConnection = async () => {
    setTesting(true);
    setTestResponse(null);
    try {
      const res = await fetch('/api/apps-script/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: testAction }),
      });
      const data = await res.json();
      setTestResponse(data);
      if (data.success) {
        setConfig((prev) => ({
          ...prev,
          status: 'CONNECTED',
          lastSyncTimestamp: new Date().toLocaleTimeString(),
          lastError: null,
        }));
      } else {
        setConfig((prev) => ({
          ...prev,
          status: 'ERROR',
          lastError: data.error || 'Failed to connect',
        }));
      }
    } catch (err: any) {
      setTestResponse({ error: err.message || 'Network error' });
      setConfig((prev) => ({ ...prev, status: 'ERROR', lastError: err.message }));
    } finally {
      setTesting(false);
    }
  };

  const handleExportPrediction = async () => {
    if (!currentHomeTeam || !currentAwayTeam || !currentPrediction) return;

    setExporting(true);
    setExportSuccessMessage(null);
    try {
      const res = await fetch('/api/apps-script/export-prediction', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          homeTeam: currentHomeTeam,
          awayTeam: currentAwayTeam,
          prediction: currentPrediction,
          timestamp: new Date().toISOString(),
        }),
      });
      const data = await res.json();
      if (data.success) {
        setExportSuccessMessage(`Successfully logged prediction (${currentHomeTeam.name} vs ${currentAwayTeam.name}) to Google Apps Script endpoint!`);
        setConfig((prev) => ({
          ...prev,
          lastSyncTimestamp: new Date().toLocaleTimeString(),
        }));
      } else {
        setExportSuccessMessage(`Error: ${data.message || 'Export failed'}`);
      }
    } catch (err: any) {
      setExportSuccessMessage(`Export failed: ${err.message}`);
    } finally {
      setExporting(false);
    }
  };

  const handleCopyUrl = () => {
    navigator.clipboard.writeText(config.webAppUrl);
    setCopiedUrl(true);
    setTimeout(() => setCopiedUrl(false), 2000);
  };

  const handleSaveUrl = async () => {
    try {
      const res = await fetch('/api/apps-script/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ webAppUrl: inputUrl }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.config) {
          setConfig(data.config);
        }
        setEditingUrl(false);
      }
    } catch (err) {
      console.error('Error saving Apps Script URL:', err);
    }
  };

  return (
    <div
      id="google-apps-script-panel"
      className={`bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xl font-mono space-y-5 ${className}`}
    >
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-indigo-500/10 border border-indigo-500/30 text-indigo-400">
            <FileCode className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-100 uppercase tracking-wider flex items-center gap-2">
              Google Apps Script Web App Integration
              <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[9px] px-2 py-0.5 rounded font-black flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                ACTIVE DEPLOYMENT
              </span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5 font-sans">
              Connects directly to Google Apps Script deployment (<code className="text-indigo-300">AKfycbx6iT...W17xS</code>) for live data sync & Google Sheets logging
            </p>
          </div>
        </div>

        {/* Sync Prediction Button */}
        {currentPrediction && (
          <button
            id="btn-export-prediction-apps-script"
            onClick={handleExportPrediction}
            disabled={exporting}
            className="flex items-center gap-2 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-lg transition-colors cursor-pointer disabled:opacity-50 self-start md:self-auto shadow-lg shadow-indigo-950/50"
          >
            <Table className="w-3.5 h-3.5" />
            <span>{exporting ? 'Syncing to Sheets...' : 'Sync Active Match to Google Sheets'}</span>
          </button>
        )}
      </div>

      {/* Deployment Details Row */}
      <div className="bg-slate-950 border border-slate-800 rounded-lg p-3 space-y-2.5">
        <div className="flex items-center justify-between text-xs">
          <span className="text-slate-400 font-bold uppercase text-[10px]">Deployment ID</span>
          <span className="text-indigo-300 font-mono text-[11px] font-bold bg-slate-900 border border-slate-800 px-2 py-0.5 rounded">
            {config.deploymentId}
          </span>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
          <span className="text-slate-400 font-bold uppercase text-[10px]">Web App URL</span>
          {editingUrl ? (
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <input
                type="text"
                value={inputUrl}
                onChange={(e) => setInputUrl(e.target.value)}
                className="bg-slate-900 border border-indigo-500/50 text-slate-100 text-[11px] px-2 py-1 rounded w-full sm:w-96 focus:outline-none"
              />
              <button
                onClick={handleSaveUrl}
                className="px-2 py-1 bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold text-[11px] rounded cursor-pointer"
              >
                Save
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-[11px] text-slate-300 truncate max-w-xl">
              <span className="truncate text-slate-400">{config.webAppUrl}</span>
              <button
                onClick={handleCopyUrl}
                className="p-1 hover:text-indigo-400 transition-colors cursor-pointer"
                title="Copy Web App URL"
              >
                {copiedUrl ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-slate-500" />}
              </button>
              <a
                href={config.webAppUrl}
                target="_blank"
                rel="noreferrer"
                className="p-1 hover:text-indigo-400 transition-colors cursor-pointer"
                title="Open Web App in new tab"
              >
                <ExternalLink className="w-3.5 h-3.5 text-slate-500" />
              </a>
              <button
                onClick={() => setEditingUrl(true)}
                className="text-[10px] text-indigo-400 underline hover:text-indigo-300 ml-1 cursor-pointer"
              >
                Edit
              </button>
            </div>
          )}
        </div>
      </div>

      {exportSuccessMessage && (
        <div className="p-3 bg-indigo-950/60 border border-indigo-500/40 rounded-lg text-xs text-indigo-300 font-sans flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{exportSuccessMessage}</span>
        </div>
      )}

      {/* Web App Action Execution & Test Suite */}
      <div className="bg-slate-950 border border-slate-800 rounded-lg p-3.5 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800/80 pb-2.5">
          <span className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
            <Code2 className="w-3.5 h-3.5 text-cyan-400" />
            Query Endpoint Execution Tester
          </span>

          <div className="flex items-center gap-2">
            <span className="text-slate-400 text-[11px] font-sans">Action Query Param:</span>
            <select
              value={testAction}
              onChange={(e) => setTestAction(e.target.value)}
              className="bg-slate-900 border border-slate-700 text-indigo-300 font-bold text-xs px-2.5 py-1 rounded focus:outline-none cursor-pointer"
            >
              <option value="live">?action=live</option>
              <option value="fixtures">?action=fixtures</option>
              <option value="sync">?action=sync</option>
              <option value="predict">?action=predict</option>
            </select>

            <button
              id="btn-test-apps-script"
              onClick={handleTestConnection}
              disabled={testing}
              className="flex items-center gap-1.5 px-3 py-1 bg-slate-800 hover:bg-slate-700 text-indigo-300 border border-slate-700 font-bold text-xs rounded transition-colors cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${testing ? 'animate-spin' : ''}`} />
              <span>{testing ? 'Testing...' : 'Execute Request'}</span>
            </button>
          </div>
        </div>

        {/* Endpoint Response Viewer */}
        {testResponse ? (
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-[10px] text-slate-400 font-sans">
              <span>
                Endpoint Called:{' '}
                <code className="text-indigo-300 font-mono">
                  {testResponse.endpoint || `${config.webAppUrl}?action=${testAction}`}
                </code>
              </span>
              <span className={testResponse.success ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>
                {testResponse.statusCode ? `HTTP ${testResponse.statusCode}` : 'RESULT'}
              </span>
            </div>

            <pre className="p-3 bg-slate-900 rounded border border-slate-800 text-[11px] text-emerald-400 overflow-x-auto max-h-48 font-mono leading-relaxed">
              {JSON.stringify(testResponse.data || testResponse, null, 2)}
            </pre>
          </div>
        ) : (
          <p className="text-xs text-slate-500 font-sans italic">
            Select an action parameter (e.g. <code className="text-indigo-400">?action=live</code>) and click "Execute Request" to inspect raw JSON responses directly from the Apps Script Web App.
          </p>
        )}
      </div>
    </div>
  );
};

export default GoogleAppsScriptIntegration;
