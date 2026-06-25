export type SignalStatus = "ACTIVE" | "TP1_HIT" | "TP2_HIT" | "TP3_HIT" | "SL_HIT" | "CLOSED";

export interface SignalUpdate {
  id: string;
  updateType: string;
  text: string;
  sentMessageId: string;
  timestamp: string;
}

export interface TradingSignal {
  id: string;
  assetClass: string;
  symbol: string;
  action: string;
  entry: string;
  tp1: string;
  tp2: string;
  tp3: string;
  sl: string;
  userNotes: string;
  formattedText: string;
  rationale: string;
  status: SignalStatus;
  sentMessageId: string | null;
  groupIdUsed: string | null;
  groupNameUsed: string | null;
  createdAt: string;
  updateHistory: SignalUpdate[];
}

export interface WhatsAppConfig {
  apiToken: string;          // Whapi.Cloud API token
  groupId: string;           // WhatsApp group ID (from Whapi)
  groupName: string;         // Display name of the group
  isConnected: boolean;
  enableScannerBroadcast?: boolean;
  enableManualBroadcast?: boolean;
}

export interface SiteConfig {
  siteName: string;
  promoUrl: string;
  botName: string;
  botSignature: string;
  hashtags: string;
  bots: string[];
}

export interface ConnectedGroup {
  id: string;               // stable uuid key
  apiToken: string;
  groupId: string;
  groupName: string;
  isActive: boolean;
  connectedAt: string;
  lastSignalAt: string | null;
  totalSignalsSent: number;
  siteName?: string;
  promoUrl?: string;
  botName?: string;
}
