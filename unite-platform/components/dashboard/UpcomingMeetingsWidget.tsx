'use client';

import React from 'react';

const UpcomingMeetingsWidget = () => {
  // Mock data for upcoming meetings
  const upcomingMeetings = [
    { id: '1', title: 'Executive Board Meeting', date: '2024-01-15', time: '10:00 AM', agendaAvailable: true },
    { id: '2', title: 'Policy Review Committee', date: '2024-01-18', time: '2:00 PM', agendaAvailable: false },
    { id: '3', title: 'Finance Committee', date: '2024-01-22', time: '9:30 AM', agendaAvailable: true },
    { id: '4', title: 'Operations Review', date: '2024-01-25', time: '11:00 AM', agendaAvailable: false },
  ];

  return (
    <div>
      <h2 className="text-lg font-medium text-gray-900 mb-4">Upcoming Meetings</h2>
      
      <div className="space-y-3">
        {upcomingMeetings.length > 0 ? (
          <ul className="space-y-3">
            {upcomingMeetings.map((meeting) => (
              <li key={meeting.id} className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                <div className="flex justify-between">
                  <div className="font-medium text-sm">{meeting.title}</div>
                  {meeting.agendaAvailable ? (
                    <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                      Agenda
                    </span>
                  ) : (
                    <span className="text-xs bg-gray-100 text-gray-800 px-2 py-1 rounded">
                      No Agenda
                    </span>
                  )}
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  {new Date(meeting.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} at {meeting.time}
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-gray-500">No upcoming meetings scheduled</p>
        )}
      </div>
    </div>
  );
};

export default UpcomingMeetingsWidget;
