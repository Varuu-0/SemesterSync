import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import {
  GraduationCap, Calendar, LayoutDashboard, Upload, Sparkles, Menu, LogOut, User, Palette, Check
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";

const navItems = [
  { id: 'upload', label: 'Upload', icon: Upload },
  { id: 'calendar', label: 'Calendar', icon: Calendar },
  { id: 'planner', label: 'Planner', icon: LayoutDashboard },
];

export default function Header({ activeTab, onTabChange }) {
  const { user, logout } = useAuth();
  const { themeId, setTheme, themes } = useTheme();

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between px-4 sm:px-6 mx-auto max-w-7xl">
        {/* Logo */}
        <div className="flex items-center gap-2 font-bold text-lg tracking-tight">
          <div className="relative flex h-8 w-8 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
            <GraduationCap size={18} />
          </div>
          <div className="hidden sm:flex items-center">
            <span>Semester</span>
            <span className="text-primary">Sync</span>
          </div>
          <span className="ml-1 inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
            <Sparkles size={10} /> AI
          </span>
        </div>

        {/* Desktop Nav */}
        <nav className="hidden md:flex items-center gap-1">
          {navItems.map(({ id, label, icon: Icon }) => (
            <Button
              key={id}
              variant={activeTab === id ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => onTabChange(id)}
              className="gap-2"
            >
              <Icon size={16} />
              {label}
            </Button>
          ))}
        </nav>

        {/* Actions container */}
        <div className="flex items-center gap-2">
          {/* Theme Picker */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full">
                <Palette size={18} />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Theme</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {Object.values(themes).map((theme) => (
                <DropdownMenuItem key={theme.id} onClick={() => setTheme(theme.id)} className="flex items-center justify-between cursor-pointer">
                  <div className="flex items-center gap-2">
                    <span>{theme.emoji}</span>
                    <span>{theme.name}</span>
                  </div>
                  {themeId === theme.id && <Check size={14} />}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* User profile */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-9 w-9 rounded-full overflow-hidden">
                {user?.picture ? (
                  <img src={user.picture} alt={user.name} referrerPolicy="no-referrer" className="h-full w-full object-cover" />
                ) : (
                  <div className="h-full w-full flex items-center justify-center bg-muted">
                    <User size={16} className="text-muted-foreground" />
                  </div>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none">{user?.name || 'Guest'}</p>
                  <p className="text-xs leading-none text-muted-foreground">{user?.email}</p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={logout} className="text-destructive focus:bg-destructive focus:text-destructive-foreground cursor-pointer">
                <LogOut size={16} className="mr-2" />
                <span>Sign out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          
          {/* Mobile Nav Toggle via Dropdown */}
          <div className="md:hidden">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-9 w-9">
                  <Menu size={20} />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                {navItems.map(({ id, label, icon: Icon }) => (
                  <DropdownMenuItem key={id} onClick={() => onTabChange(id)} className="cursor-pointer">
                    <Icon size={16} className="mr-2" />
                    <span className={activeTab === id ? 'font-medium text-primary' : ''}>{label}</span>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </header>
  );
}
