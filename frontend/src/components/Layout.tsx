import { Outlet, Link, useLocation, Navigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Sparkles, Archive, LogOut } from 'lucide-react';
import { LoadingSpinner } from '@/components/ui/Loading';

export function Layout() {
  const { isAuthenticated, isLoading, logout } = useAuth();
  const location = useLocation();

  // Show loading while checking auth
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface-alt">
        <LoadingSpinner />
      </div>
    );
  }

  // If not authenticated and not on login page, redirect to login
  if (!isAuthenticated && location.pathname !== '/login') {
    return <Navigate to="/login" replace />;
  }

  // If authenticated and on login page, redirect to home
  if (isAuthenticated && location.pathname === '/login') {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="min-h-screen flex flex-col bg-surface-alt">
      {/* Header - only show when authenticated */}
      {isAuthenticated && (
        <header className="bg-surface border-b border-border sticky top-0 z-40">
          <div className="max-w-4xl mx-auto px-4 h-14 flex items-center justify-between" dir="ltr">
            <Link
              to="/"
              className="flex items-center gap-2 font-bold text-lg text-text no-underline"
            >
              <Sparkles className="w-5 h-5 text-primary" />
              <span>Ask Samer</span>
            </Link>

            <nav className="flex items-center gap-1">
              <Link
                to="/"
                className={`px-3 py-1.5 rounded-lg text-sm font-medium no-underline transition-colors ${
                  location.pathname === '/'
                    ? 'bg-primary-light text-primary'
                    : 'text-text-secondary hover:text-text hover:bg-surface-elevated'
                }`}
              >
                إنشاء
              </Link>

              <Link
                to="/saved"
                className={`px-3 py-1.5 rounded-lg text-sm font-medium no-underline transition-colors flex items-center gap-1.5 ${
                  location.pathname === '/saved'
                    ? 'bg-primary-light text-primary'
                    : 'text-text-secondary hover:text-text hover:bg-surface-elevated'
                }`}
              >
                <Archive className="w-4 h-4" />
                المحفوظات
              </Link>

              <button
                onClick={() => logout()}
                className="px-3 py-1.5 rounded-lg text-sm font-medium text-text-secondary hover:text-text hover:bg-surface-elevated transition-colors flex items-center gap-1.5 cursor-pointer bg-transparent border-0"
              >
                <LogOut className="w-4 h-4" />
                خروج
              </button>
            </nav>
          </div>
        </header>
      )}

      {/* Main content */}
      <main className="flex-1">
        <div className="max-w-4xl mx-auto px-4 py-8">
          <Outlet />
        </div>
      </main>

      {/* Footer */}
      <footer className="py-6 text-center">
        <p className="text-xs text-text-secondary/50">
          Ask Samer — Powered by AI
        </p>
      </footer>
    </div>
  );
}
