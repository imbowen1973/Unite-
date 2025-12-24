'use client';

import React, { useState } from 'react';
import { AgendaItem, AgendaItemRole } from '@/types/meeting';

interface AgendaItemFormProps {
  meetingId: string;
  initialItem?: AgendaItem;
  onSave: (item: Omit<AgendaItem, 'id' | 'meetingId' | 'createdAt' | 'updatedAt'> & { id?: string }) => void;
  onCancel: () => void;
}

const AgendaItemForm: React.FC<AgendaItemFormProps> = ({ 
  meetingId, 
  initialItem, 
  onSave, 
  onCancel 
}) => {
  const [title, setTitle] = useState(initialItem?.title || '');
  const [description, setDescription] = useState(initialItem?.description || '');
  const [role, setRole] = useState<AgendaItemRole>(initialItem?.role || 'information');
  const [presenter, setPresenter] = useState(initialItem?.presenter || '');
  const [timeAllocation, setTimeAllocation] = useState<number>(initialItem?.timeAllocation || 15);
  const [itemOrder, setItemOrder] = useState<number>(initialItem?.itemOrder || 0);
  const [supportingDocuments, setSupportingDocuments] = useState<string[]>(initialItem?.supportingDocuments || []);
  const [voteRequired, setVoteRequired] = useState<AgendaItem['voteRequired']>(initialItem?.voteRequired || 'none');
  const [voteType, setVoteType] = useState<AgendaItem['voteType']>(initialItem?.voteType || undefined);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const newItem = {
      ...(initialItem?.id && { id: initialItem.id }), // Include id only if editing existing item
      title,
      description,
      role,
      presenter,
      timeAllocation,
      itemOrder,
      supportingDocuments,
      voteRequired,
      voteType,
      status: initialItem?.status || 'pending' as const,
      createdAt: initialItem?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    
    onSave(newItem);
  };

  const roleColors = {
    information: 'bg-blue-100 text-blue-800',
    action: 'bg-green-100 text-green-800',
    decision: 'bg-purple-100 text-purple-800',
    voting: 'bg-red-100 text-red-800',
    discussion: 'bg-yellow-100 text-yellow-800',
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow">
      <h2 className="text-xl font-bold text-gray-900 mb-4">
        {initialItem ? 'Edit Agenda Item' : 'Add New Agenda Item'}
      </h2>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
            Title *
          </label>
          <input
            type="text"
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            className="w-full border rounded px-3 py-2"
            placeholder="Enter agenda item title"
          />
        </div>
        
        <div>
          <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
            Description
          </label>
          <textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className="w-full border rounded px-3 py-2"
            placeholder="Enter agenda item description"
          />
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="role" className="block text-sm font-medium text-gray-700 mb-1">
              Role *
            </label>
            <select
              id="role"
              value={role}
              onChange={(e) => setRole(e.target.value as AgendaItemRole)}
              required
              className="w-full border rounded px-3 py-2"
            >
              <option value="information">For Information</option>
              <option value="action">For Action</option>
              <option value="decision">For Decision</option>
              <option value="voting">For Voting</option>
              <option value="discussion">For Discussion</option>
            </select>
            <div className="mt-1 text-xs text-gray-500">
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${roleColors[role]}`}>
                {role.charAt(0).toUpperCase() + role.slice(1)}
              </span>
              {role === 'information' && ' - Share information without requiring action'}
              {role === 'action' && ' - Requires specific action items to be completed'}
              {role === 'decision' && ' - Requires a decision to be made'}
              {role === 'voting' && ' - Requires a formal vote'}
              {role === 'discussion' && ' - Open discussion topic'}
            </div>
          </div>
          
          <div>
            <label htmlFor="timeAllocation" className="block text-sm font-medium text-gray-700 mb-1">
              Time Allocation (minutes) *
            </label>
            <input
              type="number"
              id="timeAllocation"
              value={timeAllocation}
              onChange={(e) => setTimeAllocation(Number(e.target.value))}
              min="1"
              required
              className="w-full border rounded px-3 py-2"
            />
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="presenter" className="block text-sm font-medium text-gray-700 mb-1">
              Presenter
            </label>
            <input
              type="text"
              id="presenter"
              value={presenter}
              onChange={(e) => setPresenter(e.target.value)}
              className="w-full border rounded px-3 py-2"
              placeholder="Enter presenter name"
            />
          </div>
          
          <div>
            <label htmlFor="itemOrder" className="block text-sm font-medium text-gray-700 mb-1">
              Item Order
            </label>
            <input
              type="number"
              id="itemOrder"
              value={itemOrder}
              onChange={(e) => setItemOrder(Number(e.target.value))}
              min="0"
              className="w-full border rounded px-3 py-2"
              placeholder="Position in agenda"
            />
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="voteRequired" className="block text-sm font-medium text-gray-700 mb-1">
              Vote Required
            </label>
            <select
              id="voteRequired"
              value={voteRequired}
              onChange={(e) => setVoteRequired(e.target.value as AgendaItem['voteRequired'])}
              className="w-full border rounded px-3 py-2"
            >
              <option value="none">No vote required</option>
              <option value="approval">Approval required</option>
              <option value="opinion">Opinion gathering</option>
            </select>
          </div>
          
          {voteRequired !== 'none' && (
            <div>
              <label htmlFor="voteType" className="block text-sm font-medium text-gray-700 mb-1">
                Vote Type
              </label>
              <select
                id="voteType"
                value={voteType || ''}
                onChange={(e) => setVoteType(e.target.value as AgendaItem['voteType'])}
                className="w-full border rounded px-3 py-2"
              >
                <option value="">Select vote type</option>
                <option value="simple-majority">Simple Majority</option>
                <option value="super-majority">Super Majority</option>
                <option value="unanimous">Unanimous</option>
              </select>
            </div>
          )}
        </div>
        
        <div>
          <label htmlFor="supportingDocuments" className="block text-sm font-medium text-gray-700 mb-1">
            Supporting Documents
          </label>
          <input
            type="text"
            id="supportingDocuments"
            value={supportingDocuments.join(',')}
            onChange={(e) => setSupportingDocuments(e.target.value.split(',').map(doc => doc.trim()).filter(doc => doc))}
            className="w-full border rounded px-3 py-2"
            placeholder="Enter document IDs separated by commas"
          />
          <div className="mt-1 text-xs text-gray-500">
            Enter docStableIds of supporting documents, separated by commas
          </div>
        </div>
        
        <div className="flex justify-end space-x-3 pt-4">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
          >
            {initialItem ? 'Update Item' : 'Add Item'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default AgendaItemForm;