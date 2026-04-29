import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import useAuthStore from "../store/useAuthStore";
import { auth } from "../lib/firebase";
import { signOut } from "firebase/auth";
import { 
  LayoutDashboard, 
  Users, 
  BookOpen, 
  CalendarCheck, 
  CreditCard,
  LogOut,
  Settings,
  ShieldAlert,
  Home,
  Activity,
  BarChart2,
  CalendarDays,
  ShoppingCart,
  Bell,
  Menu,
  Diamond,
  Wallet
} from "lucide-react";
import { cn } from "../lib/utils";
import { useState, useEffect } from "react";
import NotificationBell from "../components/ui/NotificationBell";

export default function DashboardLayout() {
  const { user, profile } = useAuthStore();
  const location = useLocation();
  const navigate = useNavigate();
  const [isSidebarOpen, setIsSidebarOpen] = useState(window.innerWidth >= 1024);
  const [isAdminSidebarOpen, setIsAdminSidebarOpen] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      if (profile?.role === 'student') {
        if (window.innerWidth >= 1024) setIsSidebarOpen(true);
        else setIsSidebarOpen(false);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [profile?.role]);

  const handleLogout = async () => {
    await signOut(auth);
    navigate("/login");
  };

  const userRole = profile?.role || 'parent';

  // --- STUDENT LAYOUT ---
  if (userRole === 'student') {
    const STUDENT_NAV_ITEMS = [
      { name: "Bosh sahifa",  href: "/dashboard",           icon: Home },
      { name: "Davomat",      href: "/student/attendance",  icon: CalendarCheck },
      { name: "To'lovlar",    href: "/student/payments",    icon: CreditCard },
      { name: "Sozlamalar",   href: "/profile",             icon: Settings },
    ];

    return (
      <div className="min-h-screen bg-[#F8F9FA] flex flex-col font-sans">
        {/* Top Header */}
        <header className="h-[70px] bg-white border-b flex items-center justify-between px-4 lg:px-8 z-10">
          <div className="flex items-center gap-6">
            {/* Logo */}
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 flex items-center justify-center">
                <svg width="32" height="32" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <rect x="25" y="40" width="50" height="40" rx="8" fill="#4ADE80" />
                  <circle cx="38" cy="55" r="5" fill="white" />
                  <circle cx="62" cy="55" r="5" fill="white" />
                  <rect x="42" y="70" width="16" height="4" rx="2" fill="white" />
                  <path d="M35 40V25C35 22.2386 37.2386 20 40 20C42.7614 20 45 22.2386 45 25V40" stroke="#4ADE80" strokeWidth="6" strokeLinecap="round" />
                  <path d="M65 40V25C65 22.2386 62.7614 20 60 20C57.2386 20 55 22.2386 55 25V40" stroke="#4ADE80" strokeWidth="6" strokeLinecap="round" />
                </svg>
              </div>
              <span className="text-2xl font-black tracking-tight text-slate-800">ROBBIT</span>
            </div>

            {/* Hamburger Menu Button */}
            <button 
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="w-10 h-10 rounded-lg bg-[#D4A373] text-white flex items-center justify-center hover:bg-[#c29262] transition-colors ml-4"
            >
              <Menu className="h-5 w-5" />
            </button>
          </div>

          {/* Right User Area */}
          <div className="flex items-center gap-3">
            <span className="text-[15px] font-medium text-slate-700 hidden sm:block">
              {profile?.name || "O'quvchi"}
            </span>
            <NotificationBell />
          </div>
        </header>

        <div className="flex flex-1 overflow-hidden relative">
          {/* Mobile Sidebar Backdrop */}
          {isSidebarOpen && (
            <div 
              className="fixed inset-0 top-[70px] bg-black/20 z-40 lg:hidden"
              onClick={() => setIsSidebarOpen(false)}
            />
          )}

          {/* Sidebar */}
          <aside className={cn(
            "fixed inset-y-0 left-0 top-[70px] lg:top-0 z-50 w-[260px] bg-white border-r flex flex-col py-4 overflow-y-auto transition-transform duration-300 ease-in-out lg:static",
            isSidebarOpen ? "translate-x-0" : "-translate-x-full lg:hidden"
          )}>
            <nav className="flex-1 space-y-2 px-3">
              {STUDENT_NAV_ITEMS.map((item) => {
                const isActive = location.pathname === item.href || (location.pathname === "/" && item.href === "/dashboard");
                return (
                  <Link
                    key={item.name}
                    to={item.href}
                    onClick={() => window.innerWidth < 1024 && setIsSidebarOpen(false)}
                    className={cn(
                      "flex items-center gap-4 rounded-xl px-4 py-3.5 text-[15px] font-medium transition-all",
                      isActive 
                        ? "bg-[#FDF6F0] text-[#D4A373]" 
                        : "text-slate-500 hover:bg-slate-50 hover:text-slate-800"
                    )}
                  >
                    <item.icon className={cn("h-[22px] w-[22px]", isActive ? "text-[#D4A373]" : "text-slate-400")} />
                    {item.name}
                  </Link>
                );
              })}
            </nav>

            <div className="mt-auto px-3 pt-4">
              <button 
                onClick={handleLogout}
                className="w-full flex items-center gap-4 rounded-xl px-4 py-3.5 text-[15px] font-medium text-red-500 hover:bg-red-50 transition-all"
              >
                <LogOut className="h-[22px] w-[22px]" />
                Chiqish
              </button>
            </div>
          </aside>

          {/* Main Content */}
          <main className="flex-1 overflow-y-auto bg-[#F8F9FA] p-4 lg:p-6 pb-20 lg:pb-6">
            <Outlet />
          </main>
        </div>

        {/* Student Bottom Nav (mobile) */}
        <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-100 z-50 flex items-center justify-around px-1 shadow-[0_-2px_12px_rgba(0,0,0,0.06)]">
          {STUDENT_NAV_ITEMS.map((item) => {
            const isActive = location.pathname === item.href || location.pathname.startsWith(item.href + '/');
            return (
              <Link
                key={item.name}
                to={item.href}
                className={cn(
                  "flex flex-col items-center justify-center py-2.5 px-3 gap-1 transition-colors flex-1",
                  isActive ? "text-[#D4A373]" : "text-slate-400 hover:text-slate-600"
                )}
              >
                <item.icon className="h-[22px] w-[22px]" />
                <span className="text-[10px] font-medium leading-tight">{item.name}</span>
              </Link>
            );
          })}
        </div>
      </div>
    );
  }

  // --- ORIGINAL BOGCHA CRM LAYOUT ---
  const ADMIN_NAV_ITEMS = [
    { name: "Bosh sahifa",       href: "/dashboard",      icon: LayoutDashboard, roles: ['owner', 'admin', 'teacher', 'parent', 'student'] },
    { name: "O'quvchilar",       href: "/students",       icon: Users,            roles: ['owner', 'admin', 'teacher'] },
    { name: "Guruhlar",          href: "/groups",         icon: BookOpen,         roles: ['owner', 'admin'] },
    { name: "Davomat",           href: "/attendance",     icon: CalendarCheck,    roles: ['owner', 'admin', 'teacher'] },
    { name: "To'lovlar",         href: "/payments",       icon: CreditCard,       roles: ['owner', 'admin'] },
    { name: "Xarajatlar",        href: "/expenses",       icon: Wallet,           roles: ['owner', 'admin'] },
    { name: "Bildirishnoma",     href: "/notifications/send", icon: Bell,         roles: ['owner', 'admin', 'teacher'] },
    { name: "Foydalanuvchilar",  href: "/users",          icon: ShieldAlert,      roles: ['owner', 'admin'] },
  ];

  const visibleNavItems = ADMIN_NAV_ITEMS.filter(item => item.roles.includes(userRole));

  return (
    <div className="min-h-screen bg-muted/30 flex flex-col md:flex-row relative">
      {/* Mobile Sidebar Backdrop */}
      {isAdminSidebarOpen && (
         <div className="fixed inset-0 bg-black/50 z-40 md:hidden" onClick={() => setIsAdminSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={cn(
        "fixed inset-y-0 left-0 z-50 w-[240px] bg-card border-r flex flex-col gap-2 px-4 py-6 transition-transform duration-300 ease-in-out md:static md:translate-x-0 h-screen",
        isAdminSidebarOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="flex items-center gap-2 px-2 mb-6">
          <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center text-primary-foreground font-bold">
            B
          </div>
          <span className="text-xl font-bold">Bogcha CRM</span>
        </div>
        
        <nav className="flex-1 space-y-1">
          {visibleNavItems.map((item) => {
            const isActive = location.pathname.startsWith(item.href);
            return (
              <Link
                key={item.name}
                to={item.href}
                onClick={() => window.innerWidth < 768 && setIsAdminSidebarOpen(false)}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all",
                  isActive 
                    ? "bg-primary text-primary-foreground" 
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <item.icon className="h-4 w-4" />
                {item.name}
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto border-t pt-4">
          <Link to="/profile" className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-muted transition-colors" onClick={() => window.innerWidth < 768 && setIsAdminSidebarOpen(false)}>
            {profile?.photoURL ? (
              <img src={profile.photoURL} alt="Profile" className="h-10 w-10 rounded-full object-cover border border-border shadow-sm" />
            ) : (
              <div className="h-10 w-10 rounded-full bg-secondary flex items-center justify-center text-secondary-foreground font-semibold">
                {profile?.name?.charAt(0) || "U"}
              </div>
            )}
            <div className="flex-1 overflow-hidden">
              <p className="text-sm font-medium truncate">{profile?.name || "User"}</p>
              <p className="text-xs text-muted-foreground capitalize">{profile?.role || "Parent"}</p>
            </div>
          </Link>
          <button 
            onClick={handleLogout}
            className="w-full flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-all mt-2"
          >
            <LogOut className="h-4 w-4" />
            Logout
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex flex-col flex-1 h-screen overflow-y-auto w-full pb-16 md:pb-0">
        <header className="md:hidden flex h-14 items-center gap-3 border-b bg-card px-4 shrink-0 sticky top-0 z-30">
          <button onClick={() => setIsAdminSidebarOpen(true)} className="p-2 -ml-2 text-muted-foreground hover:text-foreground">
             <Menu className="h-5 w-5" />
          </button>
          <span className="font-bold">Bogcha CRM</span>
        </header>
        <div className="flex-1 p-4 md:p-8">
          <Outlet />
        </div>
      </main>

      {/* Mobile Bottom Navigation */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-card border-t border-border z-40 flex items-center justify-around px-2 pb-safe shadow-[0_-4px_10px_rgba(0,0,0,0.05)]">
        {visibleNavItems.slice(0, 5).map((item) => {
          const isActive = location.pathname.startsWith(item.href) || (location.pathname === "/" && item.href === "/dashboard");
          return (
            <Link
              key={item.name}
              to={item.href}
              className={cn(
                "flex flex-col items-center justify-center py-2 px-1 min-w-[60px] gap-1 transition-colors",
                isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <item.icon className={cn("h-5 w-5", isActive && "fill-primary/20")} />
              <span className="text-[10px] leading-tight truncate w-full text-center font-medium">{item.name}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
