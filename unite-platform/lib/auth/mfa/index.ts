// Multi-Factor Authentication Service for Unite Platform
import { TokenPayload } from '@/lib/auth';
import { SharePointService } from '@/lib/sharepoint';
import { AuditService } from '@/lib/audit';
import { randomBytes, createHmac } from 'crypto';

export interface MfaMethod {
  id: string;
  userId: string;
  methodType: 'totp' | 'sms' | 'email';
  secret?: string;
  phoneNumber?: string;
  email?: string;
  isActive: boolean;
  enrolledAt: string;
  verifiedAt?: string;
}

export interface MfaVerificationAttempt {
  id: string;
  userId: string;
  methodId: string;
  attemptAt: string;
  success: boolean;
  ipAddress?: string;
  userAgent?: string;
}

export class MfaService {
  private sharepointService: SharePointService;
  private auditService: AuditService;

  constructor(sharepointService: SharePointService, auditService: AuditService) {
    this.sharepointService = sharepointService;
    this.auditService = auditService;
  }

  // Generate a secret for TOTP
  generateSecret(): string {
    return randomBytes(32).toString('base32');
  }

  // Generate a QR code URL for TOTP setup
  generateTotpUri(secret: string, issuer: string, user: string): string {
    const encodedSecret = encodeURIComponent(secret);
    const encodedIssuer = encodeURIComponent(issuer);
    const encodedUser = encodeURIComponent(user);
    return `otpauth://totp/${issuer}:${user}?secret=${encodedSecret}&issuer=${encodedIssuer}`;
  }

  // Enroll a user in MFA
  async enrollUser(
    user: TokenPayload,
    methodType: 'totp' | 'sms' | 'email',
    phoneNumber?: string,
    email?: string
  ): Promise<MfaMethod> {
    // Generate a secret for TOTP
    let secret: string | undefined;
    if (methodType === 'totp') {
      secret = this.generateSecret();
    }

    const mfaMethod: MfaMethod = {
      id: this.generateId(),
      userId: user.oid,
      methodType,
      secret,
      phoneNumber: methodType === 'sms' ? phoneNumber : undefined,
      email: methodType === 'email' ? email : undefined,
      isActive: false,
      enrolledAt: new Date().toISOString()
    };

    // Store MFA method in SharePoint
    await this.sharepointService.addListItem('mfaMethodsListId', {
      Id: mfaMethod.id,
      UserId: mfaMethod.userId,
      MethodType: mfaMethod.methodType,
      Secret: mfaMethod.secret,
      PhoneNumber: mfaMethod.phoneNumber,
      Email: mfaMethod.email,
      IsActive: mfaMethod.isActive,
      EnrolledAt: mfaMethod.enrolledAt
    });

    // Log the enrollment
    await this.auditService.createAuditEvent(
      'mfa.enrolled',
      user.upn,
      {
        userId: user.oid,
        methodType,
        methodId: mfaMethod.id
      },
      'mfa_enrollment_' + mfaMethod.id,
      'unite-auth'
    );

    return mfaMethod;
  }

  // Verify MFA enrollment
  async verifyEnrollment(user: TokenPayload, methodId: string, code: string): Promise<boolean> {
    const method = await this.getMfaMethod(methodId);
    if (!method || method.userId !== user.oid) {
      throw new Error('Invalid MFA method or unauthorized');
    }

    if (method.methodType === 'totp') {
      if (!method.secret) {
        throw new Error('MFA method does not have a secret');
      }
      
      const isValid = this.verifyTotpCode(method.secret, code);
      if (isValid) {
        // Activate the method
        method.isActive = true;
        method.verifiedAt = new Date().toISOString();
        
        await this.updateMfaMethod(method);
        
        // Log the verification
        await this.auditService.createAuditEvent(
          'mfa.verified',
          user.upn,
          {
            userId: user.oid,
            methodId,
            methodType: method.methodType
          },
          'mfa_verification_' + methodId,
          'unite-auth'
        );
      }
      
      return isValid;
    }

    // For SMS/email, we would need to implement actual verification
    // This is a simplified version
    throw new Error('SMS and email verification not implemented in this example');
  }

