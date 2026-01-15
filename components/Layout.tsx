
import React from 'react';
import { UserType } from '../types';
import { LogOut, User as UserIcon, Bell, Home, MapPin, History, Wallet, Settings } from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
  userType: UserType;
  userName: string;
  onLogout: () => void;
  activeTab: string;
  onTabChange: (tab: string) => void;
}

const Layout: React.FC<LayoutProps> = ({ children, userType, userName, onLogout, activeTab, onTabChange }) => {
  const getNavItems = () => {
    switch (userType) {
      case 'passenger':
        return [
          { id: 'home', icon: Home, label: 'Book Ride' },
          { id: 'history', icon: History, label: 'History' },
        ];
      case 'rider':
        return [
          { id: 'home', icon: MapPin, label: 'Available' },
          { id: 'earnings', icon: Wallet, label: 'Earnings' },
          { id: 'settings', icon: Settings, label: 'Profile' },
        ];
      case 'admin':
        return [
          { id: 'dashboard', icon: Home, label: 'Dashboard' },
          { id: 'users', icon: UserIcon, label: 'Users' },
          { id: 'reports', icon: Bell, label: 'Reports' },
        ];
      default:
        return [];
    }
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-gray-50">
      {/* Mobile Header */}
      <div className="md:hidden flex items-center justify-between p-4 bg-yellow-400 shadow-sm sticky top-0 z-50">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-black rounded-full flex items-center justify-center">
            <span className="text-yellow-400 font-bold">M</span>
          </div>
          <h1 className="font-bold text-lg">MotoRide</h1>
        </div>
        <button onClick={onLogout} className="p-2 bg-white/20 rounded-full">
          <LogOut size={20} />
        </button>
      </div>

      {/* Sidebar (Desktop) */}
      <aside className="hidden md:flex flex-col w-64 bg-white border-r border-gray-200 sticky top-0 h-screen">
        <div className="p-6 border-b border-gray-100 flex items-center gap-3">
          <div className="w-10 h-10 bg-black rounded-lg flex items-center justify-center">
            <span className="text-yellow-400 font-black text-xl italic">M</span>
          </div>
          <div>
            <h1 className="font-black text-xl italic tracking-tighter">MOTORIDE</h1>
            <p className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">{userType} PORTAL</p>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-2">
          {getNavItems().map((item) => (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                activeTab === item.id 
                  ? 'bg-yellow-400 text-black font-semibold shadow-md shadow-yellow-200' 
                  : 'text-gray-500 hover:bg-gray-100 hover:text-black'
              }`}
            >
              <item.icon size={20} />
              <span>{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-gray-100">
          <div className="flex items-center gap-3 mb-4 px-2">
            <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 font-bold overflow-hidden">
               <img src={`https://picsum.photos/seed/${userName}/40/40`} alt="Avatar" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm truncate">{userName}</p>
              <p className="text-xs text-green-600 flex items-center gap-1">
                <span className="w-1.5 h-1.5 bg-green-500 rounded-full"></span>
                Online
              </p>
            </div>
          </div>
          <button
            onClick={onLogout}
            className="w-full flex items-center gap-3 px-4 py-3 text-red-500 hover:bg-red-50 rounded-xl transition-colors font-medium"
          >
            <LogOut size={20} />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 relative flex flex-col h-screen overflow-y-auto">
        <header className="hidden md:flex h-16 bg-white border-b border-gray-200 items-center justify-between px-8 sticky top-0 z-40">
           <div className="flex items-center gap-4">
              <h2 className="text-lg font-semibold text-gray-800 capitalize">{activeTab}</h2>
           </div>
           <div className="flex items-center gap-4">
              <button className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-full transition-all">
                <Bell size={20} />
              </button>
              <div className="h-8 w-[1px] bg-gray-200"></div>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-yellow-400 border-2 border-white shadow-sm flex items-center justify-center font-bold text-xs uppercase">
                  {userName.substring(0, 2)}
                </div>
              </div>
           </div>
        </header>

        <div className="p-4 md:p-8 flex-1">
          {children}
        </div>

        {/* Mobile Bottom Nav */}
        <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 flex items-center justify-around p-3 z-50">
          {getNavItems().map((item) => (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              className={`flex flex-col items-center gap-1 ${
                activeTab === item.id ? 'text-yellow-600' : 'text-gray-400'
              }`}
            >
              <item.icon size={22} />
              <span className="text-[10px] font-medium uppercase tracking-tighter">{item.label}</span>
            </button>
          ))}
        </nav>
      </main>
    </div>
  );
};

export default Layout;
