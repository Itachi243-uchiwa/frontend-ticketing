import {
  Component,
  OnInit,
  OnDestroy,
  inject,
  signal,
  computed,
  ViewChild,
  ElementRef,
  AfterViewInit,
  ChangeDetectionStrategy,
  NgZone,
  PLATFORM_ID,
} from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ScanService } from '../../core/services/scan.service';
import { EventsService } from '../../core/services/events.service';
import { StaffService } from '../../core/services/staff.service';
import { OfflineSyncService } from '../../core/services/offline-sync.service';
import { StateService } from '../../core/services/state.service';
import { ToastService } from '../../core/services/toast.service';
import { ScanResult } from '../../core/models/ticket.model';
import { Event } from '../../core/models/event.model';
import { UserRole } from '../../core/models/user.model';

interface ScanHistoryEntry {
  id: string;
  eventName: string;
  ticketHolder: string;
  ticketType: string;
  result: 'success' | 'already_scanned' | 'invalid' | 'fraud';
  message: string;
  timestamp: Date;
}

@Component({
  selector: 'app-scan',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule],
  templateUrl: './scan.component.html',
  styleUrl: './scan.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ScanComponent implements OnInit, OnDestroy, AfterViewInit {
  private scanService = inject(ScanService);
  private eventsService = inject(EventsService);
  private staffService = inject(StaffService);
  private offlineSync = inject(OfflineSyncService);
  private state = inject(StateService);
  private toast = inject(ToastService);
  private ngZone = inject(NgZone);
  private platformId = inject(PLATFORM_ID);

  @ViewChild('videoElement') videoRef!: ElementRef<HTMLVideoElement>;
  @ViewChild('canvasElement') canvasRef!: ElementRef<HTMLCanvasElement>;

  // Event selection
  events = signal<Event[]>([]);
  selectedEvent = signal<Event | null>(null);
  loadingEvents = signal(true);

  // Camera & scanning
  cameraActive = signal(false);
  scanning = signal(false);
  lastResult = signal<ScanResult | null>(null);
  resultStatus = signal<'idle' | 'success' | 'warning' | 'error'>('idle');
  cameraError = signal<string | null>(null);
  cameraFacing = signal<'environment' | 'user'>('environment');

  // Manual input
  manualInput = signal('');
  showManualInput = signal(false);

  // Stats & history
  history = signal<ScanHistoryEntry[]>([]);
  totalScanned = signal(0);
  showHistory = signal(false);

  // QR library
  private jsQR: any = null;
  private stream: MediaStream | null = null;
  private animFrameId: number | null = null;
  private resultTimeout: any = null;
  private scanCooldown = false;

  isOnline = this.offlineSync.isOnline;
  pendingCount = signal(0);

  userRole = computed(() => this.state.userRole());

  successCount = computed(() =>
    this.history().filter(h => h.result === 'success').length
  );

  ngOnInit(): void {
    if (!isPlatformBrowser(this.platformId)) return;

    // Load scan count from session
    const saved = sessionStorage.getItem('scan_count');
    if (saved) this.totalScanned.set(parseInt(saved, 10));

    // Load events
    this.loadEvents();

    // Preload jsQR library
    this.loadJsQR();
  }

  ngAfterViewInit(): void {
    // Video element is now available if camera is active
  }

  ngOnDestroy(): void {
    this.stopCamera();
  }

  /**
   * Load events the user has access to
   */
  private loadEvents(): void {
    this.loadingEvents.set(true);
    const role = this.state.userRole();

    if (role === UserRole.STAFF) {
      // Staff only sees assigned events
      this.staffService.getAssignedEvents(1, 100).subscribe({
        next: (res) => {
          const raw = (res as any)?.data ?? res;
          this.events.set(raw.events || []);
          this.loadingEvents.set(false);
          // Auto-select if only one event
          if (this.events().length === 1) {
            this.selectedEvent.set(this.events()[0]);
          }
        },
        error: () => {
          this.events.set([]);
          this.loadingEvents.set(false);
        },
      });
    } else {
      // Organizer/Admin sees their events or all events
      const obs =
        role === UserRole.ADMIN
          ? this.eventsService.getAll(1, 100)
          : this.eventsService.getMyEvents(1, 100);

      obs.subscribe({
        next: (res) => {
          const raw = (res as any)?.data ?? res;
          this.events.set(raw.events || []);
          this.loadingEvents.set(false);
          if (this.events().length === 1) {
            this.selectedEvent.set(this.events()[0]);
          }
        },
        error: () => {
          this.events.set([]);
          this.loadingEvents.set(false);
        },
      });
    }
  }

  selectEvent(event: Event): void {
    this.selectedEvent.set(event);
    this.history.set([]);
    this.totalScanned.set(0);
    sessionStorage.setItem('scan_count', '0');
  }

  clearEventSelection(): void {
    this.stopCamera();
    this.selectedEvent.set(null);
    this.history.set([]);
    this.totalScanned.set(0);
  }

  /**
   * Dynamically load jsQR library
   */
  private async loadJsQR(): Promise<void> {
    try {
      const module = await import('jsqr');
      this.jsQR = module.default || module;
    } catch {
      console.warn('jsQR not available. Install with: npm install jsqr');
      // Will show manual input as fallback
    }
  }

  /**
   * Start camera with proper lifecycle
   */
  async startCamera(): Promise<void> {
    if (!this.selectedEvent()) {
      this.toast.warning('Sélectionnez un événement', 'Veuillez d\'abord choisir un événement à scanner');
      return;
    }

    try {
      this.cameraError.set(null);

      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: this.cameraFacing(),
          width: { ideal: 1280, min: 640 },
          height: { ideal: 720, min: 480 },
          frameRate: { ideal: 30, min: 15 },
        },
        audio: false,
      };

      this.stream = await navigator.mediaDevices.getUserMedia(constraints);
      this.cameraActive.set(true);

      // Wait for Angular to render the video element
      await new Promise<void>((resolve) => setTimeout(resolve, 50));

      const video = this.videoRef?.nativeElement;
      if (video && this.stream) {
        video.srcObject = this.stream;
        video.setAttribute('playsinline', 'true');
        video.setAttribute('autoplay', 'true');
        video.muted = true;

        await video.play();
        this.startQRScanLoop();
      }
    } catch (err: any) {
      this.cameraActive.set(false);
      if (err.name === 'NotAllowedError') {
        this.cameraError.set(
          'Accès à la caméra refusé. Autorisez l\'accès dans les paramètres de votre navigateur.'
        );
      } else if (err.name === 'NotFoundError') {
        this.cameraError.set('Aucune caméra trouvée sur cet appareil.');
      } else if (err.name === 'NotReadableError') {
        this.cameraError.set('La caméra est utilisée par une autre application.');
      } else {
        this.cameraError.set('Erreur caméra: ' + err.message);
      }
    }
  }

  stopCamera(): void {
    if (this.animFrameId !== null) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }
    if (this.stream) {
      this.stream.getTracks().forEach((track) => track.stop());
      this.stream = null;
    }
    this.cameraActive.set(false);
  }

  toggleCamera(): void {
    this.cameraFacing.update((f) => (f === 'environment' ? 'user' : 'environment'));
    if (this.cameraActive()) {
      this.stopCamera();
      this.startCamera();
    }
  }

  /**
   * High-performance QR scan loop using requestAnimationFrame
   */
  private startQRScanLoop(): void {
    if (!this.jsQR) {
      // If jsQR not available, show manual input instead
      this.showManualInput.set(true);
      return;
    }

    const video = this.videoRef?.nativeElement;
    const canvas = this.canvasRef?.nativeElement;
    if (!video || !canvas) return;

    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    let frameCount = 0;

    const scanFrame = () => {
      if (!this.cameraActive() || !video || video.readyState < video.HAVE_ENOUGH_DATA) {
        this.animFrameId = requestAnimationFrame(scanFrame);
        return;
      }

      frameCount++;
      // Scan every 3rd frame for performance (10fps scan rate at 30fps video)
      if (frameCount % 3 !== 0) {
        this.animFrameId = requestAnimationFrame(scanFrame);
        return;
      }

      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      if (!this.scanning() && !this.scanCooldown) {
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const code = this.jsQR(imageData.data, imageData.width, imageData.height, {
          inversionAttempts: 'dontInvert',
        });

        if (code?.data) {
          this.ngZone.run(() => {
            this.processQRCode(code.data);
          });
        }
      }

      this.animFrameId = requestAnimationFrame(scanFrame);
    };

    this.animFrameId = requestAnimationFrame(scanFrame);
  }

  /**
   * Process decoded QR code
   */
  processQRCode(qrData: string): void {
    if (this.scanning() || this.scanCooldown) return;
    this.scanning.set(true);
    this.scanCooldown = true;

    // Haptic feedback
    if (navigator.vibrate) {
      navigator.vibrate(50);
    }

    const eventId = this.selectedEvent()?.id;

    // If offline, queue the scan
    if (!this.isOnline()) {
      const pending = this.offlineSync.queueScan(qrData);
      this.pendingCount.set(this.offlineSync.pendingCount);
      this.handleScanResult({
        success: true,
        message: 'Scan enregistré hors-ligne (sera synchronisé)',
        scanType: 'FIRST_SCAN',
        timestamp: Date.now(),
      });
      return;
    }

    this.scanService.scanByQR(qrData, eventId).subscribe({
      next: (response) => {
        // Handle API wrapper: { data: result } or direct result
        const result = (response as any)?.data ?? response;
        this.handleScanResult(result);
      },
      error: (err) => {
        const errResult = err.error?.data ?? err.error;
        this.handleScanResult({
          success: false,
          message: errResult?.message || 'Erreur de scan',
          scanType: errResult?.scanType || 'INVALID',
          ticket: errResult?.ticket,
          timestamp: Date.now(),
        });
      },
    });
  }

  /**
   * Manual scan input
   */
  scanManual(): void {
    const input = this.manualInput().trim();
    if (!input || this.scanning()) return;

    this.scanning.set(true);
    this.scanCooldown = true;

    const eventId = this.selectedEvent()?.id;

    this.scanService.scanByQR(input, eventId).subscribe({
      next: (response) => {
        const result = (response as any)?.data ?? response;
        this.handleScanResult(result);
        this.manualInput.set('');
      },
      error: (err) => {
        // Fallback: try scanning by ticket ID
        this.scanService.scanByTicketId(input, eventId).subscribe({
          next: (response) => {
            const result = (response as any)?.data ?? response;
            this.handleScanResult(result);
            this.manualInput.set('');
          },
          error: (err2) => {
            const errResult = err2.error?.data ?? err2.error;
            this.handleScanResult({
              success: false,
              message: errResult?.message || 'Billet non trouvé',
              scanType: 'INVALID',
              timestamp: Date.now(),
            });
          },
        });
      },
    });
  }

  private handleScanResult(result: ScanResult): void {
    this.lastResult.set(result);

    // Determine status and vibration pattern
    if (result.success && result.scanType === 'FIRST_SCAN') {
      this.resultStatus.set('success');
      if (navigator.vibrate) navigator.vibrate([100, 50, 100]);

      // Play success sound (optional)
      this.playSound('success');
    } else if (result.scanType === 'ALREADY_SCANNED') {
      this.resultStatus.set('warning');
      if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
      this.playSound('warning');
    } else if (result.scanType === 'FRAUD' || result.fraudAlert) {
      this.resultStatus.set('error');
      if (navigator.vibrate) navigator.vibrate([500, 200, 500, 200, 500]);
      this.playSound('error');
    } else {
      this.resultStatus.set('error');
      if (navigator.vibrate) navigator.vibrate(200);
      this.playSound('error');
    }

    // Add to history
    const entry: ScanHistoryEntry = {
      id: Date.now().toString(36),
      eventName: result.ticket?.event?.name || this.selectedEvent()?.name || 'Inconnu',
      ticketHolder: result.ticket?.user
        ? `${result.ticket.user.firstName} ${result.ticket.user.lastName}`
        : '---',
      ticketType: result.ticket?.ticketType?.name || '---',
      result:
        result.scanType === 'FIRST_SCAN'
          ? 'success'
          : result.scanType === 'ALREADY_SCANNED'
            ? 'already_scanned'
            : result.scanType === 'FRAUD'
              ? 'fraud'
              : 'invalid',
      message: result.message,
      timestamp: new Date(),
    };
    this.history.update((h) => [entry, ...h.slice(0, 99)]);

    if (result.success) {
      this.totalScanned.update((v) => v + 1);
      sessionStorage.setItem('scan_count', this.totalScanned().toString());
    }

    // Auto-clear result after delay, ready for next scan
    if (this.resultTimeout) clearTimeout(this.resultTimeout);
    const delay = result.success ? 1500 : 2500;
    this.resultTimeout = setTimeout(() => {
      this.resultStatus.set('idle');
      this.lastResult.set(null);
      this.scanning.set(false);
      this.scanCooldown = false;
    }, delay);
  }

  private playSound(type: 'success' | 'warning' | 'error'): void {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);

      gainNode.gain.value = 0.1;

      if (type === 'success') {
        oscillator.frequency.value = 880;
        oscillator.type = 'sine';
      } else if (type === 'warning') {
        oscillator.frequency.value = 440;
        oscillator.type = 'triangle';
      } else {
        oscillator.frequency.value = 220;
        oscillator.type = 'square';
      }

      oscillator.start();
      oscillator.stop(audioCtx.currentTime + 0.15);
    } catch {
      // Audio not supported
    }
  }

  clearHistory(): void {
    this.history.set([]);
  }

  onManualInput(event: any): void {
    const target = event.target as HTMLInputElement;
    this.manualInput.set(target.value);
  }

  getResultBorderColor(): string {
    switch (this.resultStatus()) {
      case 'success': return 'border-emerald-400 shadow-emerald-500/30';
      case 'warning': return 'border-amber-400 shadow-amber-500/30';
      case 'error': return 'border-red-400 shadow-red-500/30';
      default: return 'border-gray-700';
    }
  }

  getResultBgColor(): string {
    switch (this.resultStatus()) {
      case 'success': return 'bg-emerald-500/10';
      case 'warning': return 'bg-amber-500/10';
      case 'error': return 'bg-red-500/10';
      default: return 'bg-gray-800';
    }
  }

  getResultIcon(): string {
    switch (this.resultStatus()) {
      case 'success': return '✅';
      case 'warning': return '⚠️';
      case 'error': return '❌';
      default: return '📷';
    }
  }

  formatTime(date: Date): string {
    return new Date(date).toLocaleTimeString('fr-FR', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  }

  formatEventDate(date: Date): string {
    return new Date(date).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  }
}
