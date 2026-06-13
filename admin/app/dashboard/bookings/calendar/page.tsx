'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import { bookingsAPI } from '@/lib/api';

export default function BookingCalendarPage() {
  const router      = useRouter();
  const calRef      = useRef<InstanceType<typeof FullCalendar>>(null);
  const [loading, setLoading] = useState(false);

  const fetchEvents = async (info: any, successCallback: (events: any[]) => void, failureCallback: (error: any) => void) => {
    try {
      const res = await bookingsAPI.calendar(info.startStr.slice(0, 10), info.endStr.slice(0, 10));
      successCallback(res.data);
    } catch (err) {
      failureCallback(err);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-[#1B2D4F]">Booking Calendar</h1>
          <p className="text-gray-600">Visual overview of all scheduled bookings</p>
        </div>
        <div className="flex gap-3 items-center">
          {/* Legend */}
          <div className="flex items-center gap-3 text-xs text-gray-500">
            {[
              { color: '#F59E0B', label: 'Admin Pending' },
              { color: '#F97316', label: 'Finance Review' },
              { color: '#10B981', label: 'Approved' },
              { color: '#9CA3AF', label: 'Draft' },
              { color: '#8B5CF6', label: 'Waitlisted' },
            ].map(({ color, label }) => (
              <span key={label} className="flex items-center gap-1">
                <span className="w-3 h-3 rounded-full inline-block" style={{ backgroundColor: color }} />
                {label}
              </span>
            ))}
          </div>
          <button onClick={() => router.push('/dashboard/bookings')}
            className="border border-[#1B2D4F] text-[#1B2D4F] font-semibold px-4 py-2 rounded-lg hover:bg-[#1B2D4F] hover:text-white transition-colors text-sm">
            ← List View
          </button>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-4">
        <FullCalendar
          ref={calRef}
          plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
          initialView="dayGridMonth"
          headerToolbar={{
            left:   'prev,next today',
            center: 'title',
            right:  'dayGridMonth,timeGridWeek,timeGridDay',
          }}
          events={fetchEvents}
          eventClick={(info) => {
            const bookingId = info.event.id;
            router.push(`/dashboard/bookings/${bookingId}`);
          }}
          height="auto"
          eventDisplay="block"
          dayMaxEvents={4}
          nowIndicator
          slotMinTime="07:00:00"
          slotMaxTime="24:00:00"
        />
      </div>
    </div>
  );
}
