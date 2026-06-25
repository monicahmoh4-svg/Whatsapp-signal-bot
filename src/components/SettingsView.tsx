import React, { useState, useEffect } from "react";
import { WhatsAppConfig, SiteConfig } from "../types";
import { Settings, Server, Power, PowerOff, RefreshCw, Info, CheckCircle2, ShieldAlert, Copy, Check, Activity, Clock } from "lucide-react";
import WhatsAppConfigPanel from "./WhatsAppConfigPanel";

interface Props {
  config: WhatsAppConfig;
  siteConfig: SiteConfig;
  aiConfigured: boolean;
  onConfigChange: (c: WhatsAppConfig) => void;
  onSiteConfigChange: (s: SiteConfig) => void;
}

interface CronSetup { cronUrl: string; alertPayload: string; signalPayload: string; intervalMinutes: number; }
interface ServerStatus { serverReachable?: boolean; lastRunAt?: string | null; totalSentThisSession?: number; lastError?: string | null; }

function CopyBtn({ text }: { text: string }) {
  const [ok, setOk] = useState(false);
  return (
    <button onClick={() => { navigator.clipboard.writeText(text); setOk(true); setTimeout(() => setOk(false), 2000); }}
      className="flex items-center gap-1 px-2 py-1 text-[10px] bg-slate-800 hover:bg-slate-700 text-slate-300 rounded transition-all shrink-0">
      {ok ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
      {ok ? "Copied!" : "Copy"}
    </button>
  );
}

function getSiteLocal(): SiteConfig {
  try { return JSON.parse(localStorage.getItem("wa_site_config") || "{}"); } catch { return {} as SiteConfig; }
}

export default function SettingsView({ config, siteConfig, aiConfigured, onConfigChange, onSiteConfigChange }: Props) {
  const [serverStatus, setServerStatus] = useState<ServerStatus | null>(null);
  const [serverLoading, setServerLoading] = useState(false);
  const [serverError, setServerError]   = useState("");
  const [cronSetup, setCronSetup]       = useState<CronSetup | null>(null);
  const [intervalMins, setIntervalMins] = useState(2);
  const [isEnabled, setIsEnabled]       = useState(() => localStorage.getItem("wa_server_broadcast_enabled") === "true");

  const spinner = <svg className="animate-spin h-3.5 w-3.5" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>;

  const fetchStatus = async () => {
    try {
      const res = await fetch("/api/autobroadcast/status");
      if (res.ok) setServerStatus(await res.json());
    } catch {}
  };

  useEffect(() => {
    fetchStatus();
    const t = setInterval(fetchStatus, 20000);
    // Restore saved cron setup
    const u = localStorage.getItem("wa_cron_url");
    const a = localStorage.getItem("wa_cron_alert_payload");
    const s = localStorage.getItem("wa_cron_signal_payload");
    if (u && a && s && isEnabled) setCronSetup({ cronUrl: u, alertPayload: a, signalPayload: s, intervalMinutes: intervalMins });
    return () => clearInterval(t);
  }, []);

  const handleEnable = async () => {
    if (!config.apiToken || !config.groupId) { setServerError("Connect your WhatsApp group first (in the panel above)."); return; }
    setServerLoading(true); setServerError("");
    try {
      const site = getSiteLocal();
      const res  = await fetch("/api/autobroadcast/configure", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          apiToken: config.apiToken, groupId: config.groupId, groupName: config.groupName,
          siteName: site.siteName, promoUrl: site.promoUrl, botName: site.botName,
          botSignature: site.botSignature, hashtags: site.hashtags, intervalMinutes: intervalMins,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "Configure failed");
      const setup: CronSetup = { cronUrl: data.cronUrl, alertPayload: data.alertPayload, signalPayload: data.signalPayload, intervalMinutes: data.intervalMinutes };
      setCronSetup(setup);
      setIsEnabled(true);
      localStorage.setItem("wa_server_broadcast_enabled", "true");
      localStorage.setItem("wa_cron_url", setup.cronUrl);
      localStorage.setItem("wa_cron_alert_payload", setup.alertPayload);
      localStorage.setItem("wa_cron_signal_payload", setup.signalPayload);
    } catch (err: any) { setServerError(err.message); }
    finally { setServerLoading(false); }
  };

  const handleDisable = async () => {
    setServerLoading(true);
    await fetch("/api/autobroadcast/disable", { method: "POST" }).catch(() => {});
    setIsEnabled(false); setCronSetup(null);
    localStorage.removeItem("wa_server_broadcast_enabled");
    localStorage.removeItem("wa_cron_url");
    localStorage.removeItem("wa_cron_alert_payload");
    localStorage.removeItem("wa_cron_signal_payload");
    await fetchStatus();
    setServerLoading(false);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="border-b border-slate-800 pb-4">
        <h3 className="text-base font-bold text-white flex items-center gap-2"><Settings className="w-5 h-5 text-emerald-400" />System Settings</h3>
        <p className="text-xs text-slate-400 mt-0.5">Configure WhatsApp connection, site details, and server broadcasting.</p>
      </div>

      {/* WhatsApp panel */}
      <WhatsAppConfigPanel config={config} onChange={onConfigChange} />

      {/* Site config */}
      <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 space-y-4">
        <p className="text-xs font-bold text-white uppercase tracking-wider">Signal Settings</p>
        <div className="grid grid-cols-1 gap-3">
          {[
            { label: "Site Name", key: "siteName", placeholder: "e.g. Kicktrade" },
            { label: "Promo URL", key: "promoUrl", placeholder: "https://yoursite.com" },
            { label: "Bot Name", key: "botName", placeholder: "e.g. USE KICKTRADE BOT" },
            { label: "Bot Signature", key: "botSignature", placeholder: "e.g. Kicktrade Signal Bot" },
            { label: "Hashtags", key: "hashtags", placeholder: "#TradingSignal #Signals" },
          ].map(f => (
            <div key={f.key} className="space-y-1">
              <label className="text-[10px] text-slate-400 font-medium">{f.label}</label>
              <input
                value={(siteConfig as any)[f.key] || ""}
                onChange={e => onSiteConfigChange({ ...siteConfig, [f.key]: e.target.value })}
                placeholder={f.placeholder}
                className="w-full px-3 py-2 text-xs bg-slate-900 border border-slate-800 focus:border-emerald-500 rounded-xl text-slate-100 placeholder-slate-600 outline-none"
              />
            </div>
          ))}
        </div>
      </div>

      {/* Server-side auto-broadcast */}
      <div className="bg-slate-950 border border-emerald-900/30 rounded-2xl p-5 space-y-4">
        <div className="flex items-center gap-2 border-b border-slate-900 pb-2.5">
          <Server className="w-4 h-4 text-emerald-400" />
          <span className="text-xs font-bold text-white uppercase tracking-wider">Server Auto-Broadcast (24/7)</span>
          <span className={`ml-auto text-[9px] font-bold px-2 py-0.5 rounded-full uppercase ${isEnabled ? "bg-emerald-900/60 text-emerald-300 border border-emerald-800" : "bg-slate-800 text-slate-500 border border-slate-700"}`}>
            {isEnabled ? "● Active" : "○ Inactive"}
          </span>
        </div>

        <p className="text-[11px] text-slate-400 leading-relaxed">
          Signals keep broadcasting to your WhatsApp group even after you <b className="text-amber-300">log out or close the app</b>.
          Uses <a href="https://cron-job.org" target="_blank" rel="noreferrer" className="text-emerald-400 underline">cron-job.org</a> (free) to ping your server every minute.
        </p>

        {/* Status */}
        <div className="flex items-center justify-between p-3 bg-slate-900/50 border border-slate-800 rounded-xl">
          <div className="flex items-center gap-2">
            <span className={`w-2.5 h-2.5 rounded-full ${isEnabled ? "bg-emerald-400 animate-pulse" : "bg-slate-600"}`} />
            <p className="text-xs font-semibold text-slate-200">
              {isEnabled ? "🟢 Server broadcasting enabled" : "🔴 Browser-only mode (stops on logout)"}
            </p>
          </div>
          <button onClick={fetchStatus} className="p-1.5 text-slate-500 hover:text-slate-300 transition-colors"><RefreshCw className="w-3.5 h-3.5" /></button>
        </div>

        {serverStatus?.lastRunAt && (
          <div className="flex items-center gap-2 text-[10px] text-slate-500 px-1">
            <Clock className="w-3 h-3" />Last signal: {new Date(serverStatus.lastRunAt).toLocaleTimeString()} · Total: {serverStatus.totalSentThisSession ?? 0}
          </div>
        )}

        {!isEnabled && (
          <div className="flex items-center gap-3">
            <label className="text-[11px] text-slate-400 whitespace-nowrap">Interval (min)</label>
            <input type="number" min={1} step={0.5} value={intervalMins} onChange={e => setIntervalMins(Math.max(1, Number(e.target.value)))}
              className="w-20 px-2 py-1.5 text-xs bg-slate-900 border border-slate-800 focus:border-emerald-500 rounded-lg text-slate-100 outline-none" />
          </div>
        )}

        {serverError && (
          <div className="flex items-start gap-1.5 text-[11px] text-rose-400 bg-rose-950/30 border border-rose-900/40 rounded-lg p-2.5">
            <ShieldAlert className="w-3.5 h-3.5 shrink-0 mt-0.5" />{serverError}
          </div>
        )}

        {/* Cron setup panel */}
        {isEnabled && cronSetup && (
          <div className="bg-slate-900/60 border border-emerald-900/30 rounded-xl p-4 space-y-4">
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span className="text-xs font-bold text-emerald-300">Set up 2 cron jobs at cron-job.org (3 min, free)</span>
            </div>
            <div className="flex items-start gap-1.5 text-[10.5px] text-sky-200 bg-sky-950/30 border border-sky-900/30 rounded-lg p-2.5">
              <Info className="w-3.5 h-3.5 shrink-0 mt-0.5 text-sky-400" />
              Same URL, same interval — Cron Job 1 fires first (alert), Cron Job 2 fires 1 minute later (signal). Both run forever without you being online.
            </div>
            <div className="space-y-1.5">
              <p className="text-[10px] font-bold text-slate-300">URL (same for both jobs):</p>
              <div className="flex items-center gap-2 bg-slate-950 border border-slate-700 rounded-lg px-3 py-2">
                <code className="text-emerald-300 text-[10px] break-all flex-1">{cronSetup.cronUrl}</code>
                <CopyBtn text={cronSetup.cronUrl} />
              </div>
            </div>
            <div className="bg-amber-950/20 border border-amber-900/30 rounded-xl p-3 space-y-2">
              <p className="text-[11px] font-bold text-amber-300">🔔 Cron Job 1 — Alert (fires first)</p>
              <p className="text-[10px] text-slate-400">Method: POST · Content-Type: application/json · Schedule: your interval</p>
              <div className="flex items-start gap-2 bg-slate-950 border border-slate-700 rounded-lg px-2 py-2">
                <code className="text-amber-200 text-[9px] break-all flex-1 font-mono leading-relaxed">{cronSetup.alertPayload}</code>
                <CopyBtn text={cronSetup.alertPayload} />
              </div>
            </div>
            <div className="bg-emerald-950/20 border border-emerald-900/30 rounded-xl p-3 space-y-2">
              <p className="text-[11px] font-bold text-emerald-300">📈 Cron Job 2 — Signal (1 min after alert)</p>
              <p className="text-[10px] text-slate-400">Same interval — <b className="text-white">save this 1 minute after Cron Job 1</b> · Method: POST · Content-Type: application/json</p>
              <div className="flex items-start gap-2 bg-slate-950 border border-slate-700 rounded-lg px-2 py-2">
                <code className="text-emerald-200 text-[9px] break-all flex-1 font-mono leading-relaxed">{cronSetup.signalPayload}</code>
                <CopyBtn text={cronSetup.signalPayload} />
              </div>
            </div>
          </div>
        )}

        <div className="flex justify-end pt-1">
          {!isEnabled ? (
            <button onClick={handleEnable} disabled={serverLoading || !config.apiToken || !config.groupId}
              className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 disabled:text-slate-500 text-white text-xs font-bold rounded-xl transition-all cursor-pointer disabled:cursor-not-allowed">
              {serverLoading ? spinner : <Power className="w-3.5 h-3.5" />}
              {serverLoading ? "Enabling..." : "Enable Server Broadcasting"}
            </button>
          ) : (
            <div className="flex items-center gap-3">
              <button onClick={() => { const u = localStorage.getItem("wa_cron_url"); const a = localStorage.getItem("wa_cron_alert_payload"); const s = localStorage.getItem("wa_cron_signal_payload"); if (u && a && s) setCronSetup({ cronUrl: u, alertPayload: a, signalPayload: s, intervalMinutes: intervalMins }); }}
                className="flex items-center gap-1.5 px-3 py-2 text-xs text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl transition-all">
                <Info className="w-3.5 h-3.5" />Show Setup
              </button>
              <button onClick={handleDisable} disabled={serverLoading}
                className="flex items-center gap-2 px-4 py-2.5 bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold rounded-xl transition-all cursor-pointer">
                {serverLoading ? spinner : <PowerOff className="w-3.5 h-3.5" />}
                {serverLoading ? "Stopping..." : "Stop Broadcast"}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Health */}
      <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 space-y-3">
        <p className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2"><Activity className="w-4 h-4 text-amber-400" />System Health</p>
        {[
          { label: "Whapi.Cloud Token", ok: !!config.apiToken, desc: "Required to send WhatsApp messages" },
          { label: "WhatsApp Group", ok: !!config.groupId, desc: "Target broadcast group" },
          { label: "Gemini AI", ok: aiConfigured, desc: "AI signal generation" },
          { label: "Site Configured", ok: !!siteConfig.siteName, desc: "Site name and bot details" },
        ].map(item => (
          <div key={item.label} className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-200">{item.label}</p>
              <p className="text-[10px] text-slate-500">{item.desc}</p>
            </div>
            <span className={`text-[9px] font-bold px-2 py-0.5 rounded-lg border uppercase ${item.ok ? "bg-emerald-950/40 text-emerald-400 border-emerald-900" : "bg-rose-950/30 text-rose-400 border-rose-900"}`}>
              {item.ok ? "OK" : "Missing"}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
