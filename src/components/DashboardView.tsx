import React from "react";
import { WhatsAppConfig, TradingSignal, ConnectedGroup, SiteConfig } from "../types";
import { Radio, TrendingUp, Send, Cpu, Settings, Zap, AlertCircle, CheckCircle2 } from "lucide-react";

interface Props {
  config: WhatsAppConfig;
  signals: TradingSignal[];
  groups: ConnectedGroup[];
  siteConfig: SiteConfig;
  aiConfigured: boolean;
  onNavigate: (tab: any) => void;
}

export default function DashboardView({ config, signals, groups, siteConfig, aiConfigured, onNavigate }: Props) {
  const totalSent = signals.filter(s => s.sentMessageId).length;
  const activeGroup = groups.find(g => g.isActive);

  const stats = [
    { label: "Groups Connected", value: groups.length, icon: Radio, color: "text-emerald-400", bg: "bg-emerald-950/40 border-emerald-900/30" },
    { label: "Signals Sent", value: totalSent, icon: Send, color: "text-sky-400", bg: "bg-sky-950/40 border-sky-900/30" },
    { label: "Signal History", value: signals.length, icon: TrendingUp, color: "text-amber-400", bg: "bg-amber-950/40 border-amber-900/30" },
    { label: "Active Group", value: config.isConnected ? "1" : "0", icon: Zap, color: "text-purple-400", bg: "bg-purple-950/40 border-purple-900/30" },
  ];

  const quickActions = [
    { label: "Compose Signal", desc: "Draft and send a manual signal", tab: "compose", icon: Send, color: "bg-emerald-600 hover:bg-emerald-500" },
    { label: "Start Scanner", desc: "Auto-scan Deriv synthetic markets", tab: "scanner", icon: Cpu, color: "bg-sky-700 hover:bg-sky-600" },
    { label: "Connect Group", desc: "Add a WhatsApp group", tab: "settings", icon: Radio, color: "bg-slate-700 hover:bg-slate-600" },
    { label: "Settings", desc: "Configure bot and site details", tab: "settings", icon: Settings, color: "bg-slate-700 hover:bg-slate-600" },
  ];

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Status banner */}
      <div className={`p-4 rounded-2xl border flex items-start gap-3 ${config.isConnected ? "bg-emerald-950/30 border-emerald-900/40" : "bg-amber-950/30 border-amber-900/40"}`}>
        {config.isConnected
          ? <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
          : <AlertCircle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />}
        <div>
          <p className="text-sm font-semibold text-white">
            {config.isConnected ? `Connected to ${config.groupName || "WhatsApp Group"}` : "Not connected — setup required"}
          </p>
          <p className="text-[11px] text-slate-400 mt-0.5">
            {config.isConnected
              ? `Signals are broadcasting to your WhatsApp group${siteConfig.siteName ? ` via ${siteConfig.siteName}` : ""}.`
              : "Go to Settings to connect your Whapi.Cloud token and WhatsApp group."}
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3">
        {stats.map(s => (
          <div key={s.label} className={`p-4 rounded-2xl border ${s.bg} space-y-2`}>
            <div className="flex items-center justify-between">
              <p className="text-[10px] text-slate-400 uppercase tracking-wider font-medium">{s.label}</p>
              <s.icon className={`w-4 h-4 ${s.color}`} />
            </div>
            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* System health */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3">
        <p className="text-xs font-bold text-slate-300 uppercase tracking-wider">System Health</p>
        {[
          { label: "Whapi.Cloud Token", ok: !!config.apiToken, desc: "Required to send WhatsApp messages" },
          { label: "WhatsApp Group", ok: !!config.groupId, desc: "Target broadcast group" },
          { label: "Gemini AI", ok: aiConfigured, desc: "AI-powered signal generation" },
          { label: "Site Configured", ok: !!siteConfig.siteName, desc: "Site name and bot details" },
        ].map(item => (
          <div key={item.label} className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-200">{item.label}</p>
              <p className="text-[10px] text-slate-500">{item.desc}</p>
            </div>
            <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border uppercase ${item.ok ? "bg-emerald-950/40 text-emerald-400 border-emerald-900" : "bg-rose-950/30 text-rose-400 border-rose-900"}`}>
              {item.ok ? "OK" : "Missing"}
            </span>
          </div>
        ))}
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-2 gap-3">
        {quickActions.map(a => (
          <button
            key={a.label}
            onClick={() => onNavigate(a.tab)}
            className={`${a.color} p-4 rounded-2xl text-left transition-all space-y-1.5`}
          >
            <a.icon className="w-5 h-5 text-white/80" />
            <p className="text-sm font-bold text-white">{a.label}</p>
            <p className="text-[10px] text-white/60">{a.desc}</p>
          </button>
        ))}
      </div>

      {/* Recent signals */}
      {signals.length > 0 && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3">
          <p className="text-xs font-bold text-slate-300 uppercase tracking-wider">Recent Signals</p>
          {signals.slice(0, 3).map(s => (
            <div key={s.id} className="flex items-center justify-between py-2 border-b border-slate-800 last:border-0">
              <div>
                <p className="text-xs font-semibold text-slate-200">{s.symbol} · {s.action}</p>
                <p className="text-[10px] text-slate-500">{new Date(s.createdAt).toLocaleString()}</p>
              </div>
              <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${s.sentMessageId ? "bg-emerald-950/40 text-emerald-400 border border-emerald-900" : "bg-slate-800 text-slate-500 border border-slate-700"}`}>
                {s.sentMessageId ? "Sent" : "Draft"}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
