    # Ad Campaign Automation System - Developer Instructions

    ## Project Overview

    The **Ad Campaign Automation System** is a web-based SaaS platform that enables organizations to create, publish, manage, and analyze digital advertising campaigns across **Google Ads** and **Meta (Facebook) Ads** through a single unified interface.

    ### Key Capabilities
    - Unified campaign creation for multiple ad platforms
    - Automated campaign publishing through official APIs
    - Cross-platform performance analytics and reporting
    - Multi-tenant architecture with client workspace isolation
    - Role-based access control (Admin and Client roles)
    - Secure OAuth credential management with encryption

    ### Success Criteria
    - Campaigns can be created and published without manual platform login
    - Campaign status remains consistent with platform state
    - Metrics are reliably synced and displayed
    - Role-based access prevents unauthorized actions
    - All changes are auditable

    ---

    ## Technology Stack

    ### Architecture: MERN
    - **MongoDB** - Database with Mongoose ODM for schema-based modeling
    - **Express.js** - REST API backend with modular architecture
    - **React** - Single Page Application (SPA) frontend
    - **Node.js** - Runtime environment

    ### Core Technologies
    - **Queue System**: BullMQ + Redis for background job processing
    - **Authentication**: JWT + OAuth 2.0 (Google & Meta)
    - **Encryption**: AES-256-GCM for OAuth tokens
    - **Storage**: Local filesystem with Abstract Storage Provider Interface (future S3-compatible)
    - **Time Standard**: UTC everywhere (database, API, scheduling)
    - **Logging**: Winston/Pino for structured logging

    ### Design System
    **Color Palette (HEX Codes)**:
    - `#ea4338` - Red
    - `#fbbc02` - Yellow
    - `#34a853` - Green
    - `#4285f4` - Blue
    - `#ffffff` - White
    - `#1d1d1d` - Dark Gray
    - `#e5e7eb` - Light Gray

    ---

    ## Architecture Overview

    ### Modular Structure
    ```
    /apps
    /server
        /src
        /controllers    # Route handlers (no business logic)
        /services       # Business logic layer
        /repositories   # Database access layer
        /adapters       # Platform-specific integrations (Google/Meta)
        /middleware     # Auth, RBAC, validation
        /models         # Mongoose schemas
        /queues         # BullMQ job definitions
        /utils          # Encryption, logging, helpers
    /client
        /src
        /components     # React components
        /pages          # Route pages
        /services       # API client
        /hooks          # Custom React hooks
    /storage
    /creatives        # Uploaded assets (images, videos)
    ```

    ### Key Architectural Patterns
    1. **Service Layer Separation** - No business logic in controllers
    2. **Repository Pattern** - All database access through repository layer
    3. **Adapter Pattern** - Platform-specific logic isolated in adapters
    4. **Queue-Based Processing** - All external API calls via BullMQ
    5. **Multi-Tenant Isolation** - Client data segregated at database level

    ---

    ## Getting Started

    ### Prerequisites
    - Node.js (v18+)
    - MongoDB (v6+)
    - Redis (v7+)
    - npm or yarn

    ### Environment Setup
    Create a `.env` file in the project root:
    ```env
    # Database
    MONGO_URI=mongodb://localhost:27017/ad_campaign_system

    # Redis
    REDIS_HOST=localhost
    REDIS_PORT=6379

    # JWT
    JWT_SECRET=your_jwt_secret_key
    JWT_EXPIRY=7d

    # Encryption
    MASTER_ENCRYPTION_KEY=your_32_byte_hex_key

    # OAuth - Google
    GOOGLE_CLIENT_ID=your_google_client_id
    GOOGLE_CLIENT_SECRET=your_google_client_secret

    # OAuth - Meta
    # IMPORTANT: Use "Business" app type to support both Marketing API and Facebook Login.
    # See docs/meta-setup-guide.md for detailed setup instructions.
    META_APP_ID=your_meta_app_id
    META_APP_SECRET=your_meta_app_secret

    # Storage
    STORAGE_PATH=/storage/creatives

    # Server
    PORT=5000
    NODE_ENV=development
    ```

    ### Installation
    ```bash
    # Install dependencies
    npm install

    # Start MongoDB and Redis
    # (Platform-specific commands)

    # Run backend server
    cd apps/backend
    npm run dev

    # Run frontend (in separate terminal)
    cd apps/frontend
    npm start
    ```

    ---

    ## Development Workflow

    ### Phase-by-Phase Development

    The project follows a **7-phase incremental delivery model**. Each phase must be completed, tested, and validated before proceeding to the next.

    #### **Phase 0 - Environment & MERN Foundation**
    **Goal**: Prepare machine + repo for safe code generation

    **Tasks**:
    - Create monorepo structure
    - Setup Express base server
    - Configure MongoDB connection
    - Add environment config loader
    - Add logging system (Winston/Pino)
    - Create React app shell with routing

    **Validation**:
    - ✅ Server runs without errors
    - ✅ React app loads
    - ✅ MongoDB connects successfully

    ---

    #### **Phase 1 - Authentication & Multi-Tenant Core**
    **Goal**: Security + client isolation before business logic

    **Tasks**:
    - User schema (role: ADMIN | CLIENT)
    - Client schema (multi-tenant workspace)
    - JWT authentication system
    - Role middleware (RBAC guards)
    - Login/logout endpoints
    - Protected route system
    - OAuth credential storage model
    - AES-256-GCM token encryption utility

    **Validation**:
    - ✅ Login works and returns JWT
    - ✅ JWT verified on protected routes
    - ✅ Client data isolation confirmed
    - ✅ OAuth tokens encrypted in database

    ---

    #### **Phase 2 - Campaign Domain & Validation Engine**
    **Goal**: Safe campaign lifecycle management

    **Tasks**:
    - Campaign schema with status field
    - CRUD APIs (Create, Read, Update, Delete)
    - Draft status as default
    - Status transition rules (DRAFT → VALIDATED → SCHEDULED → QUEUED → PUBLISHING → ACTIVE → PAUSED → FAILED → COMPLETED)
    - Tier-1 unified validation (common fields)
    - Tier-2 platform-specific validation hooks
    - JSON upload parser with input sanitization
    - Activity log system for status changes

    **Validation**:
    - ✅ Campaign can be created as DRAFT
    - ✅ Invalid campaigns blocked from scheduling
    - ✅ Status transitions logged in activity log

    ---

    #### **Phase 3 - Creatives, Assets & Targeting**
    **Goal**: Real advertising inputs

    **Tasks**:
    - Secure file upload pipeline
    - Storage provider abstraction layer (local filesystem, future S3)
    - Creative schema (images, videos, headlines, descriptions)
    - Asset-campaign linking
    - Targeting configuration structure
    - Creative preview endpoint
    - Asset security (no directory listing)

    **Validation**:
    - ✅ Upload works and files stored securely
    - ✅ Files accessible via secure endpoint
    - ✅ Creatives attach to campaigns correctly

    ---

    #### **Phase 4 - Publishing Engine & Queue Workers**
    **Goal**: Automated real campaign publishing

    **Tasks**:
    - Redis + BullMQ integration
    - Background worker service
    - Google Ads adapter scaffold
    - Meta Ads adapter scaffold
    - Retry logic with exponential backoff
    - Partial failure handling (e.g., Google succeeds, Meta fails)
    - Publish activity logging
    - Token refresh background job

    **Validation**:
    - ✅ Queue processes jobs correctly
    - ✅ Failed jobs retry with backoff
    - ✅ Partial success handled gracefully

    ---

    #### **Phase 5 - Metrics, Analytics & Reporting**
    **Goal**: Performance visibility

    **Tasks**:
    - Metrics schema (impressions, clicks, CTR, CPC, conversions, CPA, spend, ROAS)
    - Aggregation pipelines (MongoDB)
    - Scheduled sync jobs (daily metrics pull)
    - Webhook ingestion endpoint (real-time updates)
    - Analytics APIs (GET /campaigns/metrics, GET /campaigns/:id/metrics)
    - CSV/Excel export service
    - React analytics dashboard with charts

    **Validation**:
    - ✅ Metrics visible in UI
    - ✅ Export downloads correctly
    - ✅ Webhooks update metrics in real-time

    ---

    #### **Phase 6 - Governance, Security & Automation**
    **Goal**: Production-grade safety

    **Tasks**:
    - Activity log system (immutable audit trail)
    - RBAC enforcement across all APIs
    - Input sanitization middleware
    - Storage directory protection config (Nginx)
    - Internal event bus for automation
    - Dry-run publishing mode
    - Admin retry-failed-campaign endpoint
    - Soft delete strategy for all entities
    - Tenant-level rate limiting
    - Background job dead-letter queue

    **Validation**:
    - ✅ Unauthorized access blocked
    - ✅ All actions logged and immutable
    - ✅ Soft deletes work correctly

    ---

    #### **Phase 7 - QA, Load Testing & Deployment**
    **Goal**: Ship production MVP

    **Tasks**:
    - End-to-end tests (Playwright/Cypress)
    - API load tests (Artillery/k6)
    - OAuth expiry simulations
    - Docker setup (optional but recommended)
    - Nginx + SSL config for VPS
    - Production build scripts
    - Monitoring setup (PM2, New Relic, or Datadog)
    - Rollback strategy
    - Database migration strategy
    - Automated backups
    - Error alerting (email/Slack)

    **Final Output**:
    - ✅ Deployable SaaS MVP
    - ✅ Rollback and migration strategies documented
    - ✅ Monitoring and alerting active

    ---

    ## Testing Requirements

    ### For Each Phase
    1. **Manual Testing**:
    - Write manual test cases documenting expected behavior
    - Execute test cases and document results

    2. **Automated Testing**:
    - Write unit tests for services and utilities
    - Write integration tests for API endpoints
    - Write end-to-end tests for critical user flows

    3. **Validation Checklist**:
    - All tests must pass before proceeding to next phase
    - Code must compile without errors
    - Server must run without crashes

    ### Test Coverage Requirements
    - **Unit Tests**: All service layer functions
    - **Integration Tests**: All API endpoints
    - **E2E Tests**: Critical user flows (login, campaign creation, publishing)

    ---

    ## Logging Requirements

    All changes and events must be logged to the following files (append mode):

    1. **main_change.log** - High-level changes and milestones
    2. **code_change.log** - Detailed code modifications
    3. **error.log** - All errors and exceptions
    4. **success.log** - Successful operations and completions

    **Log Format**:
    ```
    [TIMESTAMP] [LEVEL] [MODULE] Message
    ```

    ---

    ## Deployment Guidelines

    ### Deployment Readiness
    - All phases completed and tested
    - Environment variables configured
    - MongoDB and Redis running
    - SSL certificates installed
    - Nginx configured with rate limiting and asset protection

    ### Production Checklist
    - [ ] Environment variables set
    - [ ] Database migrations run
    - [ ] Redis connection verified
    - [ ] OAuth apps configured (Google, Meta)
    - [ ] Storage directory permissions set
    - [ ] Nginx directory listing disabled for /storage/
    - [ ] SSL certificates installed
    - [ ] Monitoring and alerting configured
    - [ ] Backup strategy implemented
    - [ ] Rollback plan documented

    ---

    ## API Overview

    ### Core Campaign APIs
    - `POST /campaigns` - Create campaign
    - `GET /campaigns` - List campaigns (filtered by client)
    - `GET /campaigns/:id` - Get campaign details
    - `PUT /campaigns/:id` - Update campaign
    - `PATCH /campaigns/:id/status` - Update campaign status
    - `DELETE /campaigns/:id` - Delete campaign (Admin only, soft delete)

    ### Analytics APIs
    - `GET /campaigns/metrics` - Get aggregated metrics
    - `GET /campaigns/:id/metrics` - Get campaign-specific metrics

    ### Admin APIs
    - `POST /campaigns/start` - Trigger campaign publishing (Admin only)
    - `POST /campaigns/:id/retry` - Retry failed campaign (Admin only)

    ---

    ## Data Model Overview

    ### User
    - `id`, `name`, `email`, `role` (ADMIN | CLIENT), `client_id`, `status`, `created_at`

    ### Client
    - `id`, `name`, `status`, `created_at`

    ### Campaign
    - `id`, `name`, `objective`, `platform`, `budget`, `currency`, `start_date`, `end_date`, `status`, `created_by_user_id`, `client_id`

    ### Platform Account
    - `platform`, `platform_account_id`, `access_token` (encrypted), `refresh_token` (encrypted), `token_expiry`

    ### Metrics
    - `campaign_id`, `platform`, `impressions`, `clicks`, `conversions`, `spend`, `roas`, `date`

    ### Activity Log
    - `campaign_id`, `action`, `old_value`, `new_value`, `performed_by`, `timestamp`

    ---

    ## Future Enhancements (Out of Scope for Phase 1)
    - AI-driven optimization
    - Budget forecasting
    - Creative performance scoring
    - Additional ad platforms (LinkedIn, TikTok, etc.)
    - Client self-serve dashboards
    - Billing and invoicing integration

    ---

    ## Support and Contribution

    ### Contribution Guidelines
    1. Follow the phase-by-phase development order
    2. Never skip phases or tests
    3. Follow the rules defined in `rules.md` strictly
    4. Log all changes appropriately
    5. Write tests before marking phase complete

    ### Questions or Issues
    - Review the PRD: `Ad Campaign Automation System – Product Requirements Document (prd).txt`
    - Review the project plan: `The_project_plan.txt`
    - Check `rules.md` for strict development rules
