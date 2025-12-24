'use client';

import React, { useState } from 'react';
import { AgendaItem, AgendaItemRole } from '@/types/meeting';

interface AgendaItemComponentProps {
  item: AgendaItem;
  onStatusChange?: (id: string, status: AgendaItem['status']) => void;
  onRoleChange?: (id: string, role: AgendaItemRole) => void;
}

const AgendaItemComponent: React.FC<AgendaItemComponentProps> = ({ 
  item, 
  onStatusChange,
  onRoleChange
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editedRole, setEditedRole] = useState<AgendaItemRole>(item.role);

  const roleColors = {
    information: 'bg-blue-100 text-blue-800',
    action: 'bg-green-100 text-green-800',
    decision: 'bg-purple-100 text-purple-800',
    voting: 'bg-red-100 text-red-800',
    discussion: 'bg-yellow-100 text-yellow-800',
  };

  const roleIcons = {
    information: 'ℹ️',
    action: '✅',
    decision: '⚖️',
    voting: '🗳️',
    discussion: '💬',
  };

  const handleRoleChange = () => {
    if (onRoleChange) {
      onRoleChange(item.id, editedRole);
    }
    setIsEditing(false);
  };

  return (
    <div className={`flex items-start justify-between p-4 bg-white rounded-lg shadow-sm border-l-4 ${ 
      item.role === 'information' ? 'border-blue-500' :
      item.role === 'action' ? 'border-green-500' :
      item.role === 'decision' ? 'border-purple-500' :
      item.role === 'voting' ? 'border-red-500' : 'border-yellow-500'
    }`}>
      <div className="flex-1 min-w-0">
        <div className="flex items-center">
          <span className="mr-2">{roleIcons[item.role]}</span>
          <h3 className="font-medium text-gray-900 truncate">{item.title}</h3>
        </div>
        <p className="text-sm text-gray-500 mt-1">{item.description}</p>
        <div className="flex flex-wrap gap-2 mt-2">
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${roleColors[item.role]}`}>
            {item.role.charAt(0).toUpperCase() + item.role.slice(1)}
          </span>
          {item.presenter && (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
              {item.presenter}
            </span>
          )}
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
            {item.timeAllocation} min
          </span>
          {item.voteRequired !== 'none' && (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
              Vote: {item.voteRequired}
            </span>
          )}
        </div>
        {item.supportingDocuments && item.supportingDocuments.length > 0 && (
          <div className="mt-2 text-xs text-gray-500">
            Documents: {item.supportingDocuments.length} file(s)
          </div>
        )}
      </div>
      <div className="flex flex-col items-end space-y-2 ml-4">
        {isEditing ? (
          <div className="flex flex-col space-y-2 w-48">
            <select
              value={editedRole}
              onChange={(e) => setEditedRole(e.target.value as AgendaItemRole)}
              className="text-xs border rounded px-2 py-1"
            >
              <option value="information">Information</option>
              <option value="action">Action</option>
              <option value="decision">Decision</option>
              <option value="voting">Voting</option>
              <option value="discussion">Discussion</option>
            </select>
            <div className="flex space-x-1">
              <button 
                onClick={handleRoleChange}
                className="text-xs bg-blue-500 hover:bg-blue-600 text-white px-2 py-1 rounded"
              >
                Save
              </button>
              <button 
                onClick={() => setIsEditing(false)}
                className="text-xs bg-gray-300 hover:bg-gray-400 text-gray-800 px-2 py-1 rounded"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <button 
            onClick={() => setIsEditing(true)}
            className="text-xs bg-gray-200 hover:bg-gray-300 text-gray-800 px-2 py-1 rounded"
          >
            Edit Role
          </button>
        )}
        {onStatusChange && (
          <select
            value={item.status}
            onChange={(e) => onStatusChange(item.id, e.target.value as AgendaItem['status'])}
            className="text-xs border rounded px-2 py-1"
          >
            <option value="pending">Pending</option>
            <option value="in-progress">In Progress</option>
            <option value="discussed">Discussed</option>
            <option value="deferred">Deferred</option>
            <option value="completed">Completed</option>
          </select>
        )}
      </div>
    </div>
  );
};

export default AgendaItemComponent;
