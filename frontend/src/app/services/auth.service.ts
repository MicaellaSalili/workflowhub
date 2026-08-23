import { Injectable, signal, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { User, UserRole } from '../models/document.model';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private http = inject(HttpClient);
  
  // Active demo user state
  public currentUser = signal<User>({
    id: '11111111-1111-1111-1111-111111111111',
    email: 'sarah.submitter@workflowhub.dev',
    fullName: 'Sarah Jenkins (Senior Eng)',
    role: UserRole.Submitter,
    department: 'Product Engineering'
  });

  public availableUsers = signal<User[]>([]);

  getAvailableUsers(): Observable<User[]> {
    return this.http.get<User[]>('/api/auth/users').pipe(
      tap(users => this.availableUsers.set(users))
    );
  }

  switchUser(user: User): void {
    this.currentUser.set(user);
    console.log(`[Auth] Switched active user to: ${user.fullName} (${user.role})`);
  }

  isReviewer(): boolean {
    const role = this.currentUser().role;
    return role === UserRole.Reviewer || role === UserRole.Admin;
  }
}
