import { Injectable, inject, signal, OnDestroy } from '@angular/core';
import { StorageService } from './storage.service';
import { environment } from '../../../environnements/environment';

export interface SocketEvent {
  event: string;
  data: any;
}

@Injectable({ providedIn: 'root' })
export class SocketService implements OnDestroy {
  private storage = inject(StorageService);
  private socket: any = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 2000;
  private reconnectTimer: any = null;
  private listeners = new Map<string, Set<(data: any) => void>>();
  private joinedRooms = new Set<string>();
  private pollingIntervals = new Map<string, any>();

  isConnected = signal(false);
  connectionError = signal<string | null>(null);

  async connect(): Promise<void> {
    if (this.socket?.connected) return;

    const token = this.storage.getToken();
    if (!token) {
      this.connectionError.set('No authentication token');
      return;
    }

    try {
      // Dynamic import socket.io-client
      const { io } = await import('socket.io-client');
      const wsUrl = environment.apiUrl.replace('/api/v1', '');

      this.socket = io(`${wsUrl}/events`, {
        auth: { token },
        transports: ['websocket', 'polling'],
        reconnection: false, // We handle reconnection manually
      });

      this.socket.on('connect', () => {
        this.isConnected.set(true);
        this.connectionError.set(null);
        this.reconnectAttempts = 0;
        // Re-join rooms
        this.joinedRooms.forEach(eventId => {
          this.socket?.emit('joinEvent', { eventId });
        });
      });

      this.socket.on('disconnect', () => {
        this.isConnected.set(false);
        this.attemptReconnect();
      });

      this.socket.on('connect_error', (err: any) => {
        this.connectionError.set(err.message || 'Connection failed');
        this.isConnected.set(false);
        this.attemptReconnect();
      });

      // Relay all events to registered listeners
      this.socket.onAny((event: string, data: any) => {
        const callbacks = this.listeners.get(event);
        if (callbacks) {
          callbacks.forEach(cb => cb(data));
        }
      });
    } catch (err) {
      // Socket.io not available, use polling fallback
      this.connectionError.set('WebSocket not available, using polling fallback');
      this.isConnected.set(false);
    }
  }

  disconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.pollingIntervals.forEach(interval => clearInterval(interval));
    this.pollingIntervals.clear();
    this.socket?.disconnect();
    this.socket = null;
    this.isConnected.set(false);
    this.joinedRooms.clear();
  }

  joinEvent(eventId: string): void {
    this.joinedRooms.add(eventId);
    if (this.socket?.connected) {
      this.socket.emit('joinEvent', { eventId });
    }
  }

  leaveEvent(eventId: string): void {
    this.joinedRooms.delete(eventId);
    if (this.socket?.connected) {
      this.socket.emit('leaveEvent', { eventId });
    }
    const interval = this.pollingIntervals.get(eventId);
    if (interval) {
      clearInterval(interval);
      this.pollingIntervals.delete(eventId);
    }
  }

  on(event: string, callback: (data: any) => void): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);

    // Return unsubscribe function
    return () => {
      this.listeners.get(event)?.delete(callback);
    };
  }

  emit(event: string, data: any): void {
    if (this.socket?.connected) {
      this.socket.emit(event, data);
    }
  }

  private attemptReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      this.connectionError.set('Max reconnection attempts reached');
      return;
    }
    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(1.5, this.reconnectAttempts - 1);
    this.reconnectTimer = setTimeout(() => this.connect(), delay);
  }

  /**
   * Polling fallback: periodically fetch data via HTTP
   */
  startPolling(eventId: string, fetchFn: () => void, intervalMs = 10000): void {
    if (this.pollingIntervals.has(eventId)) return;
    fetchFn(); // Initial fetch
    const interval = setInterval(fetchFn, intervalMs);
    this.pollingIntervals.set(eventId, interval);
  }

  stopPolling(eventId: string): void {
    const interval = this.pollingIntervals.get(eventId);
    if (interval) {
      clearInterval(interval);
      this.pollingIntervals.delete(eventId);
    }
  }

  ngOnDestroy(): void {
    this.disconnect();
  }
}
