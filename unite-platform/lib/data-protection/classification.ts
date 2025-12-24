// Data Classification and Labeling Service for Unite Platform
import { SharePointService } from '@/lib/sharepoint';
import { AuditService } from '@/lib/audit';

export enum DataClassification {
  Public = 'Public',
  Internal = 'Internal',
  Confidential = 'Confidential',
  HighlyConfidential = 'HighlyConfidential',
  Restricted = 'Restricted'
}

export interface DataLabel {
  id: string;
  name: string;
  classification: DataClassification;
  description: string;
  color: string; // Color code for UI representation
  icon: string; // Icon name for UI representation
  allowedAccessLevels: string[]; // Who can access this classification
  retentionPeriod: number; // In days
  automaticLabelingRules: string[]; // Rules for automatic classification
  createdAt: string;
  updatedAt: string;
}

export interface ClassifiedData {
  id: string;
  docStableId: string;
  classification: DataClassification;
  labelId: string;
  customLabels: string[];
  sensitivity: number; // 1-10 scale
  piiDetected: boolean;
  pciDetected: boolean;
  hipaaDetected: boolean;
  gdprDetected: boolean;
  classificationReason: string;
  classifiedBy: string; // User ID
  classifiedAt: string;
  lastReviewedAt?: string;
  reviewDueDate: string;
}

