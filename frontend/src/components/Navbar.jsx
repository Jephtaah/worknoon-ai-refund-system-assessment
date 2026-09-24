import { NavLink } from 'react-router-dom';
import { HandCoins, LayoutDashboard, FileText } from 'lucide-react';

export default function Navbar() {
  return (
    <header className="bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <HandCoins className="w-6 h-6 text-primary" />
        </div>
        <nav className="flex items-center gap-2">
          <NavLink
            to="/"
            end
            className={({ isActive }) =>
              `inline-flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-secondary text-secondary-foreground'
                  : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50'
              }`
            }
          >
            <FileText className="w-4 h-4" />
            Request Refund
          </NavLink>
          <NavLink
            to="/admin"
            className={({ isActive }) =>
              `inline-flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-secondary text-secondary-foreground'
                  : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50'
              }`
            }
          >
            <LayoutDashboard className="w-4 h-4" />
            Admin Dashboard
          </NavLink>
        </nav>
      </div>
    </header>
  );
}
