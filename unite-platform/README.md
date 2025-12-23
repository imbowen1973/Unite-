# Unite Governance Platform

The Unite Governance Platform is a "Headless Governance" system that treats SharePoint as a secure, version-controlled database while providing a high-performance Next.js interface. The goal is to ensure that governance is "invisible but invincible"—easy for the user to navigate, but impossible to bypass from an audit perspective.

## Features

### 5-Tier Access Control System
1. **Public** - Visible without authentication, no access to audit data or past versions
2. **Diplomates** - Member access to wider data set, read-only with optional version history
3. **Committee Members** - Different committees with read-only or read-write access to documents
4. **Executive** - Access to draft agendas, slide decks, policy management, document reviews
5. **Admins** - Full access with user management and process configuration

### Document Lifecycle Management
- **Draft** → **Pending Approval** → **Approved** → **Published** → **Redacted/Rescinded**
- Every action is audited with hash-chain integrity
- Permanent document references using docStableId
- Version history management

### Meeting & Action Engine
- Agenda builder with drag-and-drop document integration
- Committee management with role-based access
- Action tracking with assignment and status updates
- Minutes generation and management

### ISO 27001 Compliance
- Complete audit trail for all actions (login, file access, edits, approvals, etc.)
- Hash-chain integrity verification
- Tamper-evident logging
- Role-based access control

## Architecture

- **Frontend**: Next.js 15 (App Router), Tailwind CSS, Lucide Icons
- **Backend**: Vercel Serverless Functions
- **Data**: SharePoint Online (REST & Graph API)
- **Cache**: Vercel KV (Redis)
- **Authentication**: Microsoft Entra ID (OIDC/OAuth 2.0)

## Setup

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd unite-platform
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Copy the environment configuration:
   ```bash
   cp .env.example .env.local
   ```

4. Update the `.env.local` file with your specific configuration values:
   - Microsoft Entra ID credentials
   - SharePoint/Graph API credentials
   - Vercel KV configuration

5. Run the development server:
   ```bash
   npm run dev
   ```

## API Endpoints

### Documents API
- `POST /api/documents` - Create, submit, approve, publish, redact, or rescind documents
- `GET /api/documents?docStableId=...` - Retrieve document by docStableId

### Meetings API
- `POST /api/meetings` - Create meetings, add agenda items, publish, add attendees, create minutes, manage actions
- `GET /api/meetings?meetingId=...` - Retrieve meeting by ID

### Authentication API
- `GET /api/auth` - Initiate Microsoft login
- `POST /api/auth` - Token exchange
- `POST /api/auth/logout` - Logout

## Security & Compliance

All actions in the Unite platform are automatically audited with the following properties:

1. **Integrity**: Every transaction is part of a hash chain that can verify data hasn't been tampered with
2. **Accountability**: All actions are logged with user identity, timestamp, and action details
3. **Immutability**: Audit logs cannot be modified or deleted
4. **Traceability**: Complete lineage from document creation to final state

## Development

The platform follows a "Clean Architecture" pattern:
- UI layer (Next.js app directory)
- Business logic layer (services in lib/)
- Data layer (SharePoint integration)

## ISO 27001 Controls

This platform implements controls for:
- Access control (A.9)
- Cryptography (A.10)
- Physical security (A.11)
- Operations security (A.12)
- Communications security (A.13)
- Access management (A.9.4.2)

## License

This project is licensed under the MIT License.
