import React, { useState } from "react";
import { WhatsAppConfig } from "../types";
import { Eye, EyeOff, CheckCircle2, AlertCircle, Send, PowerOff, RefreshCw, ChevronDown } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";

interface Props { config: WhatsAppConfig; onChange: (c: WhatsAppConfig) => void; }

// Ensure group ID always has @g.us suffix required by Whapi
function sanitizeGroupId(id: string): string {
  const clean = id.trim().replace(/\s+/g, "");
  if (!clean) return clean;
  if (clean.endsWith("@g.us")) return clean;
  if (clean.includes("@")) return clean.split("@")[0] + "@g.us";
  return clean + "@g.us";
}

interface Group { id: string; name: string; participants: number; isAdmin: boolean; }

export default function WhatsAppConfigPanel({ config, onChange }: Props) {
  const [showToken, setShowToken] = useState(false);
  const [testStatus, setTestStatus] = useState<"idle" | "testing" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [groups, setGroups] = useState<Group[]>([]);
  const [loadingGroups, setLoadingGroups] = useState(false);
  const [showGroupPicker, setShowGroupPicker] = useState(false);

  const spinner = <svg className="animate-spin h-3.5 w-3.5" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>;

  // Load groups from Whapi
  const handleLoadGroups = async () => {
    if (!config.apiToken.trim()) { setErrorMsg("Enter your Whapi.Cloud API token first."); return; }
    setLoadingGroups(true); setErrorMsg("");
    try {
      const res = await fetch("/api/whatsapp/groups", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiToken: config.apiToken }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "Failed to fetch groups");
      setGroups(data.groups || []);
      setShowGroupPicker(true);
    } catch (err: any) { setErrorMsg(err.message); }
    finally { setLoadingGroups(false); }
  };

  const handleSelectGroup = (g: Group) => {
    onChange({ ...config, groupId: sanitizeGroupId(g.id), groupName: g.name });
    setShowGroupPicker(false);
  };

  // Send test message
  const handleTest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!config.apiToken || !config.groupId) {
      setErrorMsg("Enter API token and select a group first."); setTestStatus("error"); return;
    }
    setTestStatus("testing"); setErrorMsg(""); setSuccessMsg("");
    try {
      const cleanId = sanitizeGroupId(config.groupId);
      const res = await fetch("/api/whatsapp/test", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiToken: config.apiToken, groupId: cleanId, groupName: config.groupName }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "Test failed");
      setTestStatus("success");
      setSuccessMsg(`Test message sent to ${data.groupName || config.groupName}!`);
      onChange({ ...config, isConnected: true });
    } catch (err: any) {
      setTestStatus("error"); setErrorMsg(err.message);
      onChange({ ...config, isConnected: false });
    }
  };

  const handleDisconnect = () => {
    onChange({ ...config, apiToken: "", groupId: "", groupName: "", isConnected: false });
    setTestStatus("idle"); setErrorMsg(""); setSuccessMsg(""); setGroups([]); setShowGroupPicker(false);
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-5">
      <div className="flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
        <h2 className="text-sm font-bold text-white">WhatsApp Group Settings</h2>
      </div>

      <form onSubmit={handleTest} className="space-y-4">
        {/* API Token */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-slate-300 flex justify-between">
            <span>Whapi.Cloud API Token</span>
            <a href="https://whapi.cloud" target="_blank" rel="noreferrer" className="text-[10px] text-sky-400 hover:underline">Get free token →</a>
          </label>
          <div className="relative">
            <input
              type={showToken ? "text" : "password"}
              value={config.apiToken}
              onChange={e => onChange({ ...config, apiToken: e.target.value })}
              placeholder="Your Whapi.Cloud Bearer token"
              className="w-full px-3 py-2.5 pr-10 text-xs bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-xl text-slate-100 placeholder-slate-600 outline-none font-mono"
            />
            <button type="button" onClick={() => setShowToken(v => !v)} className="absolute right-3 top-3 text-slate-500 hover:text-slate-300">
              {showToken ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            </button>
          </div>
          <p className="text-[10px] text-slate-500">Sign up free at whapi.cloud — no Meta/Facebook approval required</p>
        </div>

        {/* Group selection */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-slate-300 flex justify-between">
            <span>WhatsApp Group</span>
            <button type="button" onClick={handleLoadGroups} disabled={loadingGroups || !config.apiToken}
              className="flex items-center gap-1 text-[10px] text-sky-400 hover:text-sky-300 disabled:opacity-40">
              {loadingGroups ? spinner : <RefreshCw className="w-3 h-3" />}
              {loadingGroups ? "Loading..." : "Load my groups"}
            </button>
          </label>
          <div className="flex gap-2">
            <input
              type="text" value={config.groupName || config.groupId}
              onChange={e => onChange({ ...config, groupId: e.target.value, groupName: e.target.value })}
              onBlur={e => { const s = sanitizeGroupId(e.target.value); if (s !== e.target.value) onChange({ ...config, groupId: s, groupName: s }); }}
              placeholder="Select a group or paste group ID"
              className="flex-1 px-3 py-2.5 text-xs bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-xl text-slate-100 placeholder-slate-600 outline-none font-mono"
              readOnly={!!config.groupName && config.groupId !== config.groupName}
            />
            {config.groupId && (
              <button type="button" onClick={() => onChange({ ...config, groupId: "", groupName: "" })}
                className="px-3 py-2 text-xs text-slate-400 bg-slate-800 hover:bg-slate-700 rounded-xl">Clear</button>
            )}
          </div>
        </div>

        {/* Group picker dropdown */}
        <AnimatePresence>
          {showGroupPicker && groups.length > 0 && (
            <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="bg-slate-950 border border-slate-800 rounded-xl overflow-hidden">
              <div className="px-3 py-2 border-b border-slate-800 flex items-center justify-between">
                <span className="text-[10px] font-semibold text-slate-400">{groups.length} groups found</span>
                <button type="button" onClick={() => setShowGroupPicker(false)} className="text-slate-500 hover:text-slate-300 text-xs">✕</button>
              </div>
              <div className="max-h-48 overflow-y-auto divide-y divide-slate-900">
                {groups.map(g => (
                  <button key={g.id} type="button" onClick={() => handleSelectGroup(g)}
                    className="w-full text-left px-3 py-2.5 hover:bg-slate-800/60 transition-colors">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs font-medium text-slate-200">{g.name}</p>
                        <p className="text-[10px] text-slate-500 font-mono mt-0.5">{g.id} · {g.participants} members</p>
                      </div>
                      <ChevronDown className="w-3 h-3 text-slate-600 -rotate-90" />
                    </div>
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Error / success */}
        {errorMsg && (
          <div className="flex items-start gap-1.5 text-[11px] text-rose-400 bg-rose-950/30 border border-rose-900/30 rounded-lg p-2.5">
            <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />{errorMsg}
          </div>
        )}
        {testStatus === "success" && successMsg && (
          <div className="flex items-start gap-1.5 text-[11px] text-emerald-400 bg-emerald-950/30 border border-emerald-900/30 rounded-lg p-2.5">
            <CheckCircle2 className="w-3.5 h-3.5 shrink-0 mt-0.5" />{successMsg}
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-wrap gap-2 pt-1">
          {!config.isConnected ? (
            <button type="submit" disabled={testStatus === "testing" || !config.apiToken || !config.groupId}
              className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 disabled:text-slate-500 text-white text-xs font-bold rounded-xl transition-all">
              {testStatus === "testing" ? spinner : <Send className="w-3.5 h-3.5" />}
              {testStatus === "testing" ? "Sending test..." : "Send Test Message"}
            </button>
          ) : (
            <>
              <div className="flex items-center gap-1.5 text-xs text-emerald-400 font-medium px-2">
                <CheckCircle2 className="w-3.5 h-3.5" /> Connected: {config.groupName}
              </div>
              <button type="button" onClick={handleDisconnect}
                className="flex items-center gap-1.5 px-3 py-2 bg-rose-950/40 hover:bg-rose-900/40 text-rose-400 text-xs font-medium rounded-xl transition-all">
                <PowerOff className="w-3.5 h-3.5" /> Disconnect
              </button>
              <button type="submit" disabled={testStatus === "testing"}
                className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium rounded-xl transition-all">
                {testStatus === "testing" ? spinner : <Send className="w-3.5 h-3.5" />}
                Re-test
              </button>
            </>
          )}
        </div>
      </form>
    </div>
  );
}
