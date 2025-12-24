// Governance-Specific Validation Service for Unite Platform
import { TokenPayload } from '@/lib/auth';
import { AccessControlService, UserPermissions } from '@/lib/access';

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export class GovernanceValidationService {
  private accessControlService: AccessControlService;

  constructor(accessControlService: AccessControlService) {
    this.accessControlService = accessControlService;
  }

  // Validate policy creation request
  async validatePolicyCreation(
    user: TokenPayload,
    title: string,
    content: string,
    category: string,
    relatedDocuments: string[]
  ): Promise<ValidationResult> {
    const result: ValidationResult = {
      isValid: true,
      errors: [],
      warnings: []
    };

    // Check user permissions
    const permissions = await this.accessControlService.getUserPermissions(user);
    if (!permissions.canManagePolicies) {
      result.isValid = false;
      result.errors.push('User does not have permission to create policies');
      return result;
    }

    // Validate required fields
    if (!title || title.trim().length === 0) {
      result.isValid = false;
      result.errors.push('Policy title is required');
    } else if (title.length > 255) {
      result.isValid = false;
      result.errors.push('Policy title must be 255 characters or less');
    }

    if (!content || content.trim().length === 0) {
      result.isValid = false;
      result.errors.push('Policy content is required');
    }

    if (!category || category.trim().length === 0) {
      result.isValid = false;
      result.errors.push('Policy category is required');
    }

    // Validate related documents
    if (relatedDocuments && relatedDocuments.length > 10) {
      result.warnings.push('More than 10 related documents referenced - consider consolidation');
    }

    return result;
  }

  // Validate meeting creation request
  async validateMeetingCreation(
    user: TokenPayload,
    title: string,
    committee: string,
    scheduledDate: string,
    attendees: string[]
  ): Promise<ValidationResult> {
    const result: ValidationResult = {
      isValid: true,
      errors: [],
      warnings: []
    };

    // Check user permissions
    const permissions = await this.accessControlService.getUserPermissions(user);
    if (!permissions.canManageMeetings) {
      result.isValid = false;
      result.errors.push('User does not have permission to create meetings');
      return result;
    }

    // Validate required fields
    if (!title || title.trim().length === 0) {
      result.isValid = false;
      result.errors.push('Meeting title is required');
    } else if (title.length > 255) {
      result.isValid = false;
      result.errors.push('Meeting title must be 255 characters or less');
    }

    if (!committee || committee.trim().length === 0) {
      result.isValid = false;
      result.errors.push('Committee is required');
    }

    // Validate scheduled date
    if (!scheduledDate) {
      result.isValid = false;
      result.errors.push('Scheduled date is required');
    } else {
      const scheduledDateObj = new Date(scheduledDate);
      if (isNaN(scheduledDateObj.getTime())) {
        result.isValid = false;
        result.errors.push('Invalid scheduled date format');
      } else if (scheduledDateObj < new Date()) {
        result.warnings.push('Meeting is scheduled in the past');
      }
    }

    // Validate attendees
    if (attendees && attendees.length === 0) {
      result.warnings.push('No attendees specified for the meeting');
    }

    return result;
  }

  // Validate appeal submission request
  async validateAppealSubmission(
    user: TokenPayload,
    title: string,
    description: string,
    category: string,
    college: string,
    gdprAgreed: boolean
  ): Promise<ValidationResult> {
    const result: ValidationResult = {
      isValid: true,
      errors: [],
      warnings: []
    };

    // Check user permissions
    const permissions = await this.accessControlService.getUserPermissions(user);
    if (!permissions.canManageAppeals) {
      result.isValid = false;
      result.errors.push('User does not have permission to submit appeals');
      return result;
    }

    // Validate required fields
    if (!title || title.trim().length === 0) {
      result.isValid = false;
      result.errors.push('Appeal title is required');
    } else if (title.length > 255) {
      result.isValid = false;
      result.errors.push('Appeal title must be 255 characters or less');
    }

    if (!description || description.trim().length === 0) {
      result.isValid = false;
      result.errors.push('Appeal description is required');
    } else if (description.length > 5000) {
      result.isValid = false;
      result.errors.push('Appeal description exceeds 5000 characters');
    }

    if (!category || category.trim().length === 0) {
      result.isValid = false;
      result.errors.push('Appeal category is required');
    }

    if (!college || college.trim().length === 0) {
      result.isValid = false;
      result.errors.push('College is required');
    }

    // Validate GDPR consent
    if (!gdprAgreed) {
      result.isValid = false;
      result.errors.push('GDPR consent is required to submit an appeal');
    }

    return result;
  }

  // Validate user management request
  async validateUserManagement(
    user: TokenPayload,
    action: string,
    targetUserId: string
  ): Promise<ValidationResult> {
    const result: ValidationResult = {
      isValid: true,
      errors: [],
      warnings: []
    };

    // Check user permissions
    const permissions = await this.accessControlService.getUserPermissions(user);
    if (!permissions.canManageUsers) {
      result.isValid = false;
      result.errors.push('User does not have permission to manage users');
      return result;
    }

    // Validate action
    const validActions = ['create', 'update', 'deactivate', 'change-role'];
    if (!validActions.includes(action)) {
      result.isValid = false;
      result.errors.push(`Invalid user management action: ${action}`);
    }

    // Validate target user ID
    if (!targetUserId || targetUserId.trim().length === 0) {
      result.isValid = false;
      result.errors.push('Target user ID is required');
    }

    return result;
  }

  // Validate document access request
  async validateDocumentAccess(
    user: TokenPayload,
    docStableId: string,
    action: 'read' | 'write' | 'approve' | 'publish' | 'redact' | 'rescind'
  ): Promise<ValidationResult> {
    const result: ValidationResult = {
      isValid: true,
      errors: [],
      warnings: []
    };

    // Validate document ID
    if (!docStableId || docStableId.trim().length === 0) {
      result.isValid = false;
      result.errors.push('Document ID is required');
    }

    // Validate action
    if (!action) {
      result.isValid = false;
      result.errors.push('Action is required');
    }

    return result;
  }

  // Validate governance-specific business rules
  async validateGovernanceBusinessRules(
    user: TokenPayload,
    action: string,
    context: any
  ): Promise<ValidationResult> {
    const result: ValidationResult = {
      isValid: true,
      errors: [],
      warnings: []
    };

    // Example business rule: Only executives can approve policies
    if (action === 'policy.approve') {
      const permissions = await this.accessControlService.getUserPermissions(user);
      if (permissions.accessLevel !== 'Executive' && permissions.accessLevel !== 'Admin') {
        result.isValid = false;
        result.errors.push('Only Executive or Admin users can approve policies');
      }
    }

    // Example business rule: Appeals must have sufficient detail
    if (action === 'appeal.submit' && context.description) {
      if (context.description.length < 50) {
        result.warnings.push('Appeal description should provide more detail for proper review');
      }
    }

    return result;
  }
}