export interface ClassificationRule {
  id: string;
  name: string;
  description: string;
  pattern: string; // Regex pattern
  classification: DataClassification;
  confidenceThreshold: number; // 0-100 percentage
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export class DataClassificationService {
  private sharepointService: SharePointService;
  private auditService: AuditService;

  constructor(sharepointService: SharePointService, auditService: AuditService) {
    this.sharepointService = sharepointService;
    this.auditService = auditService;
  }

  // Create a new data label
  async createLabel(
    name: string,
    classification: DataClassification,
    description: string,
    color: string,
    icon: string,
    allowedAccessLevels: string[],
    retentionPeriod: number,
    automaticLabelingRules: string[]
  ): Promise<DataLabel> {
    const labelId = this.generateId();
    const label: DataLabel = {
      id: labelId,
      name,
      classification,
      description,
      color,
      icon,
      allowedAccessLevels,
      retentionPeriod,
      automaticLabelingRules,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    // Store label in SharePoint
    await this.sharepointService.addListItem('dataLabelsListId', {
      Id: labelId,
      Name: name,
      Classification: classification,
      Description: description,
      Color: color,
      Icon: icon,
      AllowedAccessLevels: allowedAccessLevels.join(','),
      RetentionPeriod: retentionPeriod,
      AutomaticLabelingRules: automaticLabelingRules.join(','),
      CreatedAt: label.createdAt,
      UpdatedAt: label.updatedAt
    });

    // Log the label creation
    await this.auditService.createAuditEvent(
      'data_label.created',
      'system',
      {
        labelId,
        name,
        classification
      },
      'create_data_label_' + labelId,
      'data-protection'
    );

    return label;
  }

  // Classify a document automatically
  async classifyDocument(
    docStableId: string,
    content: string,
    fileName: string,
    classifiedBy: string
  ): Promise<ClassifiedData> {
    const classificationResult = await this.analyzeContent(content, fileName);
    const classifiedDataId = this.generateId();

    const classifiedData: ClassifiedData = {
      id: classifiedDataId,
      docStableId,
      classification: classificationResult.classification,
      labelId: classificationResult.labelId,
      customLabels: classificationResult.customLabels,
      sensitivity: classificationResult.sensitivity,
      piiDetected: classificationResult.piiDetected,
      pciDetected: classificationResult.pciDetected,
      hipaaDetected: classificationResult.hipaaDetected,
      gdprDetected: classificationResult.gdprDetected,
      classificationReason: classificationResult.reason,
      classifiedBy,
      classifiedAt: new Date().toISOString(),
      reviewDueDate: this.calculateReviewDate(classificationResult.classification)
    };

    // Store classification in SharePoint
    await this.sharepointService.addListItem('documentClassificationsListId', {
      Id: classifiedDataId,
      DocStableId: docStableId,
      Classification: classificationResult.classification,
      LabelId: classificationResult.labelId,
      CustomLabels: classificationResult.customLabels.join(','),
      Sensitivity: classificationResult.sensitivity,
      PiiDetected: classificationResult.piiDetected,
      PciDetected: classificationResult.pciDetected,
      HipaaDetected: classificationResult.hipaaDetected,
      GdprDetected: classificationResult.gdprDetected,
      ClassificationReason: classificationResult.reason,
      ClassifiedBy: classifiedBy,
      ClassifiedAt: classifiedData.classifiedAt,
      ReviewDueDate: classifiedData.reviewDueDate
    });

    // Log the classification event
    await this.auditService.createAuditEvent(
      'document.classified',
      classifiedBy,
      {
        docStableId,
        classification: classificationResult.classification,
        sensitivity: classificationResult.sensitivity,
        piiDetected: classificationResult.piiDetected
      },
      'classify_doc_' + docStableId,
      'data-protection'
    );

    return classifiedData;
  }

  // Analyze content to determine classification
  private async analyzeContent(content: string, fileName: string): Promise<{
    classification: DataClassification;
    labelId: string;
    customLabels: string[];
    sensitivity: number;
    piiDetected: boolean;
    pciDetected: boolean;
    hipaaDetected: boolean;
    gdprDetected: boolean;
    reason: string;
  }> {
    // Check for PII patterns
    const piiPatterns = [
      /\b\d{3}-\d{2}-\d{4}\b/, // SSN
      /\b\d{16}\b/, // Credit card
      /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i, // Email
      /\b\d{3}-\d{3}-\d{4}\b/ // Phone
    ];
    
    const piiDetected = piiPatterns.some(pattern => pattern.test(content));
    
    // Check for PCI patterns
    const pciDetected = /\b(?:\d{4}[-\s]?){3}\d{4}\b/.test(content);
    
    // Check for HIPAA patterns (simplified)
    const hipaaDetected = piiDetected && (
      content.toLowerCase().includes('medical') ||
      content.toLowerCase().includes('health') ||
      content.toLowerCase().includes('patient')
    );
    
    // Check for GDPR patterns
    const gdprDetected = piiDetected && (
      content.toLowerCase().includes('european') ||
      content.toLowerCase().includes('eu citizen') ||
      content.toLowerCase().includes('gdpr')
    );

    // Determine classification based on detected patterns and content
    let classification: DataClassification = DataClassification.Public;
    let sensitivity = 1;
    let reason = 'Content analysis determined classification';

    if (gdprDetected || hipaaDetected) {
      classification = DataClassification.HighlyConfidential;
      sensitivity = 10;
      reason = 'GDPR/hipaa data detected';
    } else if (pciDetected) {
      classification = DataClassification.Confidential;
      sensitivity = 8;
      reason = 'PCI data detected';
    } else if (piiDetected) {
      classification = DataClassification.Restricted;
      sensitivity = 7;
      reason = 'PII data detected';
    } else if (fileName.toLowerCase().includes('confidential')) {
      classification = DataClassification.Confidential;
      sensitivity = 6;
      reason = 'File name indicates confidentiality';
    } else if (fileName.toLowerCase().includes('internal')) {
      classification = DataClassification.Internal;
      sensitivity = 3;
      reason = 'File name indicates internal use';
    }

    return {
      classification,
      labelId: this.getLabelIdForClassification(classification),
      customLabels: this.generateCustomLabels(content),
      sensitivity,
      piiDetected,
      pciDetected,
      hipaaDetected,
      gdprDetected,
      reason
    };
  }

  // Generate custom labels based on content
  private generateCustomLabels(content: string): string[] {
    const labels: string[] = [];
    const contentLower = content.toLowerCase();
    
    if (contentLower.includes('financial') || contentLower.includes('budget')) {
      labels.push('Financial');
    }
    if (contentLower.includes('employee') || contentLower.includes('hr')) {
      labels.push('HR');
    }
    if (contentLower.includes('contract') || contentLower.includes('agreement')) {
      labels.push('Legal');
    }
    if (contentLower.includes('strategy') || contentLower.includes('planning')) {
      labels.push('Strategic');
    }
    
    return labels;
  }

  // Get label ID for classification
  private getLabelIdForClassification(classification: DataClassification): string {
    // In a real implementation, this would look up the appropriate label ID
    // For this example, we'll return a generic ID
    return classification.toLowerCase() + '_label';
  }

  // Calculate review date based on classification
  private calculateReviewDate(classification: DataClassification): string {
    let daysToAdd = 365; // Default to 1 year
    
    switch (classification) {
      case DataClassification.HighlyConfidential:
        daysToAdd = 180; // 6 months
        break;
      case DataClassification.Confidential:
        daysToAdd = 365; // 1 year
        break;
      case DataClassification.Restricted:
        daysToAdd = 180; // 6 months
        break;
      case DataClassification.Internal:
        daysToAdd = 730; // 2 years
        break;
      case DataClassification.Public:
        daysToAdd = 1460; // 4 years
        break;
    }
    
    const reviewDate = new Date();
    reviewDate.setDate(reviewDate.getDate() + daysToAdd);
    return reviewDate.toISOString();
  }

  // Get classification for a document
  async getClassificationForDocument(docStableId: string): Promise<ClassifiedData | null> {
    const classificationsList = await this.sharepointService.getListItems('documentClassificationsListId');
    const item = classificationsList.find(c => c.fields.DocStableId === docStableId);
    
    if (!item) {
      return null;
    }
    
    return {
      id: item.fields.Id,
      docStableId: item.fields.DocStableId,
      classification: item.fields.Classification,
      labelId: item.fields.LabelId,
      customLabels: item.fields.CustomLabels ? item.fields.CustomLabels.split(',') : [],
      sensitivity: item.fields.Sensitivity,
      piiDetected: item.fields.PiiDetected,
      pciDetected: item.fields.PciDetected,
      hipaaDetected: item.fields.HipaaDetected,
      gdprDetected: item.fields.GdprDetected,
      classificationReason: item.fields.ClassificationReason,
      classifiedBy: item.fields.ClassifiedBy,
      classifiedAt: item.fields.ClassifiedAt,
      lastReviewedAt: item.fields.LastReviewedAt,
      reviewDueDate: item.fields.ReviewDueDate
    };
  }

  // Update document classification
  async updateClassification(
    docStableId: string,
    classification: DataClassification,
    updatedBy: string
  ): Promise<ClassifiedData> {
    const existingClassification = await this.getClassificationForDocument(docStableId);
    
    if (!existingClassification) {
      throw new Error('Document classification not found');
    }

    // Update the classification
    existingClassification.classification = classification;
    existingClassification.classifiedBy = updatedBy;
    existingClassification.classifiedAt = new Date().toISOString();
    existingClassification.reviewDueDate = this.calculateReviewDate(classification);

    // Update in SharePoint
    await this.sharepointService.updateListItem('documentClassificationsListId', existingClassification.id, {
      Classification: classification,
      ClassifiedBy: updatedBy,
      ClassifiedAt: existingClassification.classifiedAt,
      ReviewDueDate: existingClassification.reviewDueDate
    });

    // Log the update
    await this.auditService.createAuditEvent(
      'document.classification.updated',
      updatedBy,
      {
        docStableId,
        newClassification: classification
      },
      'update_classification_' + docStableId,
      'data-protection'
    );

    return existingClassification;
  }

  // Generate a unique ID
  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
  }
}
