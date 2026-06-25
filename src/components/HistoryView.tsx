import React, { useState } from "react";
import { TradingSignal } from "../types";
import { History, Search, Trash2, CheckCircle2, Clock, Filter } from "lucide-react";

interface Props {
  signals: TradingSignal[];
  onSignalsChange: (s: TradingSignal[]) => void;
}

export default function HistoryView({ signals, onSignalsChange }: Props) {
  const [query, setQuery]   = useState("");
  const [filter, setFilter] = useState<"all" | "sent" | "draft">("all");

  const filtered = signals
    .filter(s => {
      if (filter === "sent")  return !!s.sentMessageId;
      if (filter === "draft") return !s.sentMessageId;
      return true;
    })
    .filter(s => !query || s.symbol.toLowerCase().includes(query.toLowerCase()) || s.action.toLowerCase().includes(query.toLowerCase()));

  const handleDelete = (id: string) => onSignalsChange(signals.filter(s => s.id !== id));
  const handleClearAll = () => { if (confirm("Clear all signal history?")) onSignalsChange([]); };

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <History className="w-5 h-5 text-slate-400" />
          <h2 className="text-base font-bold text-white">Signal History</h2>
          <span className="text-[10px] text-slate-500 bg-slate-800 px-2 py-0.5 rounded-full">{signals.length}</span>
        </div>
        {signals.length > 0 && (
          <button onClick={handleClearAll} className="text-[10px] text-rose-400 hover:text-rose-300 flex items-center gap-1">
            <Trash2 className="w-3 h-3" /> Clear all
          </button>
        )}
      </div>

      {/* Search + filter */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-slate-500" />
          <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search signals..."
            className="w-full pl-8 pr-3 py-2 text-xs bg-slate-900 border border-slate-800 focus:border-slate-600 rounded-xl text-slate-100 placeholder-slate-600 outline-none" />
        </div>
        <div className="flex gap-1">
          {(["all", "sent", "draft"] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-2.5 py-2 text-[10px] font-medium rounded-lg capitalize transition-all ${filter === f ? "bg-emerald-700 text-white" : "bg-slate-800 text-slate-400 hover:text-white"}`}>
              {f}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-12 text-slate-600">
          <History className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm">No signals found</p>
        </div>
      )}

      <div className="space-y-2">
        {filtered.map(s => (
          <div key={s.id} className="bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-xl p-3.5 transition-all">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-xs font-bold text-slate-200">{s.symbol}</p>
                  <span className="text-[9px] font-semibold text-slate-400 bg-slate-800 px-1.5 py-0.5 rounded">{s.action}</span>
                  {s.sentMessageId
                    ? <span className="flex items-center gap-0.5 text-[9px] text-emerald-400"><CheckCircle2 className="w-2.5 h-2.5" />Sent</span>
                    : <span className="flex items-center gap-0.5 text-[9px] text-slate-600"><Clock className="w-2.5 h-2.5" />Draft</span>}
                </div>
                <p className="text-[10px] text-slate-500 mt-1">
                  {new Date(s.createdAt).toLocaleString()}
                  {s.groupNameUsed && ` · ${s.groupNameUsed}`}
                </p>
                {s.formattedText && (
                  <p className="text-[10px] text-slate-600 mt-1 truncate">{s.formattedText.substring(0, 80)}...</p>
                )}
              </div>
              <button onClick={() => handleDelete(s.id)} className="text-slate-700 hover:text-rose-400 transition-colors shrink-0 p-1">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
