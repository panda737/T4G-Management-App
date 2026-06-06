import { ShieldAlert, GraduationCap, ClipboardList, Calendar } from 'lucide-react';
import type { UpcomingEvent } from './constants';

const TYPE_CONFIG = {
  drill:      { Icon: ShieldAlert,    dot: 'bg-amber-500',  bg: 'bg-amber-50',  text: 'text-amber-600' },
  inspection: { Icon: ClipboardList,  dot: 'bg-blue-500',   bg: 'bg-blue-50',   text: 'text-blue-600' },
  training:   { Icon: GraduationCap,  dot: 'bg-sky-500',    bg: 'bg-sky-50',    text: 'text-sky-600' },
};

export default function UpcomingEventsWidget({ events }: { events: UpcomingEvent[] }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 sm:p-5 flex flex-col">
      <div className="flex items-center gap-2.5 mb-4">
        <div className="p-2 rounded-lg bg-gray-100 text-gray-600"><Calendar size={16} /></div>
        <h2 className="font-semibold text-gray-900 text-sm">Upcoming Events</h2>
        <span className="ml-auto text-[10px] text-gray-400 font-medium uppercase tracking-wider">Next 14 days</span>
      </div>

      {events.length === 0 ? (
        <div className="flex-1 flex items-center justify-center py-6">
          <p className="text-sm text-gray-400 text-center">No events scheduled in the next 2 weeks.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {events.map((ev) => {
            const cfg = TYPE_CONFIG[ev.type];
            const d = new Date(ev.date + 'T00:00:00');
            const dateLabel = d.toLocaleDateString('en-ZA', { weekday: 'short', day: 'numeric', month: 'short' });
            return (
              <div key={ev.id} className="flex items-center gap-3 py-1">
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${cfg.bg}`}>
                  <cfg.Icon size={13} className={cfg.text} />
                </div>
                <p className="text-xs font-medium text-gray-800 truncate flex-1">{ev.label}</p>
                <span className="text-[11px] text-gray-500 flex-shrink-0 whitespace-nowrap">{dateLabel}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
