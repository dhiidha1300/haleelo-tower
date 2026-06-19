'use client';

import { useRef, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import { bookingsAPI, waitingListAPI } from '@/lib/api';
import { usePermission } from '@/lib/permissions';

export default function BookingCalendarPage() {
  const router      = useRouter();
  const calRef      = useRef<InstanceType<typeof FullCalendar>>(null);
  const { hasPermission } = usePermission();
  const canCreate = hasPermission('create-booking');
  const [waiting, setWaiting] = useState(0);
  const canWaitlist = hasPermission('manage-waiting-list');

  useEffect(() => {
    if (canWaitlist) {
      waitingListAPI.list({ status: 'waiting' }).then(r => setWaiting((r.data.waiting_list ?? []).length)).catch(() => {});
    }
  }, [canWaitlist]);

  const fetchEvents = async (info: any, success: (e: any[]) => void, failure: (e: any) => void) => {
    try {
      const res = await bookingsAPI.calendar(info.startStr.slice(0, 10), info.endStr.slice(0, 10));
      success(res.data);
    } catch (err) { failure(err); }
  };

  const goCreate = (date: string, start?: string, end?: string) => {
    if (!canCreate) return;
    const q = new URLSearchParams({ date });
    if (start) q.set('start', start);
    if (end) q.set('end', end);
    router.push(`/dashboard/bookings/create?${q.toString()}`);
  };

  const hhmm = (d: Date) => d.toTimeString().slice(0, 5);

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-bold text-[#1B2D4F]">Booking Calendar</h1>
          <p className="text-gray-600">
            Visual overview of all scheduled bookings
            {canCreate && <span className="text-[#C9A052]"> · click a day or drag a time range to add a booking</span>}
          </p>
        </div>
        <div className="flex gap-3 items-center">
          <div className="flex items-center gap-3 text-xs text-gray-500">
            {[
              { color: '#F59E0B', label: 'Admin Pending' },
              { color: '#F97316', label: 'Finance Review' },
              { color: '#10B981', label: 'Approved' },
              { color: '#9CA3AF', label: 'Draft' },
              { color: '#8B5CF6', label: 'Waitlisted' },
            ].map(({ color, label }) => (
              <span key={label} className="flex items-center gap-1">
                <span className="w-3 h-3 rounded-full inline-block" style={{ backgroundColor: color }} />{label}
              </span>
            ))}
          </div>
          {canWaitlist && waiting > 0 && (
            <button onClick={() => router.push('/dashboard/waiting-list')}
              className="inline-flex items-center gap-1.5 border border-amber-300 bg-amber-50 text-amber-700 font-semibold px-4 py-2 rounded-lg hover:bg-amber-100 transition-colors text-sm">
              ⏳ {waiting} waiting
            </button>
          )}
          <button onClick={() => router.push('/dashboard/bookings')}
            className="border border-[#1B2D4F] text-[#1B2D4F] font-semibold px-4 py-2 rounded-lg hover:bg-[#1B2D4F] hover:text-white transition-colors text-sm">
            ← List View
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 haleelo-cal">
        <FullCalendar
          ref={calRef}
          plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
          initialView="dayGridMonth"
          headerToolbar={{ left: 'prev,next today', center: 'title', right: 'dayGridMonth,timeGridWeek,timeGridDay' }}
          events={fetchEvents}
          selectable={canCreate}
          selectMirror
          dayMaxEvents={4}
          nowIndicator
          height="auto"
          eventDisplay="block"
          slotMinTime="07:00:00"
          slotMaxTime="24:00:00"
          eventTimeFormat={{ hour: '2-digit', minute: '2-digit', hour12: false }}
          dateClick={(info) => goCreate(info.dateStr.slice(0, 10))}
          select={(info) => {
            const date = info.startStr.slice(0, 10);
            if (info.allDay) goCreate(date);
            else goCreate(date, hhmm(info.start), hhmm(info.end));
          }}
          eventClick={(info) => router.push(`/dashboard/bookings/${info.event.id}`)}
        />
      </div>

      {/* Animated, branded calendar styling */}
      <style jsx global>{`
        .haleelo-cal .fc { --fc-border-color: #eef1f6; font-size: 13px; }
        .haleelo-cal .fc .fc-toolbar-title { color: #1B2D4F; font-weight: 700; }
        .haleelo-cal .fc .fc-button-primary {
          background: #1B2D4F; border-color: #1B2D4F; text-transform: capitalize;
          box-shadow: none; transition: background .2s, transform .1s;
        }
        .haleelo-cal .fc .fc-button-primary:hover { background: #0f1d33; }
        .haleelo-cal .fc .fc-button-primary:not(:disabled):active,
        .haleelo-cal .fc .fc-button-primary.fc-button-active { background: #C9A052; border-color: #C9A052; }
        .haleelo-cal .fc .fc-button-primary:focus { box-shadow: 0 0 0 3px rgba(201,160,82,.3); }
        .haleelo-cal .fc .fc-col-header-cell-cushion { color: #64748b; font-weight: 600; text-transform: uppercase; font-size: 11px; padding: 8px 0; }
        .haleelo-cal .fc .fc-daygrid-day.fc-day-today { background: rgba(201,160,82,.10); }
        .haleelo-cal .fc .fc-daygrid-day-number { color: #1B2D4F; padding: 6px 8px; }
        .haleelo-cal .fc .fc-daygrid-day:hover { background: rgba(27,45,79,.04); transition: background .2s; cursor: ${canCreate ? 'pointer' : 'default'}; }
        .haleelo-cal .fc .fc-event {
          border: none; border-radius: 6px; padding: 1px 4px; font-weight: 500;
          box-shadow: 0 1px 2px rgba(0,0,0,.08);
          transition: transform .12s ease, box-shadow .12s ease;
        }
        .haleelo-cal .fc .fc-event:hover { transform: translateY(-1px) scale(1.02); box-shadow: 0 4px 10px rgba(0,0,0,.18); cursor: pointer; }
        .haleelo-cal .fc .fc-highlight { background: rgba(201,160,82,.22); }
        .haleelo-cal .fc .fc-timegrid-now-indicator-line { border-color: #C9A052; }
        .haleelo-cal .fc-daygrid-day-frame, .haleelo-cal .fc-event { animation: calFade .35s ease both; }
        @keyframes calFade { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: none; } }
      `}</style>
    </div>
  );
}
