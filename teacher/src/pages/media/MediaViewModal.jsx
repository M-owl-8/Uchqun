import { Calendar, ChevronLeft, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import VideoPlayer from './VideoPlayer';
import { getProxyUrl } from './mediaUtils';

const MediaViewModal = ({ selectedMedia, onClose }) => {
  const { t, i18n } = useTranslation();

  const locale = (() => {
    if (i18n.language === 'uz') return 'uz-UZ';
    if (i18n.language === 'ru') return 'ru-RU';
    return 'en-US';
  })();

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-8 animate-in fade-in duration-300">
      <div
        className="absolute inset-0 bg-slate-900/95 backdrop-blur-xl"
        onClick={onClose}
      />

      <div className="relative w-full max-w-6xl bg-surface rounded-[2.5rem] overflow-hidden shadow-2xl flex flex-col lg:flex-row max-h-[90vh] h-[90vh]">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 bg-black/20 hover:bg-black/40 text-white p-2 rounded-full backdrop-blur-md lg:hidden"
        >
          <X className="w-6 h-6" />
        </button>

        <div className="flex-[2] bg-black flex items-center justify-center overflow-hidden relative w-full h-full">
          {selectedMedia.type === 'video' ? (
            <VideoPlayer
              url={getProxyUrl(selectedMedia.url, selectedMedia.id)}
              autoPlay={true}
              onEnded={onClose}
            />
          ) : (
            <img
              src={getProxyUrl(selectedMedia.url || selectedMedia.imageUrl || selectedMedia.photoUrl, selectedMedia.id)}
              alt={selectedMedia.title}
              className="max-w-full max-h-full object-contain"
              onError={(e) => { e.target.style.display = 'none'; }}
            />
          )}
        </div>

        <div className="flex-1 p-8 lg:p-12 overflow-y-auto bg-surface">
          <button
            onClick={onClose}
            className="hidden lg:flex items-center gap-2 text-slate-400 hover:text-brand-600 font-bold text-sm mb-10 transition-colors"
          >
            <ChevronLeft className="w-5 h-5" /> {t('mediaPage.back')}
          </button>

          <div className="space-y-6">
            <div>
              <span className="px-4 py-1.5 bg-brand-50 text-brand-600 rounded-full text-[10px] font-black uppercase tracking-widest">
                {selectedMedia.type === 'video' ? t('mediaPage.videoLabel') : t('mediaPage.photoLabel')}
              </span>
              <h3 className="text-3xl font-black text-slate-900 mt-4 leading-tight">
                {selectedMedia.title}
              </h3>
            </div>

            <p className="text-slate-600 leading-relaxed text-lg">
              {selectedMedia.description}
            </p>

            <div className="pt-8 border-t border-slate-100">
              <div className="flex items-center gap-3">
                <div className="bg-slate-100 p-3 rounded-2xl">
                  <Calendar className="w-6 h-6 text-slate-400" />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{t('mediaPage.date')}</p>
                  <p className="text-slate-900 font-bold">
                    {new Date(selectedMedia.date).toLocaleDateString(locale, {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MediaViewModal;
