'use client';

import React from 'react';

const TodayWidget = () => {
  const today = new Date();
  const formattedDate = today.toLocaleDateString('en-US', { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });

  // Mock data for today's meetings
  const todaysMeetings = [
    { id: '1', title: 'Executive Board Meeting', time: '10:00 AM', agendaAvailable: true },
    { id: '2', title: 'Policy Review Committee', time: '2:00 PM', agendaAvailable: false },
  ];

  return (
    <div>
      <h2 className="text-lg font-medium text-gray-900 mb-4">Today</h2>
      <div className="text-2xl font-semibold text-gray-800 mb-4">{formattedDate}</div>
      
      <div className="space-y-3">
        <h3 className="font-medium text-gray-700">Today's Meetings</h3>
        {todaysMeetings.length > 0 ? (
          <ul className="space-y-2">
            {todaysMeetings.map((meeting) => (
              <li key={meeting.id} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                <div>
                  <div className="font-medium text-sm">{meeting.title}</div>
                  <div className="text-xs text-gray-500">{meeting.time}</div>
                </div>
                {meeting.agendaAvailable ? (
                  <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                    Agenda
                  </span>
                ) : (
                  <span className="text-xs bg-gray-100 text-gray-800 px-2 py-1 rounded">
                    No Agenda
                  </span>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-gray-500">No meetings scheduled for today</p>
        )}
      </div>
    </div>
  );
};

export default TodayWidget;
