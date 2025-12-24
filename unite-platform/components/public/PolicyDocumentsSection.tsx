import React from 'react';

const PolicyDocumentsSection = () => {
  // Mock data for policy documents
  const policies = [
    { id: '1', title: 'Code of Conduct', category: 'Governance', date: '2023-01-15', url: '#' },
    { id: '2', title: 'Financial Procedures', category: 'Finance', date: '2023-03-22', url: '#' },
    { id: '3', title: 'Membership Guidelines', category: 'Operations', date: '2023-06-10', url: '#' },
    { id: '4', title: 'Data Protection Policy', category: 'Compliance', date: '2023-08-05', url: '#' },
  ];

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Policy Documents</h2>
      <div className="space-y-4">
        {policies.map((policy) => (
          <div key={policy.id} className="border-b border-gray-200 pb-4">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="font-medium text-gray-900">{policy.title}</h3>
                <div className="flex space-x-4 mt-1">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                    {policy.category}
                  </span>
                  <span className="text-xs text-gray-500">
                    {new Date(policy.date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                  </span>
                </div>
              </div>
              <a 
                href={policy.url} 
                className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                target="_blank"
                rel="noopener noreferrer"
              >
                View PDF
              </a>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default PolicyDocumentsSection;
