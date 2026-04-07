export interface Business {
  id: string;
  name: string;
  agent_active: boolean;
}

export interface Conversation {
  id: string;
  customer_phone: string;
  status: string;            // "ai_handling" | "human_takeover" | "needs_review" | "resolved"
  human_takeover?: boolean;  // optional — derive from status === 'human_takeover' if missing
  last_message_at: string;
  created_at: string;
  last_message?: string;
  unread?: boolean;
  ai_confidence?: number;    // 0–1, latest AI message confidence score
}

export interface Message {
  id: string;
  conversation_id: string;
  body: string;
  direction: 'inbound' | 'outbound';
  sender_type?: string;
  created_at: string;
}

export interface Booking {
  id: string;
  slot_date: string;
  slot_time: string;
  period: string;
  customer_phone: string;
  customer_address: string;
  job_summary: string;
  status: string;
}

export interface ActivityItem {
  type: string;
  label: string;
  status: string;
  time: string;
}

export interface DashboardData {
  revenue_converted: number;
  total_bookings: number;
  total_conversations: number;
  conversion_rate: number;
  active_conversations: number;
  needs_review_count: number;
  time_saved_hours: number;
  agent_active: boolean;
  upcoming_jobs: Booking[];
  recent_activity: ActivityItem[];
}

export interface BrainMessage {
  role: 'user' | 'assistant';
  content: string;
  intent?: string;
  pdf_url?: string;
  document?: Record<string, any>;
}
