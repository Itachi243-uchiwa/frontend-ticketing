export enum UserRole {
  PARTICIPANT = 'PARTICIPANT',
  ORGANIZER = 'ORGANIZER',
  ADMIN = 'ADMIN',
  STAFF = 'STAFF'
}

export interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: UserRole;
  phone?: string;
  isEmailVerified: boolean;
  isActive: boolean;
  createdAt: Date;
  UpdateAt: Date;
}

export interface UserProfile extends User {
  fullName: string;
}
