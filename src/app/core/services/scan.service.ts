import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import { ScanResult } from '../models/ticket.model';

@Injectable({ providedIn: 'root' })
export class ScanService {
  private api = inject(ApiService);

  /**
   * Scan a ticket by its ID
   */
  scanByTicketId(ticketId: string, eventId?: string, location?: string): Observable<ScanResult> {
    return this.api.post(`scan/${ticketId}`, { location, eventId });
  }

  /**
   * Scan a ticket by QR code data (from camera or manual input)
   */
  scanByQR(qrCode: string, eventId?: string, location?: string): Observable<ScanResult> {
    return this.api.post('scan/qr', { qrCode, location, eventId });
  }

  /**
   * Validate a ticket without actually scanning it
   */
  validateTicket(ticketId: string): Observable<{ isValid: boolean; reason?: string }> {
    return this.api.get(`scan/validate/${ticketId}`);
  }
}
