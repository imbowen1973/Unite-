// Workflow Builder Store using Zustand
// Manages the state of the workflow being built in the visual editor

import { create } from 'zustand'
import { Node, Edge, Connection } from 'reactflow'
import {
  WorkflowDefinition,
  WorkflowState,
  WorkflowTransition,
  WorkflowField,
  WorkflowAssignmentRule,
} from '@/lib/workflow-engine/definitions'
import { AccessLevel } from '@/lib/access'

export interface WorkflowBuilderState {
  // Workflow metadata
  workflowId: string | null
  name: string
  description: string
  category: string
  version: string
  isActive: boolean

  // Visual canvas state
  nodes: Node[]
  edges: Edge[]

  // Workflow components
  states: Map<string, WorkflowState>
  transitions: Map<string, WorkflowTransition>
  fields: WorkflowField[]
  assignmentRules: WorkflowAssignmentRule[]

  // Settings
  settings: {
    allowedAccessLevels: AccessLevel[]
    allowedCommittees?: string[]
    allowedRoles?: string[]
    requireDocument: boolean
    allowMultipleDocuments: boolean
    enableVersionHistory: boolean
    enableEmailNotifications: boolean
    auditAllActions: boolean
    dmsLibrary?: string
    siteCollection?: string
  }

  // UI state
  selectedNode: string | null
  selectedEdge: string | null
  selectedField: string | null
  showStateConfig: boolean
  showTransitionConfig: boolean
  showFieldConfig: boolean
  showRulesConfig: boolean
  showSettings: boolean

  // Actions
  setWorkflowInfo: (name: string, description: string, category: string) => void
  addState: (state: WorkflowState, position: { x: number; y: number }) => void
  updateState: (stateId: string, updates: Partial<WorkflowState>) => void
  deleteState: (stateId: string) => void
  selectNode: (nodeId: string | null) => void

  addTransition: (transition: WorkflowTransition) => void
  updateTransition: (transitionId: string, updates: Partial<WorkflowTransition>) => void
  deleteTransition: (transitionId: string) => void
  selectEdge: (edgeId: string | null) => void

  addField: (field: WorkflowField) => void
  updateField: (fieldName: string, updates: Partial<WorkflowField>) => void
  deleteField: (fieldName: string) => void
  selectField: (fieldName: string | null) => void

  addAssignmentRule: (rule: WorkflowAssignmentRule) => void
  updateAssignmentRule: (ruleId: string, updates: Partial<WorkflowAssignmentRule>) => void
  deleteAssignmentRule: (ruleId: string) => void

  updateSettings: (settings: Partial<WorkflowBuilderState['settings']>) => void

  setNodes: (nodes: Node[]) => void
  setEdges: (edges: Edge[]) => void
  onNodesChange: (changes: any[]) => void
  onEdgesChange: (changes: any[]) => void
  onConnect: (connection: Connection) => void

  toggleStateConfig: () => void
  toggleTransitionConfig: () => void
  toggleFieldConfig: () => void
  toggleRulesConfig: () => void
  toggleSettings: () => void

  exportWorkflow: () => Omit<WorkflowDefinition, 'id' | 'createdAt' | 'createdBy' | 'updatedAt'>
  loadWorkflow: (workflow: WorkflowDefinition) => void
  resetWorkflow: () => void
  validateWorkflow: () => { valid: boolean; errors: string[] }
}

const initialSettings = {
  allowedAccessLevels: [AccessLevel.Admin, AccessLevel.Executive],
  requireDocument: true,
  allowMultipleDocuments: false,
  enableVersionHistory: true,
  enableEmailNotifications: true,
  auditAllActions: true,
}

