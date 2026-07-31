import { useState } from 'react';
import Sidebar from '../components/sidebar/Sidebar';
import UserProfileDrawer from '../components/UserProfileDrawer';

export default function DashboardLayout({ children }) {
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  const [user, setUser] = useState(() => {
    const savedUser = localStorage.getItem("user");
    if (savedUser) {
      try { return JSON.parse(savedUser); } catch { return null; }
    }
    return null;
  });

  const handleLogout = () => {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    localStorage.removeItem("user");
    setUser(null);
    setIsProfileOpen(false);
    window.location.reload();
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#121315]">
      {/* ১. বামপাশের সাইডবার (lg:pl-72 প্যাডিং দিয়ে মেইন কন্টেন্ট আলাদা থাকবে) */}
      <Sidebar 
        isProfileOpen={isProfileOpen}
        setIsProfileOpen={setIsProfileOpen}
      />

      {/* ২. মাঝখানের মেইন ফরম/ড্যাশবোর্ড (বাম সাইডবারের জায়গা ছেড়ে দেবে) */}
      <div className="flex-1 flex h-full lg:pl-72 overflow-hidden">
        <main className="flex-1 h-full overflow-y-auto p-6 transition-all duration-300">
          {children}
        </main>

        {/* ৩. ডানপাশের নিবেদিত সাইডবার (একদম স্ক্রিনের ডানে স্বাধীনভাবে ওপেন হবে) */}
        <UserProfileDrawer 
          isOpen={isProfileOpen} 
          onClose={() => setIsProfileOpen(false)} 
          user={user}
          onLogout={handleLogout}
        />
      </div>
    </div>
  );
}