import React, { useState, useEffect } from "react";
import {
  LayoutDashboard, Radio, Cpu, Bell, PenLine,
  History, FolderOpen, Settings, LogOut, Zap,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { WhatsAppConfig, TradingSignal, ConnectedGroup, SiteConfig } from "./types";
import { whapiSend, whapiDelete, sanitizeGroupId } from "./whapi";
import DashboardView  from "./components/DashboardView";
import ScannerView    from "./components/ScannerView";
import AlertsView     from "./components/AlertsView";
import SignalForm     from "./components/SignalForm";
import HistoryView    from "./components/HistoryView";
import TemplatesView  from "./components/TemplatesView";
import SettingsView   from "./components/SettingsView";
import GroupsView     from "./components/GroupsView";
import LoginScreen    from "./components/LoginScreen";

const LS_CONFIG  = "wa_signal_config";
const LS_SIGNALS = "wa_signal_history";
const LS_GROUPS  = "wa_connected_groups";
const LS_SITE    = "wa_site_config";

type Tab = "dashboard" | "scanner" | "alerts" | "compose" | "history" | "templates" | "settings" | "groups";

const NAV: { id: Tab; label: string; icon: React.ElementType; badge?: string }[] = [
  { id: "dashboard", label: "Dashboard",  icon: LayoutDashboard },
  { id: "scanner",   label: "Scanner",    icon: Cpu, badge: "Live" },
  { id: "alerts",    label: "Alerts",     icon: Bell },
  { id: "compose",   label: "Compose",    icon: PenLine },
  { id: "history",   label: "History",    icon: History },
  { id: "templates", label: "Templates",  icon: FolderOpen },
  { id: "groups",    label: "Groups",     icon: Radio },
  { id: "settings",  label: "Settings",   icon: Settings },
];

const FULL_WIDTH_TABS: Tab[] = ["templates", "settings", "groups", "history"];

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [activeTab, setActiveTab]             = useState<Tab>("compose");
  const [aiConfigured, setAiConfigured]       = useState(false);

  const [config, setConfig] = useState<WhatsAppConfig>({
    apiToken: "", groupId: "", groupName: "", isConnected: false,
    enableScannerBroadcast: true, enableManualBroadcast: true,
  });

  const [siteConfig, setSiteConfig] = useState<SiteConfig>({
    siteName: "", promoUrl: "", botName: "USE BOT",
    botSignature: "Signal Bot", hashtags: "#TradingSignal #Signals", bots: [],
  });

  const [signals, setSignals] = useState<TradingSignal[]>([]);
  const [groups,  setGroups]  = useState<ConnectedGroup[]>([]);

  // ── Bootstrap ────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (localStorage.getItem("wa_auth_token")) setIsAuthenticated(true);
    try { const r = localStorage.getItem(LS_CONFIG);  if (r) setConfig(JSON.parse(r));  } catch {}
    try { const r = localStorage.getItem(LS_SITE);    if (r) setSiteConfig(JSON.parse(r)); } catch {}
    try { const r = localStorage.getItem(LS_SIGNALS); if (r) setSignals(JSON.parse(r)); } catch {}
    try { const r = localStorage.getItem(LS_GROUPS);  if (r) setGroups(JSON.parse(r));  } catch {}
    fetch("/api/health").then(r => r.json()).then(d => setAiConfigured(d.aiConfigured)).catch(() => {});
  }, []);

  // ── Persist helpers ───────────────────────────────────────────────────────────
  const persistConfig = (c: WhatsAppConfig) => {
    setConfig(c); localStorage.setItem(LS_CONFIG, JSON.stringify(c));
  };
  const persistSite = (s: SiteConfig) => {
    setSiteConfig(s); localStorage.setItem(LS_SITE, JSON.stringify(s));
  };
  const persistSignals = (list: TradingSignal[]) => {
    setSignals(list); localStorage.setItem(LS_SIGNALS, JSON.stringify(list));
  };
  const persistGroups = (list: ConnectedGroup[]) => {
    setGroups(list); localStorage.setItem(LS_GROUPS, JSON.stringify(list));
  };

  const trackSignalSent = (groupId: string) => {
    setGroups(prev => {
      const updated = prev.map(g =>
        g.groupId === groupId
          ? { ...g, totalSignalsSent: g.totalSignalsSent + 1, lastSignalAt: new Date().toISOString() }
          : g
      );
      localStorage.setItem(LS_GROUPS, JSON.stringify(updated));
      return updated;
    });
  };

  const handleSetActiveGroup = (grp: ConnectedGroup) => {
    persistConfig({
      ...config,
      apiToken:    grp.apiToken,
      groupId:     grp.groupId,
      groupName:   grp.groupName,
      isConnected: true,
    });
  };

  // ── Send to WhatsApp — calls Whapi DIRECTLY from the browser ─────────────────
  // No backend involved — browser → gate.whapi.cloud directly.
  // This avoids the HTML 404 error that occurred when calling /api/whatsapp/send.
  const handlePostToWhatsApp = async (
    text: string
  ): Promise<{ success: boolean; messageId?: string; error?: string }> => {
    if (!config.apiToken || !config.groupId) {
      return { success: false, error: "No WhatsApp group connected. Go to Settings to connect." };
    }
    try {
      const result = await whapiSend(
        config.apiToken,
        sanitizeGroupId(config.groupId),
        text
      );
      trackSignalSent(config.groupId);
      return { success: true, messageId: result.messageId };
    } catch (err: any) {
      return { success: false, error: err.message || "Send failed" };
    }
  };

  // ── Auto-delete signals older than 10 min — calls Whapi directly ─────────────
  useEffect(() => {
    const sweep = async () => {
      const raw = localStorage.getItem(LS_SIGNALS);
      if (!raw) return;
      let list: TradingSignal[];
      try { list = JSON.parse(raw); } catch { return; }
      const now = Date.now();
      const due = list.filter(
        s => s.sentMessageId && now - new Date(s.createdAt).getTime() >= 10 * 60 * 1000
      );
      if (!due.length) return;
      for (const s of due) {
        if (s.sentMessageId && config.apiToken) {
          whapiDelete(config.apiToken, s.sentMessageId).catch(() => {});
        }
      }
      const dueIds = new Set(due.map(s => s.id));
      setSignals(prev => {
        const remaining = prev.filter(s => !dueIds.has(s.id));
        localStorage.setItem(LS_SIGNALS, JSON.stringify(remaining));
        return remaining;
      });
    };
    const t1 = setTimeout(sweep, 5000);
    const t2 = setInterval(sweep, 30000);
    return () => { clearTimeout(t1); clearInterval(t2); };
  }, [config.apiToken]);

  const handleLogin = (token: string) => {
    localStorage.setItem("wa_auth_token", token);
    setIsAuthenticated(true);
  };
  const handleLogout = () => {
    localStorage.removeItem("wa_auth_token");
    setIsAuthenticated(false);
  };

  if (!isAuthenticated) return <LoginScreen onLogin={handleLogin} />;

  const isFullWidth = FULL_WIDTH_TABS.includes(activeTab);

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col">
      {/* Top bar */}
      <header className="sticky top-0 z-50 bg-slate-950/95 backdrop-blur border-b border-slate-800 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-emerald-600 flex items-center justify-center">
            <Zap className="w-4 h-4 text-white" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-white leading-none">WA Signal Bot</h1>
            <p className="text-[9px] text-slate-500 mt-0.5">WhatsApp Auto-Broadcast</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {config.isConnected && (
            <div className="flex items-center gap-1.5 text-[10px] text-emerald-400 bg-emerald-950/40 border border-emerald-900/40 px-2 py-1 rounded-lg">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              {config.groupName || "Connected"}
            </div>
          )}
          <button onClick={handleLogout}
            className="p-1.5 text-slate-500 hover:text-white hover:bg-slate-800 rounded-lg transition-all"
            title="Logout">
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Nav */}
      <nav className="bg-slate-950 border-b border-slate-800 px-2 overflow-x-auto">
        <div className="flex gap-0.5 min-w-max">
          {NAV.map(item => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button key={item.id} onClick={() => setActiveTab(item.id)}
                className={`relative flex items-center gap-1.5 px-3 py-2.5 text-xs font-medium transition-all whitespace-nowrap ${
                  isActive ? "text-emerald-400 border-b-2 border-emerald-400" : "text-slate-500 hover:text-slate-300"
                }`}>
                <Icon className="w-3.5 h-3.5" />
                {item.label}
                {item.badge && (
                  <span className="text-[8px] font-bold px-1 py-0.5 bg-emerald-600 text-white rounded-full uppercase">{item.badge}</span>
                )}
                {item.id === "groups" && groups.length > 0 && (
                  <span className="text-[8px] font-bold px-1 py-0.5 bg-slate-700 text-slate-300 rounded-full">{groups.length}</span>
                )}
                {item.id === "history" && signals.length > 0 && (
                  <span className="text-[8px] font-bold px-1 py-0.5 bg-slate-700 text-slate-300 rounded-full">{signals.length}</span>
                )}
              </button>
            );
          })}
        </div>
      </nav>

      {/* Content */}
      <main className="flex-1 overflow-y-auto">
        <div className={`mx-auto px-3 py-4 ${isFullWidth ? "max-w-4xl" : "max-w-2xl"}`}>
          <AnimatePresence mode="wait">
            {activeTab === "dashboard" ? (
              <motion.div key="dash" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                <DashboardView config={config} signals={signals} groups={groups} siteConfig={siteConfig} aiConfigured={aiConfigured} onNavigate={setActiveTab} />
              </motion.div>
            ) : activeTab === "scanner" ? (
              <motion.div key="scan" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                <ScannerView config={config} siteConfig={siteConfig} aiConfigured={aiConfigured}
                  onPostToWhatsApp={handlePostToWhatsApp}
                  onSignalGenerated={(signal) => { persistSignals([signal, ...signals]); }} />
              </motion.div>
            ) : activeTab === "alerts" ? (
              <motion.div key="alerts" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                <AlertsView signals={signals} />
              </motion.div>
            ) : activeTab === "compose" ? (
              <motion.div key="compose" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                <SignalForm config={config} siteConfig={siteConfig} aiConfigured={aiConfigured}
                  onSiteConfigChange={persistSite}
                  onPostToWhatsApp={handlePostToWhatsApp}
                  onSignalSaved={(sig) => persistSignals([sig, ...signals])} />
              </motion.div>
            ) : activeTab === "history" ? (
              <motion.div key="hist" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                <HistoryView signals={signals} onSignalsChange={persistSignals} />
              </motion.div>
            ) : activeTab === "templates" ? (
              <motion.div key="tpl" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                <TemplatesView siteConfig={siteConfig} onPostToWhatsApp={handlePostToWhatsApp} />
              </motion.div>
            ) : activeTab === "groups" ? (
              <motion.div key="grps" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
                <GroupsView groups={groups} activeConfig={config} onGroupsChange={persistGroups} onSetActive={handleSetActiveGroup} />
              </motion.div>
            ) : activeTab === "settings" ? (
              <motion.div key="set" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                <SettingsView config={config} siteConfig={siteConfig} aiConfigured={aiConfigured}
                  onConfigChange={persistConfig} onSiteConfigChange={persistSite} />
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}
