export interface LiveStats {
  eventId: string;
  totalTickets: number;
  ticketsSold: number;
  ticketsScanned: number;
  totalRevenue: number;
  attendanceRate: number;
  remainingCapacity: number;
  timestamp: number;
}

export interface EntriesFlow {
  eventId: string;
  period: number;
  data: Array<{
    minute: string;
    count: number;
  }>;
}

export interface HeatmapData {
  eventId: string;
  heatmap: Array<{
    hour: number;
    entries: number;
    revenue: number;
  }>;
}

export interface Alert {
  id: string;
  type: 'capacity' | 'fraud' | 'attendance' | 'traffic' | 'info';
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  message: string;
  timestamp: number;
  acknowledged: boolean;
}

export interface DashboardData {
  eventId: string;
  liveStats: LiveStats;
  entriesFlow: EntriesFlow;
  heatmap: HeatmapData;
  alerts: Alert[];
  timestamp: number;
}
