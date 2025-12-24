'use client';

import React from 'react';
import TodayWidget from '../dashboard/TodayWidget';
import UpcomingMeetingsWidget from '../dashboard/UpcomingMeetingsWidget';
import UserActionsWidget from '../dashboard/UserActionsWidget';
import PlannerTasksWidget from '../dashboard/PlannerTasksWidget';
import DocumentSearchWidget from '../dashboard/DocumentSearchWidget';

const DashboardPage = () => {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="mt-2 text-gray-600">Welcome to your personalized Unite Platform dashboard</p>
        </div>

        {/* Dashboard Layout: 3 columns on desktop, 1 column on mobile */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Left Column (75% width on desktop) */}
          <div className="lg:col-span-3 space-y-6">
            <div className="bg-white shadow rounded-lg p-6">
              <DocumentSearchWidget />
            </div>
          </div>

          {/* Right Column (25% width on desktop) */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-white shadow rounded-lg p-6">
              <TodayWidget />
            </div>
            <div className="bg-white shadow rounded-lg p-6">
              <UpcomingMeetingsWidget />
            </div>
            <div className="bg-white shadow rounded-lg p-6">
              <UserActionsWidget />
            </div>
            <div className="bg-white shadow rounded-lg p-6">
              <PlannerTasksWidget />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;