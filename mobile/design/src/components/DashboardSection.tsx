import { Heart, Sparkles, Users, UtensilsCrossed } from 'lucide-react';
import { GlassCard } from './GlassCard';
import { QuickActionCard } from './QuickActionCard';
import { ActivityCard } from './ActivityCard';

export function DashboardSection() {
  return (
    <div className="space-y-6">
      {/* Welcome Card */}
      <GlassCard className="bg-gradient-to-br from-[#BFD7EA]/30 to-[#DFF4EC]/30">
        <div className="flex items-start justify-between mb-4">
          <div>
            <p className="text-sm text-[#5A6B8C] mb-1">Good morning,</p>
            <h2 className="text-2xl font-semibold text-[#2E3A59]">Emma's Journey</h2>
          </div>
          <div className="flex items-center justify-center w-12 h-12 rounded-full bg-[#E8C27E]/20">
            <Heart style={{ strokeWidth: 'var(--icon-stroke)' }} size={24} className="text-[#E8C27E] fill-[#E8C27E]" />
          </div>
        </div>
        <p className="text-[#5A6B8C] leading-relaxed">
          Emma has completed 3 activities today. Great progress!
        </p>
      </GlassCard>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 gap-4">
        <GlassCard className="text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-[#DFF4EC] mb-3">
            <Sparkles style={{ strokeWidth: 'var(--icon-stroke)' }} size={24} className="text-[#2E3A59]" />
          </div>
          <p className="text-2xl font-semibold text-[#2E3A59] mb-1">12</p>
          <p className="text-sm text-[#5A6B8C]">Activities</p>
        </GlassCard>

        <GlassCard className="text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-[#F8D7C4] mb-3">
            <Heart style={{ strokeWidth: 'var(--icon-stroke)' }} size={24} className="text-[#2E3A59]" />
          </div>
          <p className="text-2xl font-semibold text-[#2E3A59] mb-1">8h</p>
          <p className="text-sm text-[#5A6B8C]">Care Time</p>
        </GlassCard>
      </div>

      {/* Quick Actions */}
      <div>
        <h3 className="text-lg font-semibold text-[#2E3A59] mb-4 px-1">Quick Actions</h3>
        <div className="space-y-3">
          <QuickActionCard
            icon={UtensilsCrossed}
            title="Log Meal"
            subtitle="Track today's nutrition"
            color="#E8C27E"
          />
          <QuickActionCard
            icon={Sparkles}
            title="Start Activity"
            subtitle="Begin a new session"
            color="#DFF4EC"
          />
          <QuickActionCard
            icon={Users}
            title="Parent Notes"
            subtitle="View updates from caregivers"
            color="#BFD7EA"
          />
        </div>
      </div>

      {/* Recent Activities */}
      <div>
        <h3 className="text-lg font-semibold text-[#2E3A59] mb-4 px-1">Recent Activities</h3>
        <div className="space-y-4">
          <ActivityCard
            title="Physical Therapy"
            time="Completed 2 hours ago"
            image="https://images.unsplash.com/photo-1628137138287-a3aaaab4cc66?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxoYXBweSUyMGRpc2FibGVkJTIwY2hpbGQlMjBwbGF5aW5nJTIwYWN0aXZpdGllc3xlbnwxfHx8fDE3NzAxOTExNDJ8MA&ixlib=rb-4.1.0&q=80&w=1080"
            category="Therapy"
            categoryColor="#DFF4EC"
          />
          <ActivityCard
            title="Healthy Snack Time"
            time="30 minutes ago"
            image="https://images.unsplash.com/photo-1758874961075-f30645db3966?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxoZWFsdGh5JTIwY29sb3JmdWwlMjBraWRzJTIwbWVhbCUyMGZvb2R8ZW58MXx8fHwxNzcwMTkxMTQyfDA&ixlib=rb-4.1.0&q=80&w=1080"
            category="Nutrition"
            categoryColor="#E8C27E"
          />
        </div>
      </div>
    </div>
  );
}
