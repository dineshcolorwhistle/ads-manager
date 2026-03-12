# Ad Campaign Automation System

The **Ad Campaign Automation System** is a web-based SaaS platform that enables organizations to create, publish, manage, and analyze digital advertising campaigns across **Google Ads** and **Meta (Facebook) Ads** through a single unified interface.

## Key Capabilities

- **Unified Campaign Creation**: Create campaigns for multiple ad platforms from a single interface.
- **Automated Campaign Publishing**: Publish campaigns automatically through official API integrations.
- **Cross-Platform Analytics**: View performance metrics and reporting across all connected platforms.
- **Multi-Tenant Architecture**: Isolate client workspaces to ensure data security and privacy.
- **Role-Based Access Control (RBAC)**: Manage user permissions with established Admin and Client roles.
- **Secure Credential Management**: Encrypt and securely manage OAuth credentials using AES-256-GCM.

## Technology Stack

### Architecture
- **MERN Stack**: MongoDB, Express.js, React, Node.js.
- **Database**: MongoDB with Mongoose ODM for schema-based modeling.
- **Backend API**: Express.js REST API with a modular, service-oriented architecture.
- **Frontend**: React Single Page Application (SPA).

### Core Technologies
- **Queue System**: BullMQ + Redis for background job processing and API call handling.
- **Authentication**: JWT + OAuth 2.0 (Google & Meta).
- **Encryption**: AES-256-GCM for securely storing OAuth tokens.
- **Storage**: Local filesystem with an Abstract Storage Provider Interface (designed for future S3 compatibility).

## Getting Started

### Prerequisites

Ensure you have the following installed to run the system:
- Node.js (v18+)
- MongoDB (v6+)
- Redis (v7+)
- npm or yarn

### Environment Setup

Create a `.env` file in the project root with the following configuration:

```env
# Database
MONGO_URI=mongodb://localhost:27017/ad_campaign_system

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# JWT
JWT_SECRET=your_jwt_secret_key
JWT_EXPIRY=7d

# Encryption (Provides AES-256-GCM encryption for OAuth tokens)
MASTER_ENCRYPTION_KEY=your_32_byte_hex_key

# OAuth - Google
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret

# OAuth - Meta
META_APP_ID=your_meta_app_id
META_APP_SECRET=your_meta_app_secret

# Server
PORT=5000
NODE_ENV=development
```

### Installation and Running locally

```bash
# Install dependencies in the root (if applicable) or individually in client/server
npm install

# Start MongoDB and Redis services on your machine
# ...

# Run backend server
cd server
npm run dev

# Run frontend application (in a separate terminal)
cd client
npm run dev
```

## Architecture Overview

The application strictly follows a service-oriented architectural pattern to separate concerns and ensure maintainability:

1. **Service Layer Separation**: Controllers contain no business logic. All business rules reside in the service layer.
2. **Repository Pattern**: All database operations go through a repository layer, decoupling the application from Mongoose models directly.
3. **Adapter Pattern**: Logic for integrating with Google Ads and Meta Ads is isolated in dedicated adapters, preventing platform-specific code from bleeding into business logic.
4. **Queue-Based Processing**: All external API calls and heavy background tasks run through BullMQ with robust retry policies.
5. **Multi-Tenant Isolation**: Client data is strictly segregated at the database query layer.

## Project Phases

The development revolves around a 7-phase implementation model:
- **Phase 0**: Environment & MERN Foundation (Completed)
- **Phase 1**: Authentication & Multi-Tenant Core (Completed)
- **Phase 2**: Campaign Domain & Validation Engine (Completed)
- **Phase 3**: Creatives, Assets & Targeting (Completed)
- **Phase 4**: Publishing Engine & Queue Workers (Completed)
- **Phase 5**: Metrics, Analytics & Reporting (Current / Upcoming)
- **Phase 6**: Governance, Security & Automation (Upcoming)
- **Phase 7**: QA, Load Testing & Deployment (Upcoming)

## Contributing

- Make sure to review the developmental rules in `rules.md` and detailed guidelines in `instructions.md`.
- Ensure all automated unit and integration tests are passing before committing.
- Commit logs to the system log trackers (`main_change.log`, `code_change.log`, `error.log`, `success.log`) when producing significant milestones.
