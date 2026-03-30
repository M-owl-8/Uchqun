import { ImageWithFallback } from './figma/ImageWithFallback';

interface ActivityCardProps {
  title: string;
  time: string;
  image: string;
  category: string;
  categoryColor: string;
}

export function ActivityCard({ title, time, image, category, categoryColor }: ActivityCardProps) {
  return (
    <div className="glass rounded-2xl overflow-hidden hover:shadow-medium transition-all duration-300">
      <div className="relative h-40 overflow-hidden">
        <ImageWithFallback
          src={image}
          alt={title}
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#2E3A59]/60 to-transparent" />
        <div
          className="absolute top-3 right-3 px-3 py-1 rounded-full text-xs font-medium backdrop-blur-md"
          style={{
            backgroundColor: `${categoryColor}90`,
            color: '#FFFFFF',
          }}
        >
          {category}
        </div>
      </div>

      <div className="p-4">
        <h3 className="font-semibold text-[#2E3A59] mb-1">{title}</h3>
        <p className="text-sm text-[#5A6B8C]">{time}</p>
      </div>
    </div>
  );
}
