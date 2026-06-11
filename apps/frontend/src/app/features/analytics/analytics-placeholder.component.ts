import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-analytics',
  standalone: true,
  imports: [],
  template: `<div class="page"><div class="container">
    <h1>Analytics</h1>
    @if (summary) {
      <div class="stats-grid">
        <div class="stat-card"><h3>{{ summary.totalProjects }}</h3><p>Projects</p></div>
        <div class="stat-card"><h3>{{ summary.totalVideos }}</h3><p>Videos</p></div>
        <div class="stat-card"><h3>{{ summary.totalComments }}</h3><p>Comments</p></div>
        <div class="stat-card"><h3>{{ summary.percentResolved }}%</h3><p>Resolved</p></div>
        <div class="stat-card"><h3>{{ summary.percentApproved }}%</h3><p>Approved</p></div>
      </div>
    } @else {
      <p>Loading...</p>
    }
  </div></div>`,
})
export class AnalyticsPlaceholderComponent implements OnInit {
  summary: any = null;
  constructor(private http: HttpClient) {}
  ngOnInit() {
    this.http.get(`${environment.apiUrl}/dashboard/summary`).subscribe({
      next: (s) => this.summary = s,
    });
  }
}
