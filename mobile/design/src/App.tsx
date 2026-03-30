import { useState } from 'react';
import { LayoutDashboard, Users, Sparkles, UtensilsCrossed, Image } from 'lucide-react';
import { NatureBackground } from './components/NatureBackground';
import { Header } from './components/Header';
import { BottomNav, NavItem } from './components/BottomNav';
import { DashboardSection } from './components/DashboardSection';
import { ParentsSection } from './components/ParentsSection';
import { ActivitiesSection } from './components/ActivitiesSection';
import { MealsSection } from './components/MealsSection';
import { MediaSection } from './components/MediaSection';

const navItems: NavItem[] = [
  { id: 'dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { id: 'parents', icon: Users, label: 'Parents' },
  { id: 'activities', icon: Sparkles, label: 'Activities' },
  { id: 'meals', icon: UtensilsCrossed, label: 'Meals' },
  { id: 'media', icon: Image, label: 'Media' },
];

const sectionTitles: Record<string, string> = {
  dashboard: 'Dashboard',
  parents: 'Parent Hub',
  activities: 'Activities',
  meals: 'Nutrition',
  media: 'Media Gallery',
};

export default function App() {
  const [activeSection, setActiveSection] = useState('dashboard');

  const renderSection = () => {
    switch (activeSection) {
      case 'dashboard':
        return <DashboardSection />;
      case 'parents':
        return <ParentsSection />;
      case 'activities':
        return <ActivitiesSection />;
      case 'meals':
        return <MealsSection />;
      case 'media':
        return <MediaSection />;
      default:
        return <DashboardSection />;
    }
  };

  return (
    <div className="min-h-screen bg-[#F4EDE2] relative">
      {/* Nature-themed background with floating decorations */}
      <NatureBackground />

      {/* Main Content */}
      <div className="relative z-10 max-w-md mx-auto min-h-screen flex flex-col">
        {/* Header */}
        <Header title={sectionTitles[activeSection]} />

        {/* Content Area with bottom padding for nav */}
        <main className="flex-1 px-5 pb-28">
          {renderSection()}
        </main>

        {/* Bottom Navigation */}
        <BottomNav
          items={navItems}
          activeItem={activeSection}
          onItemClick={setActiveSection}
        />
      </div>
    </div>
  );
}
