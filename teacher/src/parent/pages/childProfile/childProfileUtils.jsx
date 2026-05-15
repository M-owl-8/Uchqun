import { ChevronRight } from 'lucide-react';

export const InfoItem = ({ label, value, icon: Icon, color = 'text-primary-500' }) => (
  <div className="group">
    <label className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2 block">{label}</label>
    <div className="flex items-center gap-3">
      <div className="p-2.5 rounded-xl bg-gray-50 group-hover:scale-110 transition-transform duration-200">
        <Icon className={`w-5 h-5 ${color}`} />
      </div>
      <p className="text-gray-900 font-bold text-lg">{value}</p>
    </div>
  </div>
);

export const StatRow = ({ label, value, color }) => (
  <div className="flex items-center justify-between cursor-pointer hover:opacity-80 transition-opacity">
    <div className="flex items-center gap-3">
      <div className={`w-2.5 h-2.5 rounded-full ${color}`} />
      <span className="text-gray-300 text-sm font-medium">{label}</span>
    </div>
    <div className="flex items-center gap-2">
      <span className="text-xl font-black text-white">{value}</span>
      <ChevronRight className="w-4 h-4 text-gray-400" />
    </div>
  </div>
);
