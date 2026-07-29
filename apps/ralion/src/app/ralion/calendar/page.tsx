'use client';

import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, Button, Badge } from '@ralion/ui';
import { Calendar as CalendarIcon, Clock, Plus, MapPin, Users } from 'lucide-react';

interface EventItem {
  id: string;
  title: string;
  time: string;
  category: 'MEETING' | 'APPOINTMENT' | 'REMINDER' | 'DISPATCH';
  attendees: string;
  location?: string;
}

const sampleEvents: EventItem[] = [
  { id: 'e1', title: 'Mari AI Platform Strategy Briefing', time: '09:00 AM - 10:00 AM', category: 'MEETING', attendees: 'Ras Ali Exec Team', location: 'Gaborone HQ / Zoom' },
  { id: 'e2', title: 'Ralion Health Patient Consultation Intake', time: '11:30 AM - 12:15 PM', category: 'APPOINTMENT', attendees: 'Dr. Lesedi Phiri', location: 'Wellness Wing' },
  { id: 'e3', title: 'Ralion Funeral Hearse Fleet Dispatch', time: '02:00 PM - 04:00 PM', category: 'DISPATCH', attendees: 'Family Representative', location: 'Main Service Hall' },
  { id: 'e4', title: 'Logistics Customs Compliance Review', time: '04:30 PM - 05:15 PM', category: 'REMINDER', attendees: 'Customs Officer', location: 'Border Logistics Hub' },
];

export default function CalendarPage() {
  const [events, setEvents] = useState<EventItem[]>(sampleEvents);

  const categoryBadges: Record<string, 'primary' | 'purple' | 'danger' | 'success'> = {
    MEETING: 'primary',
    APPOINTMENT: 'purple',
    DISPATCH: 'danger',
    REMINDER: 'success'
  };

  return (
    <div className="flex flex-col gap-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between border-b border-zinc-800/80 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black tracking-tight text-white">Universal Enterprise Calendar</h1>
            <Badge variant="primary">Phase 1 Core</Badge>
          </div>
          <p className="text-xs text-zinc-400 mt-1">
            Universal scheduling engine integrating CRM meetings, clinical appointments, and fleet dispatches.
          </p>
        </div>

        <Button variant="primary" size="sm">
          <Plus className="w-4 h-4" /> Schedule Event
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Today's Schedule Card */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="justify-between">
              <span className="flex items-center gap-2">
                <CalendarIcon className="w-4 h-4 text-blue-400" /> Today's Schedule (July 24, 2026)
              </span>
              <Badge variant="default">4 Events Scheduled</Badge>
            </CardTitle>
            <CardDescription>Cross-module enterprise appointments and dispatches</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            {events.map((event) => (
              <div
                key={event.id}
                className="p-4 rounded-xl bg-zinc-900/60 border border-zinc-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 hover:border-zinc-700 transition-all"
              >
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-bold text-white">{event.title}</h4>
                    <Badge variant={categoryBadges[event.category]}>{event.category}</Badge>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-zinc-400 mt-1">
                    <span className="flex items-center gap-1 font-mono text-blue-400">
                      <Clock className="w-3.5 h-3.5" /> {event.time}
                    </span>
                    <span className="flex items-center gap-1">
                      <Users className="w-3.5 h-3.5 text-zinc-500" /> {event.attendees}
                    </span>
                  </div>
                </div>
                {event.location && (
                  <span className="text-xs text-zinc-400 bg-zinc-800/80 px-3 py-1.5 rounded-lg border border-zinc-700/60 flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-blue-400" /> {event.location}
                  </span>
                )}
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Mini Calendar Widget */}
        <Card>
          <CardHeader>
            <CardTitle>Calendar Overview</CardTitle>
            <CardDescription>July 2026</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-7 gap-1 text-center text-xs text-zinc-400 mb-2 font-bold">
              <span>S</span><span>M</span><span>T</span><span>W</span><span>T</span><span>F</span><span>S</span>
            </div>
            <div className="grid grid-cols-7 gap-1 text-center text-xs">
              {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => (
                <div
                  key={day}
                  className={`p-2 rounded-lg transition-colors ${
                    day === 24
                      ? 'bg-blue-600 font-bold text-white shadow-md'
                      : 'hover:bg-zinc-800/60 text-zinc-300'
                  }`}
                >
                  {day}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
