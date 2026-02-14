export enum TicketTypeCategory {
  FREE = 'FREE',
  PAID = 'PAID',
  VIP = 'VIP',
  EARLY_BIRD = 'EARLY_BIRD',
  REGULAR = 'REGULAR'
}

export enum TicketStatus {
  VALID = 'VALID',
  USED = 'USED',
  CANCELLED = 'CANCELLED',
  EXPIRED = 'EXPIRED'
}

export interface TicketType {
  id: string;
  name: string;
  description?: string;
  category: TicketTypeCategory;
  price: number;
  quantity: number;
  sold: number;
  salesStartDate?: Date;
  salesEndDate?: Date;
  maxPerOrder?: number;
  minPerOrder?: number;
  displayOrder: number;
  isActive: boolean;
  eventId: string;
  createdAt: Date;
  updatedAt: Date;
  available?: number;
  isSoldOut?: boolean;
  isOnSale?: boolean;
}

export interface CreateTicketTypeDto {
  name: string;
  description?: string;
  category: TicketTypeCategory;
  price: number;
  quantity: number;
  salesStartDate?: Date;
  salesEndDate?: Date;
  maxPerOrder?: number;
  minPerOrder?: number;
  displayOrder?: number;
}

export interface Ticket {
  id: string;
  ticketNumber: string;
  qrCode: string;
  qrCodeHash?: string;
  qrImageUrl?: string;  // ✅ Cloudinary URL for QR image
  pdfUrl?: string;       // ✅ Cloudinary URL for ticket PDF
  status: TicketStatus;
  scannedAt?: Date;
  scannedBy?: string;
  ticketType: TicketType;
  ticketTypeId: string;
  orderId: string;
  eventId: string;
  userId: string;
  event?: {
    id: string;
    name: string;
    startDate: Date;
    endDate: Date;
    location: string;
    venue?: string;
    primaryColor?: string;
    secondaryColor?: string;
  };
  user?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

/**
 * ✅ FIX: ScanResult now matches backend response exactly
 */
export interface ScanResult {
  success: boolean;
  message: string;
  ticket?: {
    id: string;
    qrCode: string;
    status: string;
    scannedAt?: Date;
    scannedBy?: string;
    event?: {
      id: string;
      name: string;
      startDate: Date;
      location: string;
    };
    ticketType?: {
      id: string;
      name: string;
      category: string;
    };
    user?: {
      id: string;
      firstName: string;
      lastName: string;
      email: string;
    };
  };
  scanType: 'FIRST_SCAN' | 'ALREADY_SCANNED' | 'INVALID' | 'FRAUD';
  fraudAlert?: boolean;
  timestamp: number;
}
