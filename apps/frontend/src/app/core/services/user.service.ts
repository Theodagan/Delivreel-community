import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';

export interface ManagedUser {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'client';
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateManagedUser {
  name: string;
  email: string;
  password: string;
  role: 'admin' | 'client';
}

export interface UpdateManagedUser {
  name?: string;
  email?: string;
  role?: 'admin' | 'client';
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

  updateUser(id: string, user: UpdateManagedUser): Observable<ManagedUser> {
    return this.http.patch<ManagedUser>(`${this.apiUrl}/${id}`, user);
  }

  deleteUser(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
}
