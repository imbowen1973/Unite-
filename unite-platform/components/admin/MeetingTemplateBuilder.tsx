'use client'

// Meeting Template Builder Component
// Drag-and-drop interface for building reusable meeting templates

import { useState } from 'react'
import { MeetingTemplateItem } from '@/types/meeting-template'
import {
  Plus,
  Trash2,
  GripVertical,
  Clock,
  Users,
  Save,
  ChevronDown,
  ChevronRight,
  Star,
  Coffee,
} from 'lucide-react'

interface Props {
  initialItems?: MeetingTemplateItem[]
  onSave: (items: MeetingTemplateItem[]) => void
  onCancel: () => void
}

export function MeetingTemplateBuilder({ initialItems = [], onSave, onCancel }: Props) {
  const [items, setItems] = useState<MeetingTemplateItem[]>(initialItems)
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set())
  const [editingItem, setEditingItem] = useState<string | null>(null)

  const addItem = (parentId?: string) => {
    const parentItem = parentId ? items.find(i => i.id === parentId) : undefined
    const siblings = items.filter(i => i.parentItemId === parentId)
    const itemOrder = siblings.length + 1

    const newItem: MeetingTemplateItem = {
      id: `temp-${Date.now()}`,
      title: 'New Agenda Item',
      description: '',
      itemOrder,
      parentItemId: parentId,
      orderPath: parentItem ? `${parentItem.orderPath}.${itemOrder}` : String(itemOrder),
      level: parentItem ? parentItem.level + 1 : 0,
      timeAllocation: 15,
      role: 'discussion',
      voteRequired: 'none',
      isStandingItem: false,
      isOptional: false,
    }

    setItems([...items, newItem])
    setEditingItem(newItem.id)
  }

  const addBreak = () => {
    const topLevelItems = items.filter(i => !i.parentItemId && i.role !== 'break')
    const itemOrder = topLevelItems.length + 1

    const breakItem: MeetingTemplateItem = {
      id: `break-${Date.now()}`,
      title: 'Break',
      description: 'Coffee/comfort break',
      itemOrder,
      orderPath: String(itemOrder),
      level: 0,
      timeAllocation: 15,
      role: 'break',
      voteRequired: 'none',
      isStandingItem: false,
      isOptional: false,
    }

    setItems([...items, breakItem])
  }

  const updateItem = (id: string, updates: Partial<MeetingTemplateItem>) => {
    setItems(items.map(item => (item.id === id ? { ...item, ...updates } : item)))
  }

  const deleteItem = (id: string) => {
    // Also delete children
    const toDelete = new Set([id])
    const findChildren = (parentId: string) => {
      items.forEach(item => {
        if (item.parentItemId === parentId) {
          toDelete.add(item.id)
          findChildren(item.id)
        }
      })
    }
    findChildren(id)

    setItems(items.filter(item => !toDelete.has(item.id)))
  }

  const toggleExpand = (id: string) => {
    const newExpanded = new Set(expandedItems)
    if (newExpanded.has(id)) {
      newExpanded.delete(id)
    } else {
      newExpanded.add(id)
    }
    setExpandedItems(newExpanded)
  }

  const moveUp = (id: string) => {
    const item = items.find(i => i.id === id)
    if (!item || item.itemOrder === 1) return

    const siblings = items.filter(
      i => i.parentItemId === item.parentItemId && i.role !== 'break'
    )
    const sortedSiblings = siblings.sort((a, b) => a.itemOrder - b.itemOrder)
    const currentIndex = sortedSiblings.findIndex(i => i.id === id)

    if (currentIndex > 0) {
      const prevSibling = sortedSiblings[currentIndex - 1]
      const updatedItems = items.map(i => {
        if (i.id === id) return { ...i, itemOrder: prevSibling.itemOrder }
        if (i.id === prevSibling.id) return { ...i, itemOrder: item.itemOrder }
        return i
      })
      setItems(updatedItems)
    }
  }

  const moveDown = (id: string) => {
    const item = items.find(i => i.id === id)
    if (!item) return

    const siblings = items.filter(
      i => i.parentItemId === item.parentItemId && i.role !== 'break'
    )
    const sortedSiblings = siblings.sort((a, b) => a.itemOrder - b.itemOrder)
    const currentIndex = sortedSiblings.findIndex(i => i.id === id)

    if (currentIndex < sortedSiblings.length - 1) {
      const nextSibling = sortedSiblings[currentIndex + 1]
      const updatedItems = items.map(i => {
        if (i.id === id) return { ...i, itemOrder: nextSibling.itemOrder }
        if (i.id === nextSibling.id) return { ...i, itemOrder: item.itemOrder }
        return i
      })
      setItems(updatedItems)
    }
  }

  const renderItem = (item: MeetingTemplateItem) => {
    const children = items.filter(i => i.parentItemId === item.id)
    const hasChildren = children.length > 0
    const isExpanded = expandedItems.has(item.id)
    const isEditing = editingItem === item.id

    return (
      <div key={item.id} style={{ marginLeft: item.level * 24 }}>
        <div
          className={`
            group flex items-center gap-2 p-3 rounded-lg border mb-2
            ${item.role === 'break' ? 'bg-orange-50 border-orange-200' : 'bg-white border-gray-200'}
            ${item.isStandingItem ? 'border-l-4 border-l-blue-500' : ''}
            hover:shadow-md transition-shadow
          `}
        >
          {/* Drag Handle */}
          <div className="cursor-move text-gray-400 hover:text-gray-600">
            <GripVertical className="w-4 h-4" />
          </div>

          {/* Expand/Collapse */}
          {hasChildren && (
            <button onClick={() => toggleExpand(item.id)} className="text-gray-600">
              {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            </button>
          )}

          {/* Order Path */}
          <div className="w-16 text-sm font-mono text-gray-500">{item.orderPath}</div>

          {/* Item Content */}
          <div className="flex-1">
            {isEditing ? (
              <div className="space-y-2">
                <input
                  type="text"
                  value={item.title}
                  onChange={e => updateItem(item.id, { title: e.target.value })}
                  className="w-full px-2 py-1 border rounded"
                  placeholder="Item title"
                />
                <textarea
                  value={item.description}
                  onChange={e => updateItem(item.id, { description: e.target.value })}
                  className="w-full px-2 py-1 border rounded text-sm"
                  placeholder="Description"
                  rows={2}
                />
                <div className="flex gap-2">
                  <input
                    type="number"
                    value={item.timeAllocation}
                    onChange={e => updateItem(item.id, { timeAllocation: parseInt(e.target.value) })}
                    className="w-20 px-2 py-1 border rounded text-sm"
                    min={1}
                  />
                  <span className="text-sm text-gray-500">minutes</span>

                  <select
                    value={item.role}
                    onChange={e => updateItem(item.id, { role: e.target.value as any })}
                    className="px-2 py-1 border rounded text-sm"
                  >
                    <option value="information">Information</option>
                    <option value="discussion">Discussion</option>
                    <option value="decision">Decision</option>
                    <option value="voting">Voting</option>
                    <option value="action">Action</option>
                    <option value="break">Break</option>
                  </select>

                  <label className="flex items-center gap-1 text-sm">
                    <input
                      type="checkbox"
                      checked={item.isStandingItem}
                      onChange={e => updateItem(item.id, { isStandingItem: e.target.checked })}
                    />
                    <Star className="w-3 h-3" />
                    Standing
                  </label>

                  <label className="flex items-center gap-1 text-sm">
                    <input
                      type="checkbox"
                      checked={item.isOptional}
                      onChange={e => updateItem(item.id, { isOptional: e.target.checked })}
                    />
                    Optional
                  </label>
                </div>
              </div>
            ) : (
              <div onClick={() => setEditingItem(item.id)} className="cursor-pointer">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{item.title}</span>
                  {item.isStandingItem && <Star className="w-4 h-4 text-blue-500" title="Standing Item" />}
                  {item.isOptional && <span className="text-xs text-gray-500">(optional)</span>}
                  {item.role === 'break' && <Coffee className="w-4 h-4 text-orange-500" />}
                </div>
                {item.description && <div className="text-sm text-gray-600">{item.description}</div>}
                <div className="flex items-center gap-3 text-xs text-gray-500 mt-1">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {item.timeAllocation} min
                  </span>
                  <span className="capitalize">{item.role}</span>
                  {item.presenter && (
                    <span className="flex items-center gap-1">
                      <Users className="w-3 h-3" />
                      {item.presenter}
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={() => moveUp(item.id)}
              className="p-1 hover:bg-gray-100 rounded text-sm"
              title="Move up"
            >
              ↑
            </button>
            <button
              onClick={() => moveDown(item.id)}
              className="p-1 hover:bg-gray-100 rounded text-sm"
              title="Move down"
            >
              ↓
            </button>
            {item.role !== 'break' && (
              <button
                onClick={() => addItem(item.id)}
                className="p-1 hover:bg-gray-100 rounded"
                title="Add sub-item"
              >
                <Plus className="w-4 h-4" />
              </button>
            )}
            <button
              onClick={() => deleteItem(item.id)}
              className="p-1 hover:bg-red-50 text-red-600 rounded"
              title="Delete"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Render children */}
        {hasChildren && isExpanded && (
          <div className="ml-6">
            {children
              .sort((a, b) => a.itemOrder - b.itemOrder)
              .map(child => renderItem(child))}
          </div>
        )}
      </div>
    )
  }

  const topLevelItems = items.filter(i => !i.parentItemId).sort((a, b) => a.itemOrder - b.itemOrder)
  const totalDuration = items.reduce((sum, item) => sum + item.timeAllocation, 0)

  return (
    <div className="h-full flex flex-col">
      {/* Toolbar */}
      <div className="flex items-center justify-between p-4 border-b bg-white">
        <div className="flex gap-2">
          <button
            onClick={() => addItem()}
            className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
          >
            <Plus className="w-4 h-4" />
            Add Item
          </button>
          <button
            onClick={addBreak}
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
          >
            <Coffee className="w-4 h-4" />
            Add Break
          </button>
        </div>

        <div className="flex items-center gap-4">
          <div className="text-sm text-gray-600">
            {items.length} items • {totalDuration} min total
          </div>
          <div className="flex gap-2">
            <button
              onClick={onCancel}
              className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={() => onSave(items)}
              className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600"
            >
              <Save className="w-4 h-4" />
              Save Template
            </button>
          </div>
        </div>
      </div>

      {/* Items List */}
      <div className="flex-1 overflow-y-auto p-4 bg-gray-50">
        {topLevelItems.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            No items yet. Click "Add Item" to create your first agenda item.
          </div>
        ) : (
          <div>{topLevelItems.map(item => renderItem(item))}</div>
        )}
      </div>

      {/* Legend */}
      <div className="p-4 border-t bg-white text-sm text-gray-600">
        <div className="flex gap-6">
          <div className="flex items-center gap-2">
            <Star className="w-4 h-4 text-blue-500" />
            <span>Standing Item (always appears)</span>
          </div>
          <div className="flex items-center gap-2">
            <Coffee className="w-4 h-4 text-orange-500" />
            <span>Break</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs">(optional)</span>
            <span>Can be removed when creating meeting</span>
          </div>
        </div>
      </div>
    </div>
  )
}
