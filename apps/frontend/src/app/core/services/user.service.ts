import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';

export type UserRole = 'user' | 'super_admin';

export interface ManagedUser {
  id: number;
  name: string;
  email: string;
  role: UserRole;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateManagedUser {
  name: string;
  email: string;
  password: string;
}

export interface UpdateManagedUser {
  name?: string;
  email?: string;
  isActive?: boolean;
}

@Injectable({ providedIn: 'root' })
export class UserService {
  private readonly apiUrl = `${environment.apiUrl}/users`;

  constructor(private http: HttpClient) {}

  getUsers(): Observable<ManagedUser[]> {
    return this.http.get<ManagedUser[]>(this.apiUrl);
  }

  createUser(user: CreateManagedUser): Observable<ManagedUser> {
    return this.http.post<ManagedUser>(this.apiUrl, user);
  }

  updateUser(id: number, user: UpdateManagedUser): Observable<ManagedUser> {
    return this.http.patch<ManagedUser>(`${this.apiUrl}/${id}`, user);
  }

  deleteUser(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
}
