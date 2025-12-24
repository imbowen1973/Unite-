// GDPR Documentation Center Component with Share Auditing
'use client';

import React, { useState, useEffect } from 'react';
import { AuditService } from '@/lib/audit';
import { TokenPayload } from '@/lib/auth';

interface GdprDocument {
  id: string;
  title: string;
  description: string;
  type: 'policy' | 'assessment' | 'consent' | 'procedure' | 'training' | 'breach-report';
  date: string;
  author: string;
  status: 'draft' | 'review' | 'approved' | 'archived';
  shareableLink: string;
  relatedDocuments: string[];
  tags: string[];
}

interface ShareAuditEvent {
  id: string;
  documentId: string;
  sharedBy: string;
  sharedWith: string; // Could be email or user ID
  shareLink: string;
  timestamp: string;
  accessCount: number;
  lastAccessed?: string;
}

interface GdprDocumentationCenterProps {
  documents: GdprDocument[];
  currentUser: TokenPayload;
  onDocumentClick?: (doc: GdprDocument) => void;
}

const GdprDocumentationCenter: React.FC<GdprDocumentationCenterProps> = ({ 
  documents = [],
  currentUser,
  onDocumentClick 
}) => {
  const [filter, setFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [showShareModal, setShowShareModal] = useState<boolean>(false);
  const [selectedDocument, setSelectedDocument] = useState<GdprDocument | null>(null);
  const [shareAudits, setShareAudits] = useState<ShareAuditEvent[]>([]);
  const [copiedLink, setCopiedLink] = useState<string | null>(null);

  // Initialize audit service
  const auditService = new AuditService({} as any); // In a real app, this would be properly initialized

  const documentTypes = [
    { value: 'all', label: 'All Documents' },
    { value: 'policy', label: 'Privacy Policies' },
    { value: 'assessment', label: 'LIAs & DPIAs' },
    { value: 'consent', label: 'Consent Records' },
    { value: 'procedure', label: 'Procedures' },
    { value: 'training', label: 'Training Materials' },
    { value: 'breach-report', label: 'Breach Reports' }
  ];

  // Load existing share audits
  useEffect(() => {
    // In a real implementation, this would fetch from SharePoint or database
    const mockAudits: ShareAuditEvent[] = [
      {
        id: 'audit-1',
        documentId: documents[0]?.id || 'doc-1',
        sharedBy: currentUser.upn,
        sharedWith: 'recipient@example.com',
        shareLink: documents[0]?.shareableLink || '#',
        timestamp: new Date().toISOString(),
        accessCount: 3,
        lastAccessed: new Date(Date.now() - 86400000).toISOString() // 1 day ago
      }
    ];
    setShareAudits(mockAudits);
  }, [documents, currentUser]);

  const filteredDocuments = documents.filter(doc => {
    const matchesType = filter === 'all' || doc.type === filter;
    const matchesSearch = doc.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          doc.description.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesType && matchesSearch;
  });

  const handleShare = async (doc: GdprDocument) => {
    setSelectedDocument(doc);
    setShowShareModal(true);
    
    // Create share audit event
    const shareAuditEvent: ShareAuditEvent = {
      id: `share-${Date.now()}`,
      documentId: doc.id,
      sharedBy: currentUser.upn,
      sharedWith: 'external-recipient', // This would be captured from input in a real app
      shareLink: doc.shareableLink,
      timestamp: new Date().toISOString(),
      accessCount: 0
    };

    // Add to local state
    setShareAudits(prev => [shareAuditEvent, ...prev]);

    // Copy link to clipboard
    try {
      await navigator.clipboard.writeText(doc.shareableLink);
      setCopiedLink(doc.shareableLink);
      
      // Show success feedback
      console.log('Link copied to clipboard');
      
      // Log the share event in audit trail
      await auditService.createAuditEvent(
        'gdpr_document.shared',
        currentUser.upn,
        {
          documentId: doc.id,
          documentTitle: doc.title,
          shareLink: doc.shareableLink,
          sharedWith: 'external-recipient' // In real app, this would be specific recipient
        },
        `share_gdpr_doc_${doc.id}_${Date.now()}`,
        'gdpr-compliance'
      );
    } catch (err) {
      console.error('Failed to copy link: ', err);
    }

    // Clear the copied indicator after 2 seconds
    setTimeout(() => setCopiedLink(null), 2000);
  };

  // Function to handle when a shared link is opened
  const handleSharedLinkOpened = async (shareLinkId: string, documentId: string) => {
    // Update the share audit record
    setShareAudits(prev => prev.map(audit => {
      if (audit.id === shareLinkId) {
        return {
          ...audit,
          accessCount: audit.accessCount + 1,
          lastAccessed: new Date().toISOString()
        };
      }
      return audit;
    }));

    // Log the access event in audit trail
    await auditService.createAuditEvent(
      'gdpr_document_share.accessed',
      'external-user', // Could be anonymous or identified external user
      {
        documentId,
        shareLinkId,
        accessedAt: new Date().toISOString()
      },
      `access_gdpr_doc_share_${shareLinkId}_${Date.now()}`,
      'gdpr-compliance'
    );
  };

  const closeModal = () => {
    setShowShareModal(false);
    setSelectedDocument(null);
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex flex-col md:flex-row md:justify-between md:items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-4 md:mb-0">GDPR Documentation Center</h2>
        <div className="flex flex-col sm:flex-row gap-3">
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          >
            {documentTypes.map(type => (
              <option key={type.value} value={type.value}>{type.label}</option>
            ))}
          </select>
          <input
            type="text"
            placeholder="Search GDPR documents..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredDocuments.map(doc => (
          <div 
            key={doc.id} 
            className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow duration-200"
          >
            <div className="flex justify-between items-start">
              <div>
                <h3 
                  className="font-medium text-gray-900 hover:text-blue-600 cursor-pointer"
                  onClick={() => onDocumentClick && onDocumentClick(doc)}
                >
                  {doc.title}
                </h3>
                <span className={`inline-block px-2 py-1 text-xs rounded-full mt-2 ${
                  doc.status === 'draft' ? 'bg-yellow-100 text-yellow-800' :
                  doc.status === 'review' ? 'bg-blue-100 text-blue-800' :
                  doc.status === 'approved' ? 'bg-green-100 text-green-800' :
                  'bg-gray-100 text-gray-800'
                }`}>
                  {doc.status.charAt(0).toUpperCase() + doc.status.slice(1)}
                </span>
              </div>
              <span className={`px-2 py-1 text-xs rounded ${
                doc.type === 'policy' ? 'bg-blue-100 text-blue-800' :
                doc.type === 'assessment' ? 'bg-purple-100 text-purple-800' :
                doc.type === 'consent' ? 'bg-green-100 text-green-800' :
                doc.type === 'procedure' ? 'bg-yellow-100 text-yellow-800' :
                doc.type === 'training' ? 'bg-indigo-100 text-indigo-800' :
                'bg-red-100 text-red-800'
              }`}>
                {doc.type.replace('-', ' ').toUpperCase()}
              </span>
            </div>
            
            <p className="mt-2 text-sm text-gray-600">{doc.description}</p>
            
            <div className="mt-4 flex justify-between items-center">
              <div className="text-xs text-gray-500">
                {new Date(doc.date).toLocaleDateString()} • {doc.author}
              </div>
              
              <div className="flex space-x-2">
                <button
                  onClick={() => onDocumentClick && onDocumentClick(doc)}
                  className="text-sm text-blue-600 hover:text-blue-800"
                >
                  View
                </button>
                <button
                  onClick={() => handleShare(doc)}
                  className="text-sm text-gray-600 hover:text-gray-800 flex items-center"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                  </svg>
                  Share
                </button>
              </div>
            </div>
            
            {doc.tags.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1">
                {doc.tags.slice(0, 3).map((tag, index) => (
                  <span key={index} className="inline-block bg-gray-100 text-gray-600 text-xs px-2 py-1 rounded">
                    {tag}
                  </span>
                ))}
                {doc.tags.length > 3 && (
                  <span className="inline-block bg-gray-100 text-gray-600 text-xs px-2 py-1 rounded">
                    +{doc.tags.length - 3} more
                  </span>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {filteredDocuments.length === 0 && (
        <div className="text-center py-12">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900">No GDPR documents</h3>
          <p className="mt-1 text-sm text-gray-500">Get started by adding your first GDPR document to the library.</p>
        </div>
      )}

      {/* Share Modal */}
      {showShareModal && selectedDocument && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50" onClick={closeModal}>
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white" onClick={(e) => e.stopPropagation()}>
            <div className="mt-3 text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-blue-100">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                </svg>
              </div>
              <h3 className="text-lg leading-6 font-medium text-gray-900 mt-4">Share Document</h3>
              <div className="mt-2 px-7">
                <p className="text-sm text-gray-500">Copy the link below to share "{selectedDocument.title}"</p>
                <div className="mt-4 flex">
                  <input
                    type="text"
                    readOnly
                    value={selectedDocument.shareableLink}
                    className="flex-1 border border-gray-300 rounded-l-md px-3 py-2 text-sm"
                  />
                  <button
                    onClick={async () => {
                      await navigator.clipboard.writeText(selectedDocument.shareableLink);
                      setCopiedLink(selectedDocument.shareableLink);
                      
                      // Log the copy event
                      await auditService.createAuditEvent(
                        'gdpr_document_link.copied',
                        currentUser.upn,
                        {
                          documentId: selectedDocument.id,
                          documentTitle: selectedDocument.title,
                          link: selectedDocument.shareableLink
                        },
                        `copy_gdpr_link_${selectedDocument.id}_${Date.now()}`,
                        'gdpr-compliance'
                      );
                      
                      setTimeout(() => setCopiedLink(null), 2000);
                    }}
                    className="bg-blue-500 text-white px-4 py-2 rounded-r-md text-sm hover:bg-blue-600"
                  >
                    {copiedLink === selectedDocument.shareableLink ? 'Copied!' : 'Copy'}
                  </button>
                </div>
                <p className="mt-2 text-xs text-gray-500">This link provides access to the document without sharing the actual file.</p>
                
                {/* Share Statistics */}
                <div className="mt-4 text-left text-xs text-gray-500">
                  <p>Share history:</p>
                  {shareAudits
                    .filter(audit => audit.documentId === selectedDocument.id)
                    .slice(0, 3)
                    .map((audit, index) => (
                      <div key={index} className="ml-2 mt-1">
                        <span>Shared on {new Date(audit.timestamp).toLocaleDateString()} • Accessed {audit.accessCount} times</span>
                        {audit.lastAccessed && (
                          <span> • Last: {new Date(audit.lastAccessed).toLocaleDateString()}</span>
                        )}
                      </div>
                    ))}
                </div>
              </div>
              <div className="items-center px-4 py-3 mt-4">
                <button
                  onClick={closeModal}
                  className="px-4 py-2 bg-gray-500 text-white text-base font-medium rounded-md shadow-sm hover:bg-gray-600 w-full"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GdprDocumentationCenter;