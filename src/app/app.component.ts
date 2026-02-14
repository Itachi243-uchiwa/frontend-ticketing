import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router';
import { StateService } from './core/services/state.service';
import { HeaderComponent } from './layout/header/header.component';
import { FooterComponent } from './layout/footer/footer.component';
import { LoaderComponent } from './shared/components/loader/loader.component';
import { ToastComponent } from './shared/components/toast/toast.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule,
    RouterOutlet,
    HeaderComponent,
    FooterComponent,
    LoaderComponent,
    ToastComponent
  ],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent {
  private state = inject(StateService);

  readonly loading = this.state.loading;
  readonly error = this.state.error;

  // ✅ CORRECTION: Plus besoin de ngOnInit
  // L'initialisation se fait maintenant via APP_INITIALIZER dans app.config.ts

  closeError(): void {
    this.state.clearError();
  }
}
