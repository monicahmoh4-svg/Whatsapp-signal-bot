import React from "react";
import { TradingSignal } from "../types";
import { Bell, CheckCircle2, XCircle, Clock, TrendingUp } from "lucide-react";

interface Props { signals: TradingSignal[]; }

const STATUS_STYLES: Record<string, string> = {
  ACTIVE:   "bg-emerald-950/40 text-emerald-400 border-emerald-900",
  TP1_HIT:  "bg-sky-950/40 text-sky-400 border-sky-900",
  TP2_HIT:  "bg-sky-950/40 text-sky-400 border-sky-900",
  TP3_HIT:  "bg-sky-950/40 text-sky-400 border-sky-900",
  SL_HIT:   "bg-rose-950/40 text-rose-400 border-rose-900",
  CLOSED:   "bg-slate-800 text-slate-500 border-slate-700",
};

function timeAgo(iso: string): string {
  const d = Date.now() - new Date(iso).getTime();
  const m = Math.floor(d / 60000);
  if (m < 1) return "Just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export default function AlertsView({ signals }: Props) {
  const active = signals.filter(s => s.status === "ACTIVE");
  const recent = signals.filter(s => s.status !== "ACTIVE").slice(0, 20);

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-center gap-2">
        <Bell className="w-5 h-5 text-amber-400" />
        <h2 className="text-base font-bold text-white">Signal Alerts</h2>
        {active.length > 0 && (
          <span className="text-[9px] font-bold px-2 py-0.5 bg-emerald-600 text-white rounded-full uppercase">{active.length} Active</span>
        )}
      </div>

      {active.length === 0 && recent.length === 0 && (
        <div className="text-center py-16 space-y-3">
          <Bell className="w-10 h-10 text-slate-700 mx-auto" />
          <p className="text-sm text-slate-500">No signals yet</p>
          <p className="text-xs text-slate-600">Signals sent via the scanner or compose tab will appear here.</p>
        </div>
      )}

      {active.length > 0 && (
        <div className="space-y-3">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Active Signals</p>
          {active.map(s => (
            <div key={s.id} className="bg-emerald-950/20 border border-emerald-900/40 rounded-2xl p-4 space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-bold text-white">{s.symbol}</p>
                  <p className="text-xs text-slate-400">{s.action} · {s.assetClass}</p>
                </div>
                <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border uppercase ${STATUS_STYLES[s.status]}`}>{s.status}</span>
              </div>
              <div className="flex items-center gap-3 text-[10px] text-slate-500">
                <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{timeAgo(s.createdAt)}</span>
                {s.groupNameUsed && <span className="flex items-center gap-1"><TrendingUp className="w-3 h-3" />{s.groupNameUsed}</span>}
                {s.sentMessageId
                  ? <span className="flex items-center gap-1 text-emerald-400"><CheckCircle2 className="w-3 h-3" />Sent</span>
                  : <span className="flex items-center gap-1 text-slate-600"><Clock className="w-3 h-3" />Draft</span>}
              </div>
            </div>
          ))}
        </div>
      )}

      {recent.length > 0 && (
        <div className="space-y-3">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Recent</p>
          {recent.map(s => (
            <div key={s.id} className="bg-slate-900 border border-slate-800 rounded-xl p-3 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-300">{s.symbol} · {s.action}</p>
                <p className="text-[10px] text-slate-600">{timeAgo(s.createdAt)}</p>
              </div>
              <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border uppercase ${STATUS_STYLES[s.status]}`}>{s.status.replace("_", " ")}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
