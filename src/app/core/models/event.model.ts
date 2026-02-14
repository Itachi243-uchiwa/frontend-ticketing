export enum EventStatus {
  DRAFT = 'DRAFT',
  PUBLISHED = 'PUBLISHED',
  ONGOING = 'ONGOING',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED'
}

export interface Event {
  id: string;
  name: string;
  slug: string;
  description: string;
  coverImage?: string;
  startDate: Date;
  endDate: Date;
  location: string;
  venue?: string;
  capacity: number;
  status: EventStatus;
  primaryColor?: string;
  secondaryColor?: string;
  logo?: string;
  hasMultipleSessions: boolean;
  sessions?: Session[];
  organizer: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  organizerId: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  ticketsSold?: number;
  revenue?: number;
}

export interface Session {
  id: string;
  name: string;
  startDate: Date;
  endDate: Date;
  capacity: number;
}

export interface CreateEventDto {
  name: string;
  description: string;
  startDate: Date;
  endDate: Date;
  location: string;
  venue?: string;
  capacity: number;
  status?: EventStatus;
  primaryColor?: string;
  secondaryColor?: string;
  hasMultipleSessions?: boolean;
  sessions?: Session[];
}
