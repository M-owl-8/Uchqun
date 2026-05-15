import { Calendar, Edit2, Maximize2, Play, Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { getProxyUrl } from './mediaUtils';

const MediaCard = ({ item, isTeacher, onSelect, onEdit, onDelete }) => {
  const { t, i18n } = useTranslation();

  const locale = (() => {
    if (i18n.language === 'uz') return 'uz-UZ';
    if (i18n.language === 'ru') return 'ru-RU';
    return 'en-US';
  })();

  const typeLabels = {
    photo: t('mediaPage.photoLabel'),
    video: t('mediaPage.videoLabel'),
  };

  return (
    <div
      onClick={() => onSelect(item)}
      className="group relative bg-white rounded-[2rem] overflow-hidden shadow-sm hover:shadow-2xl transition-all duration-500 cursor-pointer border border-gray-100"
    >
      <div className="relative aspect-[4/5] overflow-hidden">
        {item.type === 'video' ? (
          <div className="relative w-full h-full">
            <video
              src={getProxyUrl(item.url, item.id)}
              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
              muted
              loop
              playsInline
              onMouseEnter={(e) => { e.target.play().catch(() => {}); }}
              onMouseLeave={(e) => { e.target.pause(); e.target.currentTime = 0; }}
              onError={(_e) => {}}
            />
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-16 h-16 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center group-hover:scale-110 transition-transform duration-300 border border-white/30 shadow-lg">
                <Play className="w-8 h-8 text-white fill-current" />
              </div>
            </div>
          </div>
        ) : (
          <img
            src={getProxyUrl(item.url || item.imageUrl || item.photoUrl, item.id)}
            alt={item.title}
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
            onError={(e) => { e.target.style.display = 'none'; }}
          />
        )}

        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-6 text-white pointer-events-none">
          <p className="text-xs font-bold uppercase tracking-widest text-primary-400 mb-1">
            {typeLabels[item.type] || item.type}
          </p>
          <h3 className="text-lg font-bold leading-tight">{item.title}</h3>
        </div>

        {isTeacher && (
          <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={(e) => onEdit(item, e)}
              className="bg-primary-500/90 hover:bg-primary-600 backdrop-blur-md p-2 rounded-xl text-white transition-colors"
              title="Edit"
            >
              <Edit2 className="w-4 h-4" />
            </button>
            <button
              onClick={(e) => onDelete(item.id, e)}
              className="bg-red-500/90 hover:bg-red-600 backdrop-blur-md p-2 rounded-xl text-white transition-colors"
              title="Delete"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        )}

        <div className="absolute top-4 left-4 bg-white/10 backdrop-blur-md p-2 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity">
          <Maximize2 className="w-4 h-4 text-white" />
        </div>
      </div>

      <div className="p-5">
        <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest text-gray-400">
          <span className="flex items-center gap-1">
            <Calendar className="w-3 h-3" /> {new Date(item.date).toLocaleDateString(locale)}
          </span>
        </div>
      </div>
    </div>
  );
};

export default MediaCard;
