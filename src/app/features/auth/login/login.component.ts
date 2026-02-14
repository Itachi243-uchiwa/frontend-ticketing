import {Component, inject} from '@angular/core';
import {FormBuilder, FormGroup, ReactiveFormsModule, Validators} from '@angular/forms';
import {AuthService} from '../../../core/services/auth.service';
import {ActivatedRoute, Router, RouterLink} from '@angular/router';
import {StateService} from '../../../core/services/state.service';
import {CardComponent} from '../../../shared/components/card/card.component';
import {ButtonComponent} from '../../../shared/components/button/button.component';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    ButtonComponent,
    RouterLink
  ],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css'
})
export class LoginComponent {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private state = inject(StateService);

  loginForm: FormGroup;
  isSubmitting!: boolean;
  errorMessage!: '';

  constructor() {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(8)]]
    });
  }

  get email() {
    return this.loginForm.get('email');
  }

  get password() {
    return this.loginForm.get('password');
  }

  onSubmit() {
    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      return;
    }

    this.isSubmitting = true;
    this.errorMessage = '';

    this.authService.login(this.loginForm.value).subscribe({
      next: () => {
        const redirectUrl = this.route.snapshot.queryParams['redirectUrl'] || '/dashboard';
        this.router.navigateByUrl(redirectUrl);
      },
      error: (error) => {
        this.isSubmitting = false;
        this.errorMessage = error.error?.message || 'An error occurred while logging in'
      },
      complete: () => {
        this.isSubmitting = false;
      }
    });
  }

  getFieldError(fieldName: string): string {
    const field = this.loginForm.get(fieldName);
    if (field?.hasError('required') && field?.touched) {
      return 'Ce champ est requis';
    }
    if (field?.hasError('email') && field?.touched) {
      return 'Adresse e-mail invalide';
    }
    if (field?.hasError('minlength') && field?.touched) {
      return 'Le mot de passe doit contenir au moins 8 caractères';
    }
    return '';
  }
}