export const useWorkflowBuilder = create<WorkflowBuilderState>((set, get) => ({
  // Initial state
  workflowId: null,
  name: '',
  description: '',
  category: 'approval',
  version: '1.0',
  isActive: true,

  nodes: [],
  edges: [],

  states: new Map(),
  transitions: new Map(),
  fields: [],
  assignmentRules: [],

  settings: initialSettings,

  selectedNode: null,
  selectedEdge: null,
  selectedField: null,
  showStateConfig: false,
  showTransitionConfig: false,
  showFieldConfig: false,
  showRulesConfig: false,
  showSettings: false,

  // Actions
  setWorkflowInfo: (name, description, category) => {
    set({ name, description, category })
  },

  addState: (state, position) => {
    const states = new Map(get().states)
    states.set(state.id, state)

    const newNode: Node = {
      id: state.id,
      type: 'workflowState',
      position,
      data: state,
    }

    set({
      states,
      nodes: [...get().nodes, newNode],
    })
  },

  updateState: (stateId, updates) => {
    const states = new Map(get().states)
    const existingState = states.get(stateId)
    if (!existingState) return

    const updatedState = { ...existingState, ...updates }
    states.set(stateId, updatedState)

    // Update node data
    const nodes = get().nodes.map(node =>
      node.id === stateId
        ? { ...node, data: updatedState }
        : node
    )

    set({ states, nodes })
  },

  deleteState: (stateId) => {
    const states = new Map(get().states)
    states.delete(stateId)

    // Remove transitions connected to this state
    const transitions = new Map(get().transitions)
    const transitionsToDelete: string[] = []

    transitions.forEach((transition, id) => {
      if (transition.from === stateId || transition.to === stateId) {
        transitionsToDelete.push(id)
      }
    })

    transitionsToDelete.forEach(id => transitions.delete(id))

    // Remove node and connected edges
    const nodes = get().nodes.filter(node => node.id !== stateId)
    const edges = get().edges.filter(edge =>
      edge.source !== stateId && edge.target !== stateId
    )

    set({
      states,
      transitions,
      nodes,
      edges,
      selectedNode: get().selectedNode === stateId ? null : get().selectedNode,
    })
  },

  selectNode: (nodeId) => {
    set({
      selectedNode: nodeId,
      selectedEdge: null,
      showStateConfig: nodeId !== null,
      showTransitionConfig: false,
    })
  },

  addTransition: (transition) => {
    const transitions = new Map(get().transitions)
    transitions.set(transition.id, transition)

    const newEdge: Edge = {
      id: transition.id,
      source: transition.from,
      target: transition.to,
      label: transition.label,
      type: 'smoothstep',
      animated: true,
    }

    set({
      transitions,
      edges: [...get().edges, newEdge],
    })
  },

  updateTransition: (transitionId, updates) => {
    const transitions = new Map(get().transitions)
    const existingTransition = transitions.get(transitionId)
    if (!existingTransition) return

    const updatedTransition = { ...existingTransition, ...updates }
    transitions.set(transitionId, updatedTransition)

    // Update edge label
    const edges = get().edges.map(edge =>
      edge.id === transitionId
        ? { ...edge, label: updatedTransition.label }
        : edge
    )

    set({ transitions, edges })
  },

  deleteTransition: (transitionId) => {
    const transitions = new Map(get().transitions)
    transitions.delete(transitionId)

    const edges = get().edges.filter(edge => edge.id !== transitionId)

    set({
      transitions,
      edges,
      selectedEdge: get().selectedEdge === transitionId ? null : get().selectedEdge,
    })
  },

  selectEdge: (edgeId) => {
    set({
      selectedEdge: edgeId,
      selectedNode: null,
      showTransitionConfig: edgeId !== null,
      showStateConfig: false,
    })
  },

  addField: (field) => {
    set({ fields: [...get().fields, field] })
  },

  updateField: (fieldName, updates) => {
    const fields = get().fields.map(field =>
      field.name === fieldName
        ? { ...field, ...updates }
        : field
    )
    set({ fields })
  },

  deleteField: (fieldName) => {
    const fields = get().fields.filter(field => field.name !== fieldName)
    set({
      fields,
      selectedField: get().selectedField === fieldName ? null : get().selectedField,
    })
  },

  selectField: (fieldName) => {
    set({ selectedField: fieldName })
  },

  addAssignmentRule: (rule) => {
    set({ assignmentRules: [...get().assignmentRules, rule] })
  },

  updateAssignmentRule: (ruleId, updates) => {
    const assignmentRules = get().assignmentRules.map(rule =>
      rule.id === ruleId
        ? { ...rule, ...updates }
        : rule
    )
    set({ assignmentRules })
  },

  deleteAssignmentRule: (ruleId) => {
    const assignmentRules = get().assignmentRules.filter(rule => rule.id !== ruleId)
    set({ assignmentRules })
  },

  updateSettings: (updates) => {
    set({ settings: { ...get().settings, ...updates } })
  },

  setNodes: (nodes) => set({ nodes }),
  setEdges: (edges) => set({ edges }),

  onNodesChange: (changes) => {
    // Apply ReactFlow node changes
    const { nodes } = get()
    const updatedNodes = nodes.map(node => {
      const change = changes.find((c: any) => c.id === node.id)
      if (!change) return node

      if (change.type === 'position' && change.position) {
        return { ...node, position: change.position }
      }
      if (change.type === 'remove') {
        return null
      }
      return node
    }).filter(Boolean) as Node[]

    set({ nodes: updatedNodes })
  },

  onEdgesChange: (changes) => {
    const { edges } = get()
    const updatedEdges = edges.filter((edge) => {
      const change = changes.find((c: any) => c.id === edge.id)
      return !(change && change.type === 'remove')
    })

    set({ edges: updatedEdges })
  },

  onConnect: (connection) => {
    if (!connection.source || !connection.target) return

    // Create a new transition
    const transitionId = `trans-${Date.now()}`
    const transition: WorkflowTransition = {
      id: transitionId,
      label: 'New Transition',
      from: connection.source,
      to: connection.target,
    }

    get().addTransition(transition)
  },

  toggleStateConfig: () => set({ showStateConfig: !get().showStateConfig }),
  toggleTransitionConfig: () => set({ showTransitionConfig: !get().showTransitionConfig }),
  toggleFieldConfig: () => set({ showFieldConfig: !get().showFieldConfig }),
  toggleRulesConfig: () => set({ showRulesConfig: !get().showRulesConfig }),
  toggleSettings: () => set({ showSettings: !get().showSettings }),

  exportWorkflow: () => {
    const state = get()

    return {
      name: state.name,
      description: state.description,
      version: state.version,
      category: state.category,
      isActive: state.isActive,
      states: Array.from(state.states.values()),
      transitions: Array.from(state.transitions.values()),
      assignmentRules: state.assignmentRules,
      fields: state.fields,
      settings: state.settings,
    }
  },

  loadWorkflow: (workflow) => {
    // Convert workflow to builder state
    const statesMap = new Map(workflow.states.map(s => [s.id, s]))
    const transitionsMap = new Map(workflow.transitions.map(t => [t.id, t]))

    // Create nodes from states
    const nodes: Node[] = workflow.states.map((state, index) => ({
      id: state.id,
      type: 'workflowState',
      position: {
        x: 200 + (index % 3) * 300,
        y: 100 + Math.floor(index / 3) * 200,
      },
      data: state,
    }))

    // Create edges from transitions
    const edges: Edge[] = workflow.transitions.map(transition => ({
      id: transition.id,
      source: transition.from,
      target: transition.to,
      label: transition.label,
      type: 'smoothstep',
      animated: true,
    }))

    set({
      workflowId: workflow.id,
      name: workflow.name,
      description: workflow.description,
      category: workflow.category,
      version: workflow.version,
      isActive: workflow.isActive,
      states: statesMap,
      transitions: transitionsMap,
      fields: workflow.fields || [],
      assignmentRules: workflow.assignmentRules || [],
      settings: workflow.settings,
      nodes,
      edges,
    })
  },

  resetWorkflow: () => {
    set({
      workflowId: null,
      name: '',
      description: '',
      category: 'approval',
      version: '1.0',
      isActive: true,
      nodes: [],
      edges: [],
      states: new Map(),
      transitions: new Map(),
      fields: [],
      assignmentRules: [],
      settings: initialSettings,
      selectedNode: null,
      selectedEdge: null,
      selectedField: null,
      showStateConfig: false,
      showTransitionConfig: false,
      showFieldConfig: false,
      showRulesConfig: false,
      showSettings: false,
    })
  },

  validateWorkflow: () => {
    const state = get()
    const errors: string[] = []

    if (!state.name || state.name.trim().length === 0) {
      errors.push('Workflow name is required')
    }

    if (state.states.size === 0) {
      errors.push('Workflow must have at least one state')
    }

    const initialStates = Array.from(state.states.values()).filter(s => s.isInitial)
    if (initialStates.length === 0) {
      errors.push('Workflow must have exactly one initial state')
    } else if (initialStates.length > 1) {
      errors.push('Workflow can only have one initial state')
    }

    const finalStates = Array.from(state.states.values()).filter(s => s.isFinal)
    if (finalStates.length === 0) {
      errors.push('Workflow must have at least one final state')
    }

    // Validate transitions reference valid states
    state.transitions.forEach((transition, id) => {
      if (!state.states.has(transition.from)) {
        errors.push(`Transition "${transition.label}" references unknown state: ${transition.from}`)
      }
      if (!state.states.has(transition.to)) {
        errors.push(`Transition "${transition.label}" references unknown state: ${transition.to}`)
      }
    })

    return {
      valid: errors.length === 0,
      errors,
    }
  },
}))
