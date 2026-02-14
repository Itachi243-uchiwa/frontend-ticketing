import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import { User, UserRole } from '../models/user.model';

export interface PromoteToStaffDto {
  userId: string;
  eventIds: string[];
}

export interface UsersListResponse {
  users: User[];
  total: number;
  page: number;
  limit: number;
}

@Injectable({
  providedIn: 'root'
})
export class UsersService {
  private api = inject(ApiService);

  getUsers(page: number = 1, limit: number = 10, role?: UserRole): Observable<UsersListResponse> {
    const params: any = { page, limit };
    if (role) {
      params.role = role;
    }
    return this.api.get<UsersListResponse>('users', params);
  }

  /**
   * Récupérer un utilisateur par ID
   */
  getUserById(id: string): Observable<User> {
    return this.api.get<User>(`users/${id}`);
  }

  /**
   * Récupérer le profil de l'utilisateur connecté
   */
  getMe(): Observable<User> {
    return this.api.get<User>('users/me');
  }

  /**
   * Mettre à jour un utilisateur
   */
  updateUser(id: string, data: Partial<User>): Observable<User> {
    return this.api.patch<User>(`users/${id}`, data);
  }

  /**
   * Promouvoir un participant en STAFF avec assignation d'événements
   */
  promoteToStaff(userId: string, eventIds: string[]): Observable<User> {
    return this.api.post<User>('users/promote-to-staff', { userId, eventIds });
  }

  /**
   * Rétrograder un STAFF en PARTICIPANT
   */
  demoteStaff(userId: string): Observable<User> {
    return this.api.post<User>(`users/${userId}/demote-staff`, {});
  }

  /**
   * Activer/désactiver un utilisateur
   */
  toggleActive(userId: string, isActive: boolean): Observable<User> {
    return this.api.patch<User>(`users/${userId}/toggle-active`, { isActive });
  }

  /**
   * Changer le rôle d'un utilisateur (ADMIN uniquement)
   */
  changeRole(userId: string, role: UserRole): Observable<User> {
    return this.api.patch<User>(`users/${userId}/role`, { role });
  }

  /**
   * Supprimer un utilisateur (ADMIN uniquement)
   */
  deleteUser(userId: string): Observable<void> {
    return this.api.delete<void>(`users/${userId}`);
  }
}
