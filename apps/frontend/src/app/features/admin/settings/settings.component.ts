import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';

import { ApplicationSettings, SettingsService } from '../../../core/services/settings.service';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [CommonModule, RouterModule, ReactiveFormsModule, MatSlideToggleModule],
  templateUrl: './settings.html',
  styleUrl: './settings.css'
})
export class SettingsComponent implements OnInit {
  public settingsLoading: boolean = false;
  public settingsError: string | null = null;
  public settings: ApplicationSettings | null = null;
  public settingsForm: FormGroup;
  public isSaving = false;
  public saveMessage: string | null = null;

  constructor(
    private settingsService: SettingsService,
    private fb: FormBuilder
  ) {
    this.settingsForm = this.fb.group({
      timelineMarkerSize: ['comfortable'],
      defaultCommentFilter: ['all'],
      autoplayOnLoad: [false],
      showProviderBadge: [true],
    });
  }

  ngOnInit() {
    this.loadSettings();
  }

  loadSettings() {
    this.settingsLoading = true;
    this.settingsError = null;

    this.settingsService.getSettings().subscribe({
      next: (status) => {
        this.settings = status;
        this.patchSettingsForm(status);
        this.settingsLoading = false;
      },
      error: (error) => {
        console.error('Failed to load settings:', error);
        this.settingsError = 'Settings unavailable.';
        this.settingsLoading = false;
      }
    });
  }

  saveSettings() {
    if (!this.settings || this.settingsForm.invalid || this.isSaving) {
      return;
    }

    this.isSaving = true;
    this.saveMessage = null;
    const rawValue = this.settingsForm.getRawValue();
    const editableKeys = new Set([
      'timelineMarkerSize',
      'defaultCommentFilter',
      'autoplayOnLoad',
      'showProviderBadge',
    ]);
    const payload = Object.fromEntries(
      Object.entries(rawValue).filter(([key, value]) => {
        if (!editableKeys.has(key)) {
          return false;
        }
        return value !== '';
      })
    );

    this.settingsService.updateSettings(payload).subscribe({
      next: (settings) => {
        this.settings = settings;
        this.saveMessage = 'Settings saved.';
        this.isSaving = false;
      },
      error: (error) => {
        console.error('Failed to save settings:', error);
        this.settingsError = error?.error?.message || 'Settings could not be saved.';
        this.isSaving = false;
      }
    });
  }

  private patchSettingsForm(status: ApplicationSettings) {
    this.settingsForm.patchValue({
      timelineMarkerSize: status.timelineMarkerSize,
      defaultCommentFilter: status.defaultCommentFilter,
      autoplayOnLoad: status.autoplayOnLoad,
      showProviderBadge: status.showProviderBadge,
    }, { emitEvent: false });

  }
}
