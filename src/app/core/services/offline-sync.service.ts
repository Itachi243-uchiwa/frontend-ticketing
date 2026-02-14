import { Injectable, inject, signal } from '@angular/core';
import { ScanService } from './scan.service';
import { ScanResult } from '../models/ticket.model';

export interface PendingScan {
  id: string;
  qrCode: string;
  timestamp: number;
  location?: string;
  synced: boolean;
  result?: ScanResult;
}

/**
 * Manages offline scan queue with deferred sync.
 * Scans performed while offline are queued in localStorage and
 * synced automatically when the connection is restored.
 */
@Injectable({ providedIn: 'root' })
export class OfflineSyncService {
  private scanService = inject(ScanService);
  private readonly QUEUE_KEY = 'offline_scan_queue';

  pendingScans = signal<PendingScan[]>([]);
  isSyncing = signal(false);
  isOnline = signal(navigator.onLine);

  constructor() {
    this.loadQueue();

    window.addEventListener('online', () => {
      this.isOnline.set(true);
      this.syncPendingScans();
    });

    window.addEventListener('offline', () => {
      this.isOnline.set(false);
    });
  }

  /**
   * Queue a scan for later sync when offline
   */
  queueScan(qrCode: string, location?: string): PendingScan {
    const scan: PendingScan = {
      id: this.generateId(),
      qrCode,
      timestamp: Date.now(),
      location,
      synced: false
    };

    this.pendingScans.update(scans => [...scans, scan]);
    this.saveQueue();
    return scan;
  }

  /**
   * Try to sync all pending scans
   */
  async syncPendingScans(): Promise<void> {
    if (this.isSyncing() || !this.isOnline()) return;

    const pending = this.pendingScans().filter(s => !s.synced);
    if (pending.length === 0) return;

    this.isSyncing.set(true);

    for (const scan of pending) {
      try {
        const result = await this.scanService.scanByQR(scan.qrCode, scan.location).toPromise();
        this.pendingScans.update(scans =>
          scans.map(s => s.id === scan.id ? { ...s, synced: true, result: result } : s)
        );
      } catch (error) {
        console.error(`Failed to sync scan ${scan.id}:`, error);
        // Will retry next sync cycle
      }
    }

    this.saveQueue();
    this.isSyncing.set(false);
  }

  /**
   * Get count of unsynced scans
   */
  get pendingCount(): number {
    return this.pendingScans().filter(s => !s.synced).length;
  }

  /**
   * Clear all synced scans from queue
   */
  clearSynced(): void {
    this.pendingScans.update(scans => scans.filter(s => !s.synced));
    this.saveQueue();
  }

  /**
   * Clear entire queue
   */
  clearAll(): void {
    this.pendingScans.set([]);
    this.saveQueue();
  }

  private loadQueue(): void {
    try {
      const data = localStorage.getItem(this.QUEUE_KEY);
      if (data) {
        this.pendingScans.set(JSON.parse(data));
      }
    } catch {
      this.pendingScans.set([]);
    }
  }

  private saveQueue(): void {
    try {
      localStorage.setItem(this.QUEUE_KEY, JSON.stringify(this.pendingScans()));
    } catch {
      console.error('Failed to save offline scan queue');
    }
  }

  private generateId(): string {
    return `scan_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }
}
