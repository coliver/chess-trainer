import { Component, OnInit, inject } from '@angular/core';
import { Opening, OpeningsService } from '../../core/openings.service';
import { AuthService } from '../../core/auth.service';

@Component({
  selector: 'app-dashboard',
  template: `
    <main class="page">
      <header class="head">
        <h1>Openings</h1>
        <p class="subtitle">
          Served by Angular, data from the same <code>/api</code> backend as the React app.
        </p>
      </header>

      @if (loading) {
        <p>Loading openings…</p>
      } @else if (error) {
        <p class="error" role="alert">{{ error }}</p>
      } @else {
        <p class="count">{{ items.length }} openings</p>
        <ul class="grid">
          @for (o of items; track o.eco) {
            <li class="tile">
              <div class="eco">{{ o.eco }}</div>
              <div class="name">{{ o.name }}</div>
              <div class="pgn">{{ o.pgn }}</div>
            </li>
          }
        </ul>
      }
    </main>
  `,
  styles: [
    `
      .page {
        max-width: 960px;
        margin: 0 auto;
        padding: 2rem 1rem;
      }
      .head h1 {
        margin: 0 0 0.25rem;
      }
      .subtitle {
        margin: 0 0 1rem;
        color: var(--muted);
      }
      .count {
        color: var(--muted);
        font-size: 0.9rem;
      }
      .grid {
        list-style: none;
        margin: 0;
        padding: 0;
        display: grid;
        gap: 0.75rem;
        grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
      }
      .tile {
        border: 1px solid var(--border);
        border-radius: 12px;
        padding: 0.9rem 1rem;
        background: var(--surface);
      }
      .eco {
        font-size: 0.75rem;
        letter-spacing: 0.06em;
        color: var(--accent);
        font-weight: 600;
      }
      .name {
        font-weight: 600;
        margin: 0.15rem 0 0.35rem;
      }
      .pgn {
        font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
        font-size: 0.85rem;
        color: var(--muted);
      }
      .error {
        color: #dc2626;
      }
    `,
  ],
})
export class DashboardComponent implements OnInit {
  private readonly openingsService = inject(OpeningsService);
  private readonly auth = inject(AuthService);

  items: Opening[] = [];
  loading = true;
  error: string | null = null;

  get username(): string | null {
    return this.auth.username;
  }

  ngOnInit(): void {
    this.openingsService.getOpenings().subscribe({
      next: (data) => {
        this.items = data;
        this.loading = false;
      },
      error: () => {
        this.error = 'Failed to load openings';
        this.loading = false;
      },
    });
  }
}