  // Verify MFA during login
  async verifyMfa(user: TokenPayload, methodId: string, code: string, ipAddress?: string, userAgent?: string): Promise<boolean> {
    const method = await this.getMfaMethod(methodId);
    if (!method || !method.isActive) {
      throw new Error('Invalid or inactive MFA method');
    }

    let isValid = false;
    if (method.methodType === 'totp') {
      if (!method.secret) {
        throw new Error('MFA method does not have a secret');
      }
      isValid = this.verifyTotpCode(method.secret, code);
    } else {
      // For SMS/email, we would verify the code sent to the user
      throw new Error('SMS and email verification not implemented in this example');
    }

    // Log the verification attempt
    const attempt: MfaVerificationAttempt = {
      id: this.generateId(),
      userId: user.oid,
      methodId,
      attemptAt: new Date().toISOString(),
      success: isValid,
      ipAddress,
      userAgent
    };

    await this.sharepointService.addListItem('mfaVerificationAttemptsListId', {
      Id: attempt.id,
      UserId: attempt.userId,
      MethodId: attempt.methodId,
      AttemptAt: attempt.attemptAt,
      Success: attempt.success,
      IpAddress: attempt.ipAddress,
      UserAgent: attempt.userAgent
    });

    // Log the authentication event
    await this.auditService.createAuditEvent(
      isValid ? 'mfa.verified' : 'mfa.failed',
      user.upn,
      {
        userId: user.oid,
        methodId,
        methodType: method.methodType,
        success: isValid,
        ipAddress,
        userAgent
      },
      'mfa_auth_' + methodId + '_' + Date.now(),
      'unite-auth'
    );

    return isValid;
  }

  // Get MFA methods for a user
  async getMfaMethodsForUser(userId: string): Promise<MfaMethod[]> {
    const methodsList = await this.sharepointService.getListItems('mfaMethodsListId');
    return methodsList
      .filter(item => item.fields.UserId === userId)
      .map(item => ({
        id: item.fields.Id,
        userId: item.fields.UserId,
        methodType: item.fields.MethodType,
        secret: item.fields.Secret,
        phoneNumber: item.fields.PhoneNumber,
        email: item.fields.Email,
        isActive: item.fields.IsActive,
        enrolledAt: item.fields.EnrolledAt,
        verifiedAt: item.fields.VerifiedAt
      }));
  }

  // Get a specific MFA method
  private async getMfaMethod(methodId: string): Promise<MfaMethod | null> {
    const methodsList = await this.sharepointService.getListItems('mfaMethodsListId');
    const item = methodsList.find(m => m.fields.Id === methodId);
    
    if (!item) {
      return null;
    }
    
    return {
      id: item.fields.Id,
      userId: item.fields.UserId,
      methodType: item.fields.MethodType,
      secret: item.fields.Secret,
      phoneNumber: item.fields.PhoneNumber,
      email: item.fields.Email,
      isActive: item.fields.IsActive,
      enrolledAt: item.fields.EnrolledAt,
      verifiedAt: item.fields.VerifiedAt
    };
  }

  // Update an MFA method
  private async updateMfaMethod(method: MfaMethod): Promise<void> {
    await this.sharepointService.updateListItem('mfaMethodsListId', method.id, {
      IsActive: method.isActive,
      VerifiedAt: method.verifiedAt
    });
  }

  // Remove an MFA method
  async removeMfaMethod(user: TokenPayload, methodId: string): Promise<void> {
    const method = await this.getMfaMethod(methodId);
    if (!method || method.userId !== user.oid) {
      throw new Error('Invalid MFA method or unauthorized');
    }

    // In a real implementation, we would soft-delete or mark as inactive
    // For this example, we'll just deactivate
    method.isActive = false;
    await this.updateMfaMethod(method);

    // Log the removal
    await this.auditService.createAuditEvent(
      'mfa.removed',
      user.upn,
      {
        userId: user.oid,
        methodId,
        methodType: method.methodType
      },
      'mfa_removal_' + methodId,
      'unite-auth'
    );
  }

  // Verify TOTP code
  private verifyTotpCode(secret: string, code: string, window: number = 1): boolean {
    // In a real implementation, we would use a proper TOTP library
    // This is a simplified version for demonstration purposes
    const epoch = Math.floor(Date.now() / 1000 / 30); // 30-second intervals
    const expectedCode = this.generateTotp(secret, epoch);
    
    // Check the current window and adjacent windows
    for (let i = -window; i <= window; i++) {
      const timeSlice = epoch + i;
      const expectedCode = this.generateTotp(secret, timeSlice);
      if (expectedCode === code) {
        return true;
      }
    }
    
    return false;
  }

  // Generate TOTP code (simplified for demonstration)
  private generateTotp(secret: string, epoch: number): string {
    // In a real implementation, we would use a proper algorithm like HMAC-SHA1
    // This is just a placeholder for demonstration
    const hmac = createHmac('sha1', Buffer.from(secret, 'base32'));
    hmac.update(Buffer.from(epoch.toString()));
    const hash = hmac.digest('hex');
    
    // This is a simplified version - real TOTP is more complex
    return hash.substring(0, 6).replace(/\D/g, '').substring(0, 6) || '000000';
  }

  // Generate a unique ID
  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
  }
}
