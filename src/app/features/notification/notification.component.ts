import { Component, Input, Output, EventEmitter, signal } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface NotificationItem {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
}

@Component({
  selector: 'app-notification',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './notification.component.html',
  styleUrl: './notification.component.css'
})
export class NotificationComponent {
  @Input() notifications: NotificationItem[] = [];
  @Output() dismiss = new EventEmitter<string>();
  @Output() markRead = new EventEmitter<string>();
  @Output() clearAll = new EventEmitter<void>();

  isOpen = signal(false);

  get unreadCount(): number {
    return this.notifications.filter(n => !n.read).length;
  }

  toggle(): void {
    this.isOpen.update(v => !v);
  }

  close(): void {
    this.isOpen.set(false);
  }

  onDismiss(id: string): void {
    this.dismiss.emit(id);
  }

  onMarkRead(id: string): void {
    this.markRead.emit(id);
  }

  onClearAll(): void {
    this.clearAll.emit();
  }

  getIcon(type: string): string {
    const icons: Record<string, string> = {
      info: 'ℹ️',
      success: '✅',
      warning: '⚠️',
      error: '🚨'
    };
    return icons[type] || 'ℹ️';
  }

  getColor(type: string): string {
    const colors: Record<string, string> = {
      info: 'border-l-blue-500',
      success: 'border-l-green-500',
      warning: 'border-l-yellow-500',
      error: 'border-l-red-500'
    };
    return colors[type] || 'border-l-gray-500';
  }

  formatTime(date: Date): string {
    return new Date(date).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  }
}
