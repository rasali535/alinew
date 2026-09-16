'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, Button, Badge, Modal } from '@ralion/ui';
import { Calendar as CalendarIcon, Clock, Plus, MapPin, Users, Trash2, Loader2 } from 'lucide-react';
import { authFetch } from '@/lib/api-config';

type EventCategory = 'MEETING' | 'APPOINTMENT' | 'REMINDER' | 'DISPATCH' | 'DEADLINE' | 'OTHER';
interface EventItem {
  id: string;
  title: string;
  start_at: string;
  end_at?: string | null;
  category: EventCategory;
  attendees: string[];
  location?: string | null;
  notes?: string | null;
  reminder_minutes?: number | null;
}

const categoryBadges: Record<EventCategory, 'primary' | 'purple' | 'danger' | 'success' | 'warning' | 'default'> = {
  MEETING: 'primary', APPOINTMENT: 'purple', DISPATCH: 'danger', REMINDER: 'success', DEADLINE: 'warning', OTHER: 'default',
};

function toLocalInput(date: Date) {
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

export default function CalendarPage() {
  const [events, setEvents] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newEvent, setNewEvent] = useState(() => {
    const start = new Date(Date.now() + 60 * 60 * 1000);
    const end = new Date(start.getTime() + 30 * 60 * 1000);
    return { title: '', startAt: toLocalInput(start), endAt: toLocalInput(end), category: 'MEETING' as EventCategory, attendees: '', location: '', notes: '', reminderMinutes: '30' };
  });

  const loadEvents = async () => {
    setLoading(true);
    setError(null);
    const now = new Date();
    const from = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString();
    const to = new Date(now.getFullYear(), now.getMonth() + 3, 1).toISOString();
    const res = await authFetch(`/api/calendar/events?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`);
    const body = await res.json().catch(() => ({}));
    if (!res.ok) setError(body.error || 'Failed to load calendar.');
    else setEvents(body.events || []);
    setLoading(false);
  };

  useEffect(() => { void loadEvents(); }, []);

  const upcoming = useMemo(() => events.filter(e => new Date(e.start_at) >= new Date()).slice(0, 25), [events]);

  const scheduleEvent = async () => {
    if (!newEvent.title.trim()) return;
    const res = await authFetch('/api/calendar/events', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...newEvent, attendees: newEvent.attendees.split(',').map(v => v.trim()).filter(Boolean), reminderMinutes: Number(newEvent.reminderMinutes) || null }),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) return setError(body.error || 'Failed to schedule event.');
    setEvents(prev => [...prev, body.event].sort((a, b) => a.start_at.localeCompare(b.start_at)));
    setIsModalOpen(false);
    setNewEvent(v => ({ ...v, title: '', attendees: '', location: '', notes: '' }));
  };

  const removeEvent = async (id: string) => {
    const res = await authFetch(`/api/calendar/events?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) return setError(body.error || 'Failed to remove event.');
    setEvents(prev => prev.filter(e => e.id !== id));
  };

  return (
    <div className="flex flex-col gap-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between border-b border-zinc-800/80 pb-5">
        <div><div className="flex items-center gap-2"><h1 className="text-2xl font-black tracking-tight text-white">Universal Enterprise Calendar</h1><Badge variant="success">Live</Badge></div><p className="text-xs text-zinc-400 mt-1">Durable workspace events, reminders and operational appointments.</p></div>
        <Button variant="primary" size="sm" onClick={() => setIsModalOpen(true)}><Plus className="w-4 h-4" /> Schedule Event</Button>
      </div>
      {error && <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-xs text-rose-300">{error}</div>}
      {loading ? <div className="flex items-center justify-center py-16 text-zinc-400"><Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading calendar…</div> : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2"><CardHeader><CardTitle className="justify-between"><span className="flex items-center gap-2"><CalendarIcon className="w-4 h-4 text-blue-400" /> Upcoming Schedule</span><Badge>{upcoming.length} events</Badge></CardTitle><CardDescription>Stored in the active workspace; workflow-created reminders appear here too.</CardDescription></CardHeader><CardContent className="flex flex-col gap-3">{upcoming.map(event => <div key={event.id} className="p-4 rounded-xl bg-zinc-900/60 border border-zinc-800 flex items-start justify-between gap-4"><div><div className="flex items-center gap-2"><h4 className="text-sm font-bold text-white">{event.title}</h4><Badge variant={categoryBadges[event.category]}>{event.category}</Badge></div><div className="flex flex-wrap gap-4 text-xs text-zinc-400 mt-2"><span className="flex items-center gap-1 text-blue-400"><Clock className="w-3.5 h-3.5" />{new Date(event.start_at).toLocaleString()}{event.end_at ? ` – ${new Date(event.end_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : ''}</span>{event.attendees?.length ? <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5" />{event.attendees.join(', ')}</span> : null}{event.location ? <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" />{event.location}</span> : null}</div></div><button onClick={() => void removeEvent(event.id)} className="p-2 rounded-lg bg-zinc-800 text-zinc-400 hover:text-rose-400"><Trash2 className="w-4 h-4" /></button></div>)}{!upcoming.length && <div className="py-12 text-center text-sm text-zinc-500">No upcoming events. Schedule the first one.</div>}</CardContent></Card>
          <Card><CardHeader><CardTitle>Calendar Overview</CardTitle><CardDescription>{new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</CardDescription></CardHeader><CardContent><div className="grid grid-cols-7 gap-1 text-center text-xs text-zinc-400 mb-2 font-bold"><span>S</span><span>M</span><span>T</span><span>W</span><span>T</span><span>F</span><span>S</span></div><div className="grid grid-cols-7 gap-1 text-center text-xs">{Array.from({ length: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate() }, (_, i) => i + 1).map(day => { const today = day === new Date().getDate(); return <div key={day} className={`p-2 rounded-lg ${today ? 'bg-blue-600 font-bold text-white' : 'text-zinc-300 hover:bg-zinc-800/60'}`}>{day}</div>; })}</div></CardContent></Card>
        </div>
      )}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Schedule Event"><div className="flex flex-col gap-4"><input value={newEvent.title} onChange={e => setNewEvent(v => ({ ...v, title: e.target.value }))} placeholder="Event title" className="px-3 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-xs text-white" /><div className="grid grid-cols-2 gap-3"><input type="datetime-local" value={newEvent.startAt} onChange={e => setNewEvent(v => ({ ...v, startAt: e.target.value }))} className="px-3 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-xs text-white" /><input type="datetime-local" value={newEvent.endAt} onChange={e => setNewEvent(v => ({ ...v, endAt: e.target.value }))} className="px-3 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-xs text-white" /></div><select value={newEvent.category} onChange={e => setNewEvent(v => ({ ...v, category: e.target.value as EventCategory }))} className="px-3 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-xs text-white">{Object.keys(categoryBadges).map(c => <option key={c}>{c}</option>)}</select><input value={newEvent.attendees} onChange={e => setNewEvent(v => ({ ...v, attendees: e.target.value }))} placeholder="Attendees, comma separated" className="px-3 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-xs text-white" /><input value={newEvent.location} onChange={e => setNewEvent(v => ({ ...v, location: e.target.value }))} placeholder="Location / meeting link" className="px-3 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-xs text-white" /><textarea value={newEvent.notes} onChange={e => setNewEvent(v => ({ ...v, notes: e.target.value }))} placeholder="Notes" className="min-h-24 px-3 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-xs text-white" /><div className="flex justify-end gap-2"><Button variant="outline" size="sm" onClick={() => setIsModalOpen(false)}>Cancel</Button><Button variant="primary" size="sm" onClick={() => void scheduleEvent()}>Schedule</Button></div></div></Modal>
    </div>
  );
}
