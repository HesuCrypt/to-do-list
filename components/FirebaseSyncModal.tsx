'use client';

import React, { useState, useEffect } from 'react';
import { 
  X, 
  Cloud, 
  CheckCircle, 
  AlertCircle, 
  ExternalLink, 
  Copy, 
  Check, 
  RefreshCw,
  Trash2
} from 'lucide-react';
import { 
  getActiveFirebaseConfig, 
  saveFirebaseConfigToStorage, 
  clearFirebaseConfigFromStorage,
  saveToCloudDashboard,
  getFirestoreDb,
  FirebaseConfig
} from '@/lib/firebase';

interface FirebaseSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentData: any;
  onSyncSuccess?: () => void;
}

export default function FirebaseSyncModal({
  isOpen,
  onClose,
  currentData,
  onSyncSuccess,
}: FirebaseSyncModalProps) {
  const [configText, setConfigText] = useState('');
  const [activeConfig, setActiveConfig] = useState<FirebaseConfig | null>(() => getActiveFirebaseConfig());
  const [apiKey, setApiKey] = useState(() => getActiveFirebaseConfig()?.apiKey || '');
  const [projectId, setProjectId] = useState(() => getActiveFirebaseConfig()?.projectId || '');
  const [appId, setAppId] = useState(() => getActiveFirebaseConfig()?.appId || '');
  const [authDomain, setAuthDomain] = useState(() => getActiveFirebaseConfig()?.authDomain || '');
  const [storageBucket, setStorageBucket] = useState(() => getActiveFirebaseConfig()?.storageBucket || '');
  const [messagingSenderId, setMessagingSenderId] = useState(() => getActiveFirebaseConfig()?.messagingSenderId || '');

  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  if (!isOpen) return null;

  const handleParseAndApplyJson = (text: string) => {
    try {
      // Find json in text (e.g. if user pastes const firebaseConfig = { ... };)
      const cleanJson = text
        .replace(/const\s+firebaseConfig\s*=\s*/g, '')
        .replace(/;/g, '')
        .trim();

      // Convert JS object format to standard JSON (quoted keys)
      const formattedJson = cleanJson.replace(/([{,]\s*)([a-zA-Z0-9_]+)\s*:/g, '$1"$2":');
      const parsed = JSON.parse(formattedJson);

      if (parsed.apiKey) setApiKey(parsed.apiKey);
      if (parsed.projectId) setProjectId(parsed.projectId);
      if (parsed.appId) setAppId(parsed.appId);
      if (parsed.authDomain) setAuthDomain(parsed.authDomain);
      if (parsed.storageBucket) setStorageBucket(parsed.storageBucket);
      if (parsed.messagingSenderId) setMessagingSenderId(parsed.messagingSenderId);

      setStatusMsg({ type: 'success', text: 'Firebase config parsed successfully!' });
    } catch {
      setStatusMsg({ type: 'error', text: 'Could not auto-parse JSON. Please enter the fields manually below.' });
    }
  };

  const handleSaveAndSync = async () => {
    if (!apiKey.trim() || !projectId.trim() || !appId.trim()) {
      setStatusMsg({ type: 'error', text: 'API Key, Project ID, and App ID are required.' });
      return;
    }

    setIsSaving(true);
    setStatusMsg({ type: 'info', text: 'Connecting to Firestore and syncing data...' });

    const newConfig: FirebaseConfig = {
      apiKey: apiKey.trim(),
      projectId: projectId.trim(),
      appId: appId.trim(),
      authDomain: authDomain.trim() || `${projectId.trim()}.firebaseapp.com`,
      storageBucket: storageBucket.trim() || `${projectId.trim()}.appspot.com`,
      messagingSenderId: messagingSenderId.trim() || undefined,
    };

    saveFirebaseConfigToStorage(newConfig);
    setActiveConfig(newConfig);

    try {
      const ok = await saveToCloudDashboard(currentData);
      if (ok) {
        setStatusMsg({ type: 'success', text: 'Connected to Firebase! Your data is now synced to the cloud in real time.' });
        if (onSyncSuccess) onSyncSuccess();
        setTimeout(() => {
          onClose();
        }, 1200);
      } else {
        setStatusMsg({ 
          type: 'error', 
          text: 'Saved config, but failed to write to Firestore. Check that Firestore Database is created in Test Mode in Firebase Console.' 
        });
      }
    } catch (e: any) {
      setStatusMsg({ type: 'error', text: e?.message || 'Error syncing with Firestore.' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDisconnect = () => {
    if (confirm('Disconnect Firebase cloud sync? Your local data will remain saved on disk.')) {
      clearFirebaseConfigFromStorage();
      setActiveConfig(null);
      setApiKey('');
      setProjectId('');
      setAppId('');
      setStatusMsg({ type: 'info', text: 'Firebase cloud sync disconnected. Using local database.' });
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white border-2 border-black max-w-lg w-full p-6 space-y-5 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] max-h-[92vh] flex flex-col">
        {/* Modal Header */}
        <div className="flex items-start justify-between border-b-2 border-black pb-3">
          <div className="flex items-center gap-2">
            <Cloud size={22} className="text-black" />
            <div>
              <h3 className="text-lg font-black uppercase tracking-tight">Cross-Device Cloud Sync</h3>
              <p className="text-[10px] opacity-60 uppercase font-semibold">
                Sync live between your Desktop and Mobile phone
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 hover:bg-neutral-100 border border-black transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        <div className="overflow-y-auto space-y-4 flex-1 pr-1 text-xs">
          {/* Status Banner */}
          {activeConfig ? (
            <div className="border border-green-600 bg-green-50 p-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle size={18} className="text-green-700 shrink-0" />
                <div>
                  <span className="font-extrabold text-green-950 uppercase text-[10px]">
                    Connected to Firebase
                  </span>
                  <p className="text-[10px] text-green-800 font-mono">
                    Project: {activeConfig.projectId}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleDisconnect}
                className="px-2 py-1 text-[9px] font-bold uppercase border border-red-600 text-red-700 hover:bg-red-600 hover:text-white transition-colors"
              >
                Disconnect
              </button>
            </div>
          ) : (
            <div className="border border-black bg-neutral-50 p-3 space-y-1">
              <p className="font-bold text-neutral-900">
                Want your changes on desktop to appear instantly on your phone?
              </p>
              <p className="text-[11px] text-neutral-600">
                Firebase Firestore gives you <strong>1 GB storage &amp; 50,000 syncs per day 100% free</strong> with zero credit card required.
              </p>
            </div>
          )}

          {/* Quick Setup Instructions */}
          <div className="border border-neutral-300 p-3 bg-neutral-50/50 space-y-2">
            <span className="font-extrabold text-[10px] uppercase tracking-wider block">
              1-Minute Free Setup:
            </span>
            <ol className="list-decimal list-inside space-y-1 text-[11px] text-neutral-700 font-medium">
              <li>
                Open{' '}
                <a
                  href="https://console.firebase.google.com"
                  target="_blank"
                  rel="noreferrer"
                  className="font-bold underline text-black inline-flex items-center gap-0.5"
                >
                  Firebase Console <ExternalLink size={10} />
                </a>{' '}
                and click <strong>Add project</strong>.
              </li>
              <li>
                Go to <strong>Build &rarr; Firestore Database</strong> &rarr; click <strong>Create database</strong> (choose <strong>Test mode</strong>).
              </li>
              <li>
                Click <strong>Project Settings</strong> (gear icon) &rarr; scroll to <strong>Your apps</strong> &rarr; click Web (<strong>&lt;/&gt;</strong>) and copy the <code className="bg-neutral-200 px-1 font-mono">firebaseConfig</code> code snippet.
              </li>
            </ol>
          </div>

          {/* Paste Snippet Section */}
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider mb-1">
              Paste Firebase Config Code Snippet:
            </label>
            <div className="flex gap-2">
              <textarea
                value={configText}
                onChange={(e) => {
                  setConfigText(e.target.value);
                  handleParseAndApplyJson(e.target.value);
                }}
                placeholder="const firebaseConfig = { apiKey: '...', projectId: '...', ... };"
                rows={2}
                className="w-full border border-black p-2 font-mono text-[10px] focus:outline-none focus:bg-neutral-50 resize-none"
              />
            </div>
          </div>

          {/* Individual Fields */}
          <div className="space-y-2 pt-1 border-t border-black/10">
            <span className="text-[10px] font-bold uppercase tracking-wider opacity-60 block">
              Or Enter Credentials:
            </span>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[9px] font-bold uppercase mb-0.5">Project ID *</label>
                <input
                  type="text"
                  value={projectId}
                  onChange={(e) => setProjectId(e.target.value)}
                  placeholder="e.g. my-todo-app-123"
                  className="w-full border border-black px-2 py-1.5 font-mono text-[11px] focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-[9px] font-bold uppercase mb-0.5">API Key *</label>
                <input
                  type="text"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="AIzaSy..."
                  className="w-full border border-black px-2 py-1.5 font-mono text-[11px] focus:outline-none"
                />
              </div>
            </div>
            <div>
              <label className="block text-[9px] font-bold uppercase mb-0.5">App ID *</label>
              <input
                type="text"
                value={appId}
                onChange={(e) => setAppId(e.target.value)}
                placeholder="1:123456789:web:abcdef..."
                className="w-full border border-black px-2 py-1.5 font-mono text-[11px] focus:outline-none"
              />
            </div>
          </div>

          {/* Status Message */}
          {statusMsg && (
            <div
              className={`p-2.5 text-xs font-semibold border flex items-center gap-2 ${
                statusMsg.type === 'success'
                  ? 'bg-green-50 border-green-600 text-green-950'
                  : statusMsg.type === 'error'
                  ? 'bg-red-50 border-red-600 text-red-950'
                  : 'bg-blue-50 border-blue-600 text-blue-950'
              }`}
            >
              {statusMsg.type === 'success' ? (
                <CheckCircle size={14} className="shrink-0 text-green-600" />
              ) : (
                <AlertCircle size={14} className="shrink-0 text-red-600" />
              )}
              <span>{statusMsg.text}</span>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="border-t-2 border-black pt-3 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-black text-[10px] font-bold uppercase hover:bg-neutral-100"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSaveAndSync}
            disabled={isSaving}
            className="bg-black text-white px-6 py-2 border border-black text-[10px] font-bold uppercase tracking-wider hover:opacity-80 disabled:opacity-50 flex items-center gap-1.5"
          >
            {isSaving ? <RefreshCw size={12} className="animate-spin" /> : <Cloud size={12} />}
            <span>{isSaving ? 'Syncing...' : 'Save & Connect Cloud Sync'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
