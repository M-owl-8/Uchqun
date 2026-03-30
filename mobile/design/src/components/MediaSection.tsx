import { Image, Video, Music, FileText, Smile, Heart } from 'lucide-react';
import { GlassCard } from './GlassCard';

interface MediaItem {
  id: string;
  title: string;
  type: 'photo' | 'video' | 'audio' | 'document';
  date: string;
  icon: typeof Image;
  color: string;
  thumbnail?: string;
}

const mediaItems: MediaItem[] = [
  {
    id: '1',
    title: 'Morning Activities',
    type: 'photo',
    date: 'Today',
    icon: Image,
    color: '#BFD7EA',
  },
  {
    id: '2',
    title: 'Music Therapy Session',
    type: 'video',
    date: 'Today',
    icon: Video,
    color: '#DFF4EC',
  },
  {
    id: '3',
    title: 'Favorite Songs Playlist',
    type: 'audio',
    date: 'Yesterday',
    icon: Music,
    color: '#E8C27E',
  },
  {
    id: '4',
    title: 'Progress Report - January',
    type: 'document',
    date: '2 days ago',
    icon: FileText,
    color: '#F8D7C4',
  },
  {
    id: '5',
    title: 'Art Project Photos',
    type: 'photo',
    date: '3 days ago',
    icon: Image,
    color: '#BFD7EA',
  },
  {
    id: '6',
    title: 'Physical Therapy Video',
    type: 'video',
    date: '1 week ago',
    icon: Video,
    color: '#DFF4EC',
  },
];

const categories = [
  { name: 'Photos', icon: Image, color: '#BFD7EA', count: 156 },
  { name: 'Videos', icon: Video, color: '#DFF4EC', count: 42 },
  { name: 'Audio', icon: Music, color: '#E8C27E', count: 28 },
  { name: 'Documents', icon: FileText, color: '#F8D7C4', count: 15 },
];

export function MediaSection() {
  return (
    <div className="space-y-6">
      {/* Gallery Header */}
      <GlassCard className="bg-gradient-to-br from-[#BFD7EA]/30 to-[#DFF4EC]/30">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xl font-semibold text-[#2E3A59]">Emma's Gallery</h2>
          <div className="flex items-center gap-1">
            <Heart style={{ strokeWidth: 'var(--icon-stroke)' }} size={20} className="text-[#E8C27E] fill-[#E8C27E]" />
            <Smile style={{ strokeWidth: 'var(--icon-stroke)' }} size={20} className="text-[#2E3A59]" />
          </div>
        </div>
        <p className="text-sm text-[#5A6B8C] leading-relaxed">
          Cherished moments, progress tracking, and memories to treasure forever.
        </p>
      </GlassCard>

      {/* Category Grid */}
      <div>
        <h3 className="text-lg font-semibold text-[#2E3A59] mb-4 px-1">Categories</h3>
        <div className="grid grid-cols-2 gap-4">
          {categories.map((category) => {
            const Icon = category.icon;
            return (
              <button
                key={category.name}
                className="glass rounded-2xl p-5 text-center hover:shadow-medium transition-all duration-300 active:scale-[0.98]"
                style={{ minHeight: '120px' }}
              >
                <div
                  className="inline-flex items-center justify-center w-14 h-14 rounded-xl mb-3"
                  style={{ backgroundColor: `${category.color}40` }}
                >
                  <Icon style={{ strokeWidth: 'var(--icon-stroke)' }} size={28} className="text-[#2E3A59]" />
                </div>
                <p className="font-semibold text-[#2E3A59] mb-1">{category.name}</p>
                <p className="text-sm text-[#5A6B8C]">{category.count} items</p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Recent Media */}
      <div>
        <div className="flex items-center justify-between mb-4 px-1">
          <h3 className="text-lg font-semibold text-[#2E3A59]">Recent Media</h3>
          <button className="text-sm font-medium text-[#2E3A59] hover:text-[#E8C27E] transition-colors">
            View All
          </button>
        </div>

        <div className="space-y-3">
          {mediaItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                className="w-full glass rounded-2xl p-4 flex items-center gap-4 text-left hover:shadow-medium transition-all duration-300 active:scale-[0.98]"
                style={{ minHeight: '80px' }}
              >
                <div
                  className="flex items-center justify-center rounded-xl flex-shrink-0"
                  style={{
                    width: '56px',
                    height: '56px',
                    backgroundColor: `${item.color}40`,
                  }}
                >
                  <Icon
                    style={{ strokeWidth: 'var(--icon-stroke)' }}
                    size={24}
                    className="text-[#2E3A59]"
                  />
                </div>

                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-[#2E3A59] mb-1">{item.title}</h3>
                  <div className="flex items-center gap-2">
                    <span className="text-xs px-2 py-1 rounded-full bg-white/50 text-[#5A6B8C] capitalize">
                      {item.type}
                    </span>
                    <span className="text-xs text-[#8C9BB5]">{item.date}</span>
                  </div>
                </div>

                <div className="text-[#8C9BB5]">
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor">
                    <path d="M7 4l6 6-6 6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Upload Button */}
      <button className="w-full glass rounded-2xl p-5 flex items-center justify-center gap-3 hover:shadow-medium transition-all duration-300 active:scale-[0.98] bg-gradient-to-r from-[#E8C27E]/10 to-[#F8D7C4]/10 border-2 border-dashed border-[#E8C27E]/30">
        <div className="w-12 h-12 rounded-xl bg-[#E8C27E]/20 flex items-center justify-center">
          <Image style={{ strokeWidth: 'var(--icon-stroke)' }} size={24} className="text-[#2E3A59]" />
        </div>
        <div className="text-left">
          <p className="font-semibold text-[#2E3A59]">Add New Media</p>
          <p className="text-sm text-[#5A6B8C]">Photos, videos, or documents</p>
        </div>
      </button>
    </div>
  );
}
