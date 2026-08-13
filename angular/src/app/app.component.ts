import { Component, inject } from '@angular/core';
import { RouterLink, RouterOutlet } from '@angular/router';
import { AuthService } from './core/auth.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css',
})
export class AppComponent {
  private readonly auth = inject(AuthService);

  get isLoggedIn(): boolean {
    return this.auth.isLoggedIn;
  }

  get username(): string | null {
    return this.auth.username;
  }

  logout(): void {
    this.auth.logout();
    // Relative navigation keeps us under the /angular/ base href.
    location.assign('login');
  }
}
