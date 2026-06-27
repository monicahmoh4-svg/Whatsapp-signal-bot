import React, { useState } from "react";
import { ConnectedGroup, WhatsAppConfig } from "../types";
import { Radio, Plus, Trash2, CheckCircle2, AlertCircle, Send, Star, Clock, Hash, Eye, EyeOff } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { whapiTest, sanitizeGroupId } from "../whapi";

interface Props {
  groups: ConnectedGroup[];
  activeConfig: WhatsAppConfig;
  onGroupsChange: (g: ConnectedGroup[]) => void;
  onSetActive: (g: ConnectedGroup) => void;
}

function maskToken(t: string) {
  if (!t || t.length < 10) return "•••••";
  return t.slice(0, 8) + "••••" + t.slice(-4);
}

function timeAgo(iso: string | null): string {
  if (!iso) return "Never";
  const d = Date.now() - new Date(iso).getTime();
  const m = Math.floor(d / 60000);
  if (m < 1) return "Just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export default function GroupsView({ groups, activeConfig, onGroupsChange, onSetActive }: Props) {
  const [showForm, setShowForm]     = useState(false);
  const [token, setToken]           = useState("");
  const [groupId, setGroupId]       = useState("");
  const [groupName, setGroupName]   = useState("");
  const [showToken, setShowToken]   = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [connectErr, setConnectErr] = useState("");
  const [testingId, setTestingId]   = useState<string | null>(null);
  const [testRes, setTestRes]       = useState<Record<string, "ok" | "fail" | string>>({});

  const spinner = (
    <svg className="animate-spin h-3.5 w-3.5" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
    </svg>
  );

  // Add group — calls Whapi directly from browser
  const handleAdd = async () => {
    if (!token.trim() || !groupId.trim()) {
      setConnectErr("API token and group ID are required.");
      return;
    }
    setConnecting(true);
    setConnectErr("");
    try {
      const cleanId = sanitizeGroupId(groupId);
      // Send a test message directly browser → Whapi to verify
      const result = await whapiTest(token.trim(), cleanId, groupName.trim() || cleanId);

      const siteCfg = (() => {
        try { return JSON.parse(localStorage.getItem("wa_site_config") || "{}"); } catch { return {}; }
      })();

      const newGroup: ConnectedGroup = {
        id: `grp_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        apiToken: token.trim(),
        groupId: cleanId,
        groupName: groupName.trim() || result.groupName || cleanId,
        isActive: groups.length === 0,
        connectedAt: new Date().toISOString(),
        lastSignalAt: null,
        totalSignalsSent: 0,
        siteName: siteCfg.siteName || "",
        promoUrl: siteCfg.promoUrl || "",
        botName:  siteCfg.botName  || "",
      };

      const updated = [...groups, newGroup];
      onGroupsChange(updated);
      if (groups.length === 0) onSetActive(newGroup);

      setToken(""); setGroupId(""); setGroupName(""); setShowForm(false);
    } catch (err: any) {
      setConnectErr(err.message || "Connection test failed. Check your token and group ID.");
    } finally {
      setConnecting(false);
    }
  };

  // Test existing group — calls Whapi directly from browser
  const handleTest = async (g: ConnectedGroup) => {
    setTestingId(g.id);
    setTestRes(prev => ({ ...prev, [g.id]: "testing" }));
    try {
      await whapiTest(g.apiToken, g.groupId, g.groupName);
      setTestRes(prev => ({ ...prev, [g.id]: "ok" }));
      onGroupsChange(groups.map(c =>
        c.id === g.id ? { ...c, lastSignalAt: new Date().toISOString() } : c
      ));
    } catch (err: any) {
      setTestRes(prev => ({ ...prev, [g.id]: err.message || "fail" }));
    } finally {
      setTestingId(null);
    }
  };

  const handleSetActive = (g: ConnectedGroup) => {
    onGroupsChange(groups.map(c => ({ ...c, isActive: c.id === g.id })));
    onSetActive(g);
  };

  const handleRemove = (id: string) => {
    const remaining = groups.filter(c => c.id !== id);
    const wasActive = groups.find(c => c.id === id)?.isActive;
    if (wasActive && remaining.length > 0) {
      remaining[0].isActive = true;
      onSetActive(remaining[0]);
    }
    onGroupsChange(remaining);
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-4">
        <div>
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <Radio className="w-5 h-5 text-emerald-400" />Connected Groups
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            {groups.length === 0 ? "No groups connected" : `${groups.length} group${groups.length > 1 ? "s" : ""} · ${groups.filter(g => g.isActive).length} active`}
          </p>
        </div>
        <button onClick={() => { setShowForm(v => !v); setConnectErr(""); }}
          className="flex items-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl transition-all">
          <Plus className="w-3.5 h-3.5" />Add Group
        </button>
      </div>

      {/* Add form */}
      <AnimatePresence>
        {showForm && (
          <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}
            className="bg-slate-950 border border-emerald-900/30 rounded-2xl p-4 space-y-3">
            <p className="text-xs font-semibold text-emerald-300">Add New Group</p>

            <div className="space-y-1.5">
              <label className="text-[10px] text-slate-400 font-medium">Group Label (optional)</label>
              <input value={groupName} onChange={e => setGroupName(e.target.value)}
                placeholder="e.g. VIP SIGNALS GROUP"
                className="w-full px-3 py-2 text-xs bg-slate-900 border border-slate-800 focus:border-emerald-500 rounded-xl text-slate-100 placeholder-slate-600 outline-none" />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] text-slate-400 font-medium">Whapi.Cloud API Token</label>
              <div className="relative">
                <input type={showToken ? "text" : "password"} value={token} onChange={e => setToken(e.target.value)}
                  placeholder="Bearer token from whapi.cloud"
                  className="w-full px-3 py-2 pr-9 text-xs bg-slate-900 border border-slate-800 focus:border-emerald-500 rounded-xl text-slate-100 placeholder-slate-600 outline-none font-mono" />
                <button type="button" onClick={() => setShowToken(v => !v)}
                  className="absolute right-3 top-2.5 text-slate-500 hover:text-slate-300">
                  {showToken ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] text-slate-400 font-medium">WhatsApp Group ID</label>
              <input value={groupId}
                onChange={e => setGroupId(e.target.value)}
                onBlur={e => setGroupId(sanitizeGroupId(e.target.value))}
                placeholder="e.g. 120363XXXXXXXXXX@g.us"
                className="w-full px-3 py-2 text-xs bg-slate-900 border border-slate-800 focus:border-emerald-500 rounded-xl text-slate-100 placeholder-slate-600 outline-none font-mono" />
              <p className="text-[10px] text-slate-500">Find in Whapi.cloud dashboard → Groups. Must end with @g.us</p>
            </div>

            {connectErr && (
              <div className="flex items-start gap-1.5 text-[11px] text-rose-400 bg-rose-950/30 border border-rose-900/30 rounded-lg p-2.5">
                <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />{connectErr}
              </div>
            )}

            <div className="flex gap-2 pt-1">
              <button onClick={handleAdd} disabled={connecting || !token.trim() || !groupId.trim()}
                className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 disabled:text-slate-500 text-white text-xs font-bold rounded-xl transition-all">
                {connecting ? spinner : <CheckCircle2 className="w-3.5 h-3.5" />}
                {connecting ? "Connecting..." : "Test & Add Group"}
              </button>
              <button onClick={() => { setShowForm(false); setConnectErr(""); }}
                className="px-4 py-2 text-xs text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-xl transition-all">
                Cancel
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Empty state */}
      {groups.length === 0 && !showForm && (
        <div className="text-center py-12 space-y-3">
          <Radio className="w-10 h-10 text-slate-700 mx-auto" />
          <p className="text-sm text-slate-500">No groups connected</p>
          <p className="text-xs text-slate-600">Click "Add Group" to connect your WhatsApp group.</p>
        </div>
      )}

      {/* Group cards */}
      <div className="space-y-3">
        {groups.map(g => (
          <motion.div key={g.id} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
            className={`relative bg-slate-950 border rounded-2xl p-4 transition-all ${g.isActive ? "border-emerald-800/60 shadow-lg shadow-emerald-950/20" : "border-slate-800 hover:border-slate-700"}`}>
            {g.isActive && (
              <span className="absolute top-3 right-3 flex items-center gap-1 text-[9px] font-bold uppercase text-emerald-300 bg-emerald-950/60 border border-emerald-800/40 px-2 py-0.5 rounded-full">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />Active
              </span>
            )}
            <div className="space-y-3">
              <div className="flex items-start gap-3 pr-16">
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${g.isActive ? "bg-emerald-900/40" : "bg-slate-800"}`}>
                  <Radio className={`w-4 h-4 ${g.isActive ? "text-emerald-400" : "text-slate-500"}`} />
                </div>
                <div>
                  <p className="text-sm font-bold text-white">{g.groupName || g.groupId}</p>
                  <p className="text-[10px] text-slate-500 font-mono mt-0.5">{g.groupId}</p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                {[
                  { label: "Token",   val: maskToken(g.apiToken) },
                  { label: "Signals", val: String(g.totalSignalsSent) },
                  { label: "Last",    val: timeAgo(g.lastSignalAt) },
                ].map(item => (
                  <div key={item.label} className="bg-slate-900/60 rounded-lg p-2 text-center">
                    <p className="text-[9px] text-slate-500 uppercase tracking-wider">{item.label}</p>
                    <p className="text-[10px] text-slate-300 font-mono mt-0.5 truncate">{item.val}</p>
                  </div>
                ))}
              </div>

              <div className="flex items-center gap-3 flex-wrap text-[9.5px] text-slate-600">
                <span className="flex items-center gap-1"><Clock className="w-3 h-3" />Connected {timeAgo(g.connectedAt)}</span>
                {g.siteName && <span className="flex items-center gap-1"><Hash className="w-3 h-3" />{g.siteName}</span>}
                {testRes[g.id] && testRes[g.id] !== "testing" && (
                  <span className={`flex items-center gap-1 font-semibold ${testRes[g.id] === "ok" ? "text-emerald-400" : "text-rose-400"}`}>
                    {testRes[g.id] === "ok" ? <CheckCircle2 className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
                    {testRes[g.id] === "ok" ? "Test passed" : testRes[g.id]}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2 pt-1 border-t border-slate-900">
                {!g.isActive && (
                  <button onClick={() => handleSetActive(g)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-700 hover:bg-emerald-600 text-white text-[11px] font-semibold rounded-lg transition-all">
                    <Star className="w-3 h-3" />Set Active
                  </button>
                )}
                <button onClick={() => handleTest(g)} disabled={testingId === g.id}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-medium rounded-lg transition-all disabled:opacity-50">
                  {testingId === g.id ? spinner : <Send className="w-3 h-3" />}
                  {testingId === g.id ? "Testing..." : "Send Test"}
                </button>
                <button onClick={() => handleRemove(g.id)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-950/40 hover:bg-rose-900/40 text-rose-400 text-[11px] font-medium rounded-lg transition-all ml-auto">
                  <Trash2 className="w-3 h-3" />Remove
                </button>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
