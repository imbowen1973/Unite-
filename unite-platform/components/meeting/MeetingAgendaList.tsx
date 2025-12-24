'use client';

import React, { useState, useEffect } from 'react';
import { AgendaItem, AgendaItemRole } from '@/types/meeting';
import AgendaItemComponent from './AgendaItem';

interface MeetingAgendaListProps {
  meetingId: string;
  initialItems: AgendaItem[];
  onItemsChange?: (items: AgendaItem[]) => void;
}

const MeetingAgendaList: React.FC<MeetingAgendaListProps> = ({ 
  meetingId, 
  initialItems,
  onItemsChange
}) => {
  const [agendaItems, setAgendaItems] = useState<AgendaItem[]>([]);
  const [filteredItems, setFilteredItems] = useState<AgendaItem[]>([]);
  const [filter, setFilter] = useState<'all' | AgendaItemRole>('all');
  const [sortBy, setSortBy] = useState<'order' | 'role'>('order');

  useEffect(() => {
    setAgendaItems(initialItems);
    applyFiltersAndSort(initialItems, filter, sortBy);
  }, [initialItems]);

  const applyFiltersAndSort = (items: AgendaItem[], filterBy: typeof filter, sortByField: typeof sortBy) => {
    let result = [...items];
    
    // Apply filter
    if (filterBy !== 'all') {
      result = result.filter(item => item.role === filterBy);
    }
    
    // Apply sort
    if (sortByField === 'order') {
      result.sort((a, b) => a.itemOrder - b.itemOrder);
    } else if (sortByField === 'role') {
      result.sort((a, b) => a.role.localeCompare(b.role));
    }
    
    setFilteredItems(result);
  };

  const handleStatusChange = (id: string, status: AgendaItem['status']) => {
    const updatedItems = agendaItems.map(item => 
      item.id === id ? { ...item, status } : item
    );
    setAgendaItems(updatedItems);
    applyFiltersAndSort(updatedItems, filter, sortBy);
    if (onItemsChange) {
      onItemsChange(updatedItems);
    }
  };

  const handleRoleChange = (id: string, role: AgendaItemRole) => {
    const updatedItems = agendaItems.map(item => 
      item.id === id ? { ...item, role } : item
    );
    setAgendaItems(updatedItems);
    applyFiltersAndSort(updatedItems, filter, sortBy);
    if (onItemsChange) {
      onItemsChange(updatedItems);
    }
  };

  const roleCounts = {
    information: agendaItems.filter(item => item.role === 'information').length,
    action: agendaItems.filter(item => item.role === 'action').length,
    decision: agendaItems.filter(item => item.role === 'decision').length,
    voting: agendaItems.filter(item => item.role === 'voting').length,
    discussion: agendaItems.filter(item => item.role === 'discussion').length,
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow">
      <div className="flex flex-wrap justify-between items-center mb-6">
        <h2 className="text-xl font-bold text-gray-900">Meeting Agenda</h2>
        <div className="flex space-x-4 mt-2 sm:mt-0">
          <div>
            <label htmlFor="filter" className="block text-sm font-medium text-gray-700 mb-1">
              Filter by Role
            </label>
            <select
              id="filter"
              value={filter}
              onChange={(e) => {
                const newFilter = e.target.value as 'all' | AgendaItemRole;
                setFilter(newFilter);
                applyFiltersAndSort(agendaItems, newFilter, sortBy);
              }}
              className="border rounded px-3 py-2 text-sm"
            >
              <option value="all">All Roles</option>
              <option value="information">Information</option>
              <option value="action">Action</option>
              <option value="decision">Decision</option>
              <option value="voting">Voting</option>
              <option value="discussion">Discussion</option>
            </select>
          </div>
          <div>
            <label htmlFor="sort" className="block text-sm font-medium text-gray-700 mb-1">
              Sort by
            </label>
            <select
              id="sort"
              value={sortBy}
              onChange={(e) => {
                const newSort = e.target.value as 'order' | 'role';
                setSortBy(newSort);
                applyFiltersAndSort(agendaItems, filter, newSort);
              }}
              className="border rounded px-3 py-2 text-sm"
            >
              <option value="order">Order</option>
              <option value="role">Role</option>
            </select>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6 p-4 bg-gray-50 rounded-lg">
        <div className="text-center">
          <div className="text-lg font-bold text-blue-600">{roleCounts.information}</div>
          <div className="text-xs text-gray-600">For Information</div>
        </div>
        <div className="text-center">
          <div className="text-lg font-bold text-green-600">{roleCounts.action}</div>
          <div className="text-xs text-gray-600">For Action</div>
        </div>
        <div className="text-center">
          <div className="text-lg font-bold text-purple-600">{roleCounts.decision}</div>
          <div className="text-xs text-gray-600">For Decision</div>
        </div>
        <div className="text-center">
          <div className="text-lg font-bold text-red-600">{roleCounts.voting}</div>
          <div className="text-xs text-gray-600">For Voting</div>
        </div>
        <div className="text-center">
          <div className="text-lg font-bold text-yellow-600">{roleCounts.discussion}</div>
          <div className="text-xs text-gray-600">For Discussion</div>
        </div>
      </div>

      <div className="space-y-4">
        {filteredItems.length > 0 ? (
          filteredItems.map(item => (
            <AgendaItemComponent
              key={item.id}
              item={item}
              onStatusChange={handleStatusChange}
              onRoleChange={handleRoleChange}
            />
          ))
        ) : (
          <div className="text-center py-8 text-gray-500">
            {filter === 'all' 
              ? 'No agenda items available' 
              : `No agenda items with role: ${filter}`}
          </div>
        )}
      </div>
    </div>
  );
};

export default MeetingAgendaList;
