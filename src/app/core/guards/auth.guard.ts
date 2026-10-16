import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthSessionService } from '../services/auth-session.service';

export const requireAuthGuard: CanActivateFn = () => {
  const session = inject(AuthSessionService);
  const router = inject(Router);
  if (session.isAuthenticated()) return true;
  session.destroy();
  return router.createUrlTree(['/login']);
};

export const requireLocalGuard: CanActivateFn = () => {
  const session = inject(AuthSessionService);
  const router = inject(Router);
  if (!session.isAuthenticated()) {
    session.destroy();
    return router.createUrlTree(['/login']);
  }
  return session.hasLocalContext() ? true : router.createUrlTree(['/seleccion']);
};
