// Input Validation Utilities for Unite Platform
// Provides sanitization and validation for API inputs

export class ValidationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ValidationError'
  }
}

/**
 * Validate and sanitize document title
 */
export function validateTitle(title: unknown): string {
  if (typeof title !== 'string') {
    throw new ValidationError('Title must be a string')
  }

  const trimmed = title.trim()

  if (trimmed.length === 0) {
    throw new ValidationError('Title cannot be empty')
  }

  if (trimmed.length > 255) {
    throw new ValidationError('Title exceeds maximum length of 255 characters')
  }

  // Check for potentially malicious patterns
  if (/<script|javascript:|onerror=/i.test(trimmed)) {
    throw new ValidationError('Title contains invalid characters')
  }

  return trimmed
}

/**
 * Validate and sanitize description
 */
export function validateDescription(description: unknown): string {
  if (description === null || description === undefined) {
    return ''
  }

  if (typeof description !== 'string') {
    throw new ValidationError('Description must be a string')
  }

  const trimmed = description.trim()

  if (trimmed.length > 5000) {
    throw new ValidationError('Description exceeds maximum length of 5000 characters')
  }

  return trimmed
}

/**
 * Validate docStableId format
 */
export function validateDocStableId(docStableId: unknown): string {
  if (typeof docStableId !== 'string') {
    throw new ValidationError('Document ID must be a string')
  }

  const trimmed = docStableId.trim()

  if (trimmed.length === 0) {
    throw new ValidationError('Document ID cannot be empty')
  }

  // Validate format: DOC-[base36timestamp]-[randompart]
  if (!/^DOC-[A-Z0-9]+-[A-Z0-9]+$/i.test(trimmed)) {
    throw new ValidationError('Invalid document ID format')
  }

  return trimmed
}

/**
 * Validate user ID (OID from Entra ID)
 */
export function validateUserId(userId: unknown): string {
  if (typeof userId !== 'string') {
    throw new ValidationError('User ID must be a string')
  }

  const trimmed = userId.trim()

  if (trimmed.length === 0) {
    throw new ValidationError('User ID cannot be empty')
  }

  // Validate GUID format
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(trimmed)) {
    throw new ValidationError('Invalid user ID format')
  }

  return trimmed
}

/**
 * Validate committee ID
 */
export function validateCommitteeId(committeeId: unknown): string {
  if (typeof committeeId !== 'string') {
    throw new ValidationError('Committee ID must be a string')
  }

  const trimmed = committeeId.trim()

  if (trimmed.length === 0) {
    throw new ValidationError('Committee ID cannot be empty')
  }

  if (trimmed.length > 100) {
    throw new ValidationError('Committee ID exceeds maximum length')
  }

  // Only allow alphanumeric, hyphens, and underscores
  if (!/^[a-zA-Z0-9_-]+$/.test(trimmed)) {
    throw new ValidationError('Committee ID contains invalid characters')
  }

  return trimmed
}

/**
 * Validate action parameter
 */
export function validateAction(action: unknown, allowedActions: string[]): string {
  if (typeof action !== 'string') {
    throw new ValidationError('Action must be a string')
  }

  const trimmed = action.trim()

  if (!allowedActions.includes(trimmed)) {
    throw new ValidationError(`Invalid action. Allowed actions: ${allowedActions.join(', ')}`)
  }

  return trimmed
}

/**
 * Validate array of strings
 */
export function validateStringArray(arr: unknown, fieldName: string, maxLength: number = 100): string[] {
  if (!Array.isArray(arr)) {
    throw new ValidationError(`${fieldName} must be an array`)
  }

  if (arr.length > maxLength) {
    throw new ValidationError(`${fieldName} exceeds maximum length of ${maxLength}`)
  }

  const validated: string[] = []
  for (const item of arr) {
    if (typeof item !== 'string') {
      throw new ValidationError(`All items in ${fieldName} must be strings`)
    }
    validated.push(item.trim())
  }

  return validated
}

/**
 * Validate file size
 */
export function validateFileSize(size: number, maxSizeMB: number = 50): void {
  if (typeof size !== 'number' || size < 0) {
    throw new ValidationError('Invalid file size')
  }

  const maxBytes = maxSizeMB * 1024 * 1024
  if (size > maxBytes) {
    throw new ValidationError(`File size exceeds maximum of ${maxSizeMB}MB`)
  }
}

/**
 * Validate pagination parameters
 */
export function validatePagination(page: unknown, limit: unknown): { page: number; limit: number } {
  let pageNum = 1
  let limitNum = 20

  if (page !== undefined && page !== null) {
    pageNum = parseInt(String(page), 10)
    if (isNaN(pageNum) || pageNum < 1) {
      throw new ValidationError('Page must be a positive integer')
    }
  }

  if (limit !== undefined && limit !== null) {
    limitNum = parseInt(String(limit), 10)
    if (isNaN(limitNum) || limitNum < 1 || limitNum > 100) {
      throw new ValidationError('Limit must be between 1 and 100')
    }
  }

  return { page: pageNum, limit: limitNum }
}

/**
 * Sanitize reason/comment text
 */
export function validateReason(reason: unknown): string | undefined {
  if (reason === null || reason === undefined) {
    return undefined
  }

  if (typeof reason !== 'string') {
    throw new ValidationError('Reason must be a string')
  }

  const trimmed = reason.trim()

  if (trimmed.length > 2000) {
    throw new ValidationError('Reason exceeds maximum length of 2000 characters')
  }

  return trimmed.length > 0 ? trimmed : undefined
}

/**
 * Validate email address
 */
export function validateEmail(email: unknown): string {
  if (typeof email !== 'string') {
    throw new ValidationError('Email must be a string')
  }

  const trimmed = email.trim().toLowerCase()

  // Basic email validation
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
    throw new ValidationError('Invalid email format')
  }

  if (trimmed.length > 254) {
    throw new ValidationError('Email exceeds maximum length')
  }

  return trimmed
}
