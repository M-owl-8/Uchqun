import { MessageSquare, FileText, Calendar, Phone } from 'lucide-react';
import { GlassCard } from './GlassCard';
import { ImageWithFallback } from './figma/ImageWithFallback';

export function ParentsSection() {
  return (
    <div className="space-y-6">
      {/* Parent Connection Card */}
      <GlassCard className="bg-gradient-to-br from-[#F8D7C4]/30 to-[#BFD7EA]/30">
        <div className="flex items-center gap-4 mb-4">
          <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-white shadow-soft">
            <ImageWithFallback
              src="https://images.unsplash.com/photo-1769672773653-c4f5f5c9e4f6?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxwYXJlbnQlMjBjaGlsZCUyMHRvZ2V0aGVyJTIwY2FyaW5nfGVufDF8fHx8MTc3MDE5MTE0M3ww&ixlib=rb-4.1.0&q=80&w=1080"
              alt="Parent"
              className="w-full h-full object-cover"
            />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-[#2E3A59] mb-1">Sarah Johnson</h2>
            <p className="text-sm text-[#5A6B8C]">Primary Caregiver</p>
          </div>
        </div>
        <p className="text-[#5A6B8C] leading-relaxed">
          Stay connected with updates, share notes, and coordinate care together.
        </p>
      </GlassCard>

      {/* Communication Tools */}
      <div>
        <h3 className="text-lg font-semibold text-[#2E3A59] mb-4 px-1">Communication</h3>
        <div className="grid grid-cols-2 gap-4">
          <button className="glass rounded-2xl p-5 flex flex-col items-center text-center hover:shadow-medium transition-all duration-300 active:scale-[0.98]" style={{ minHeight: '120px' }}>
            <div className="w-14 h-14 rounded-xl bg-[#BFD7EA]/30 flex items-center justify-center mb-3">
              <MessageSquare style={{ strokeWidth: 'var(--icon-stroke)' }} size={28} className="text-[#2E3A59]" />
            </div>
            <p className="font-semibold text-[#2E3A59] text-sm">Messages</p>
            <span className="text-xs text-[#5A6B8C] mt-1">3 new</span>
          </button>

          <button className="glass rounded-2xl p-5 flex flex-col items-center text-center hover:shadow-medium transition-all duration-300 active:scale-[0.98]" style={{ minHeight: '120px' }}>
            <div className="w-14 h-14 rounded-xl bg-[#E8C27E]/30 flex items-center justify-center mb-3">
              <Phone style={{ strokeWidth: 'var(--icon-stroke)' }} size={28} className="text-[#2E3A59]" />
            </div>
            <p className="font-semibold text-[#2E3A59] text-sm">Call</p>
            <span className="text-xs text-[#5A6B8C] mt-1">Quick connect</span>
          </button>
        </div>
      </div>

      {/* Recent Updates */}
      <div>
        <h3 className="text-lg font-semibold text-[#2E3A59] mb-4 px-1">Recent Updates</h3>
        <div className="space-y-3">
          <GlassCard>
            <div className="flex gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#DFF4EC] flex items-center justify-center flex-shrink-0">
                <FileText style={{ strokeWidth: 'var(--icon-stroke)' }} size={20} className="text-[#2E3A59]" />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-[#2E3A59] mb-1">Daily Report</p>
                <p className="text-sm text-[#5A6B8C] mb-2">Emma had a wonderful day with lots of engagement during activities.</p>
                <p className="text-xs text-[#8C9BB5]">2 hours ago</p>
              </div>
            </div>
          </GlassCard>

          <GlassCard>
            <div className="flex gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#F8D7C4] flex items-center justify-center flex-shrink-0">
                <Calendar style={{ strokeWidth: 'var(--icon-stroke)' }} size={20} className="text-[#2E3A59]" />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-[#2E3A59] mb-1">Appointment Reminder</p>
                <p className="text-sm text-[#5A6B8C] mb-2">Physical therapy session scheduled for tomorrow at 10:00 AM.</p>
                <p className="text-xs text-[#8C9BB5]">Yesterday</p>
              </div>
            </div>
          </GlassCard>
        </div>
      </div>

      {/* Emergency Contact */}
      <GlassCard className="bg-gradient-to-br from-[#E8C27E]/20 to-[#F8D7C4]/20 border-2 border-[#E8C27E]/30">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-[#5A6B8C] mb-1">Emergency Contact</p>
            <p className="font-semibold text-[#2E3A59]">Available 24/7</p>
          </div>
          <button
            className="flex items-center justify-center w-14 h-14 rounded-xl bg-[#E8C27E] hover:bg-[#E8C27E]/90 transition-all duration-300 active:scale-95"
            aria-label="Emergency call"
          >
            <Phone style={{ strokeWidth: 'var(--icon-stroke)' }} size={24} className="text-white" />
          </button>
        </div>
      </GlassCard>
    </div>
  );
}
