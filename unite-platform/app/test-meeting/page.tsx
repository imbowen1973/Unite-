'use client';

import React, { useState } from 'react';
import { AgendaItem, AgendaItemRole } from '@/types/meeting';
import MeetingAgendaList from '@/components/meeting/MeetingAgendaList';
import AgendaItemForm from '@/components/meeting/AgendaItemForm';

const TestMeetingPage = () => {
  const [agendaItems, setAgendaItems] = useState<AgendaItem[]>([
    {
      id: '1',
      meetingId: 'test-meeting-1',
      title: 'Opening Remarks',
      description: 'Welcome and meeting objectives',
      itemOrder: 1,
      presenter: 'Meeting Chair',
      timeAllocation: 5,
      status: 'completed',
      supportingDocuments: [],
      voteRequired: 'none',
      role: 'information',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: '2',
      meetingId: 'test-meeting-1',
      title: 'Q3 Financial Report',
      description: 'Review of Q3 financial performance',
      itemOrder: 2,
      presenter: 'CFO',
      timeAllocation: 20,
      status: 'pending',
      supportingDocuments: ['doc-123', 'doc-456'],
      voteRequired: 'approval',
      voteType: 'simple-majority',
      role: 'voting',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: '3',
      meetingId: 'test-meeting-1',
      title: 'New Policy Review',
      description: 'Review and discussion of new HR policy',
      itemOrder: 3,
      presenter: 'HR Director',
      timeAllocation: 15,
      status: 'in-progress',
      supportingDocuments: ['doc-789'],
      voteRequired: 'none',
      role: 'discussion',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: '4',
      meetingId: 'test-meeting-1',
      title: 'Action Items Review',
      description: 'Review of action items from last meeting',
      itemOrder: 4,
      presenter: 'Operations Manager',
      timeAllocation: 10,
      status: 'pending',
      supportingDocuments: [],
      voteRequired: 'none',
      role: 'action',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: '5',
      meetingId: 'test-meeting-1',
      title: 'Budget Approval',
      description: 'Decision on next quarter budget allocation',
      itemOrder: 5,
      presenter: 'Finance Team',
      timeAllocation: 15,
      status: 'pending',
      supportingDocuments: ['doc-101', 'doc-202'],
      voteRequired: 'approval',
      voteType: 'simple-majority',
      role: 'decision',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
  ]);
  
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState<AgendaItem | null>(null);

  const handleAddItem = () => {
    setEditingItem(null);
    setShowForm(true);
  };

  const handleEditItem = (item: AgendaItem) => {
    setEditingItem(item);
    setShowForm(true);
  };

  const handleSaveItem = (itemData: Omit<AgendaItem, 'id' | 'meetingId' | 'createdAt' | 'updatedAt'> & { id?: string }) => {
    if (itemData.id) {
      // Update existing item
      setAgendaItems(prevItems => 
        prevItems.map(item => 
          item.id === itemData.id ? { ...itemData, id: itemData.id, meetingId: 'test-meeting-1' } as AgendaItem : item
        )
      );
    } else {
      // Add new item
      const newItem: AgendaItem = {
        ...itemData,
        id: `item-${Date.now()}`,
        meetingId: 'test-meeting-1',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      setAgendaItems(prevItems => [...prevItems, newItem]);
    }
    setShowForm(false);
    setEditingItem(null);
  };

  const handleCancelForm = () => {
    setShowForm(false);
    setEditingItem(null);
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <div className="flex justify-between items-center mb-6">
              <h1 className="text-2xl font-bold text-gray-900">Meeting Management Test</h1>
              <button
                onClick={handleAddItem}
                className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
              >
                Add Agenda Item
              </button>
            </div>
            
            {showForm ? (
              <div className="mb-8">
                <AgendaItemForm
                  meetingId="test-meeting-1"
                  initialItem={editingItem || undefined}
                  onSave={handleSaveItem}
                  onCancel={handleCancelForm}
                />
              </div>
            ) : null}
            
            <MeetingAgendaList
              meetingId="test-meeting-1"
              initialItems={agendaItems}
              onItemsChange={setAgendaItems}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default TestMeetingPage;