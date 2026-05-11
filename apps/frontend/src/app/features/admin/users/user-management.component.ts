import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';

import { ManagedUser, UserService } from '../../../core/services/user.service';

@Component({
  selector: 'app-user-management',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './user-management.component.html',
  styleUrls: ['./user-management.component.css']
})
export class UserManagementComponent implements OnInit {
  users: ManagedUser[] = [];
  isLoading = false;
  error: string | null = null;
  showForm = false;
  editingUser: ManagedUser | null = null;
  userForm: FormGroup;

  constructor(
    private userService: UserService,
    private fb: FormBuilder
  ) {
    this.userForm = this.fb.group({
      name: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      password: [''],
      role: ['client', Validators.required],
      isActive: [true],
    });
  }

  ngOnInit() {
    this.loadUsers();
  }

  loadUsers() {
    this.isLoading = true;
    this.error = null;
    this.userService.getUsers().subscribe({
      next: (users) => {
        this.users = users;
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Failed to load users:', error);
        this.error = 'Users could not be loaded.';
        this.isLoading = false;
      }
    });
  }

  startCreate() {
    this.editingUser = null;
    this.showForm = true;
    this.userForm.reset({ role: 'client', isActive: true });
    this.userForm.get('password')?.setValidators([Validators.required, Validators.minLength(6)]);
    this.userForm.get('password')?.updateValueAndValidity();
  }

  startEdit(user: ManagedUser) {
    this.editingUser = user;
    this.showForm = true;
    this.userForm.patchValue({
      name: user.name,
      email: user.email,
      password: '',
      role: user.role,
      isActive: user.isActive,
    });
    this.userForm.get('password')?.clearValidators();
    this.userForm.get('password')?.updateValueAndValidity();
  }

  saveUser() {
    if (this.userForm.invalid) {
      return;
    }

    const value = this.userForm.value;
    const request = this.editingUser
      ? this.userService.updateUser(this.editingUser.id, {
          name: value.name,
          email: value.email,
          role: value.role,
          isActive: value.isActive,
        })
      : this.userService.createUser({
          name: value.name,
          email: value.email,
          password: value.password,
          role: value.role,
        });

    request.subscribe({
      next: () => {
        this.cancelForm();
        this.loadUsers();
      },
      error: (error) => {
        console.error('Failed to save user:', error);
        this.error = error?.error?.message || 'User could not be saved.';
      }
    });
  }

  toggleActive(user: ManagedUser) {
    this.userService.updateUser(user.id, { isActive: !user.isActive }).subscribe({
      next: () => this.loadUsers(),
      error: (error) => {
        console.error('Failed to update user:', error);
        this.error = 'User status could not be updated.';
      }
    });
  }

  deleteUser(user: ManagedUser) {
    if (!confirm(`Delete ${user.email}? This cannot be undone.`)) {
      return;
    }
    this.userService.deleteUser(user.id).subscribe({
      next: () => this.loadUsers(),
      error: (error) => {
        console.error('Failed to delete user:', error);
        this.error = 'User could not be deleted.';
      }
    });
  }

  cancelForm() {
    this.showForm = false;
    this.editingUser = null;
    this.userForm.reset({ role: 'client', isActive: true });
  }
}
