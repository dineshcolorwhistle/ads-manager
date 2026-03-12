# Ad Campaign Automation System - Development Rules

## 🚨 CRITICAL: These rules are MANDATORY and MUST be followed at all times

---
## 0. AI Compliance Requirement

Before generating or modifying any code:
- AI MUST explicitly confirm it has read and will follow this rules.md
- If any requested task violates these rules, AI MUST refuse and explain why
- AI MUST NOT make assumptions outside documented rules

## 1. Architecture Rules

### 1.1 MERN Modular Structure
- **MUST** follow MERN (MongoDB, Express, React, Node) architecture
- **MUST** maintain clear separation between frontend and backend
- **MUST** use modular Express structure with controllers, services, repositories, adapters, middleware, models, queues, and utils

### 1.2 Service Layer Separation
- **NEVER** put business logic in controllers
- **MUST** implement all business logic in the service layer
- Controllers **MUST ONLY** handle:
  - Request validation
  - Calling service methods
  - Response formatting
  - Error handling

### 1.3 Repository Pattern
- **MUST** access database ONLY through repository/service layer
- **NEVER** write direct database queries in controllers
- **MUST** use Mongoose models through repository abstraction

### 1.4 Adapter Pattern
- **MUST** isolate Google Ads and Meta Ads API logic in separate adapters
- **NEVER** mix platform-specific code with business logic
- **MUST** use adapter abstraction for all external API calls
- Every external API call **MUST** go through adapter + retry wrapper

### 1.5 Queue-Based Processing
- **MUST** use BullMQ + Redis for all background jobs
- **MUST** process all external API calls asynchronously via queue
- **MUST** implement retry logic with exponential backoff
- **MUST** handle partial success scenarios (e.g., Google succeeds, Meta fails)

### 1.6 Stateless APIs
- **MUST** design Express APIs to be stateless for horizontal scaling
- **MUST** make queue workers independently deployable
- **NEVER** store session state in memory

---

## 2. Security Rules

### 2.1 RBAC Enforcement
- **MUST** apply RBAC (Role-Based Access Control) guards to ALL endpoints from Phase 1 onwards
- **NEVER** wait until Phase 5 to add RBAC
- **MUST** verify user role (ADMIN | CLIENT) on every protected route
- **MUST** enforce client data isolation on all queries

### 2.2 OAuth Token Encryption
- **MUST** encrypt all OAuth tokens (access_token, refresh_token) using AES-256-GCM
- **NEVER** store tokens in plain text
- **MUST** store master encryption key in environment variable ONLY
- **NEVER** commit encryption keys to version control

### 2.3 Secrets Management
- **NEVER** hardcode secrets in code or database
- **MUST** store all secrets in environment variables
- **MUST** use `.env` file for local development (add to `.gitignore`)
- **MUST** use secure secret management in production (e.g., AWS Secrets Manager, HashiCorp Vault)

### 2.4 Input Validation and Sanitization
- **MUST** validate and sanitize ALL user inputs
- **MUST** sanitize JSON file uploads to prevent injection attacks
- **MUST** use input validation middleware on all endpoints
- **NEVER** trust user input

### 2.5 Rate Limiting
- **MUST** implement rate limiting on all public APIs
- **MUST** implement tenant-level rate limiting
- **MUST** protect against brute force attacks on login endpoints

### 2.6 Audit Logging
- **MUST** log all critical actions (campaign creation, status changes, publishing, deletions)
- **MUST** make audit logs immutable (no updates or deletes allowed)
- **MUST** include: `campaign_id`, `action`, `old_value`, `new_value`, `performed_by`, `timestamp`

### 2.7 Asset Security
- **MUST** disable directory listing for `/storage/` in Nginx configuration
- **MUST** serve assets through secure endpoints with authentication
- **NEVER** expose storage directory publicly

---

## 3. Data Integrity Rules

### 3.1 Campaign Status Management
- **MUST** treat campaign status as single source of truth
- **MUST** enforce valid status transitions:
  - `DRAFT → VALIDATED → SCHEDULED → QUEUED → PUBLISHING → ACTIVE → PAUSED → FAILED → COMPLETED`
- **MUST** log all status transitions in Activity Log
- **NEVER** allow invalid status transitions

### 3.2 Idempotency
- **MUST** make campaign publishing idempotent
- **MUST** prevent duplicate campaign creation on platform APIs
- **MUST** handle retry scenarios without creating duplicates

### 3.3 Activity Logging
- **MUST** create activity log entry for every status change
- **MUST** create activity log entry for every critical action
- **NEVER** skip activity logging

### 3.4 Soft Deletes
- **MUST** implement soft delete strategy for all entities
- **NEVER** hard delete campaigns, users, or clients
- **MUST** add `deleted_at` timestamp field for soft deletes

---

## 4. Development Workflow Rules

### 4.1 AI-IDE Generation Rules
- **MUST** generate one module at a time
- **NEVER** overwrite previous working modules
- **MUST** complete each phase before proceeding to the next
- **MUST** follow the phase order: Phase 0 → 1 → 2 → 3 → 4 → 5 → 6 → 7
- AI MUST NOT refactor existing code unless explicitly instructed
- AI MUST NOT rename files, folders, or functions silently

### 4.2 Testing Requirements
- **MUST** write manual test cases for each phase
- **MUST** write automated test cases for each phase
- **MUST** execute and pass all tests before proceeding to next phase
- **NEVER** skip testing

### 4.3 Compilation and Execution
- **MUST** ensure code compiles without errors before proceeding
- **MUST** ensure server runs without crashes before proceeding
- **MUST** verify all endpoints work as expected

### 4.4 Schema and Folder Structure
- **MUST** follow existing schema structure strictly
- **MUST** follow existing folder structure strictly
- **NEVER** deviate from established patterns without explicit approval

---

## 5. Logging Rules

### 5.1 Log Files (Append Mode ONLY)
**MUST** maintain the following log files in append mode:

1. **main_change.log** - High-level changes and milestones
2. **code_change.log** - Detailed code modifications
3. **error.log** - All errors and exceptions
4. **success.log** - Successful operations and completions

### 5.2 Log Format
**MUST** use the following format:
```
[TIMESTAMP] [LEVEL] [MODULE] Message
```

### 5.3 Log Levels
- **ERROR**: Errors and exceptions
- **WARN**: Warnings and potential issues
- **INFO**: General information and milestones
- **DEBUG**: Detailed debugging information

### 5.4 Logging Requirements
- **MUST** log all errors to `error.log`
- **MUST** log all successful operations to `success.log`
- **MUST** log all code changes to `code_change.log`
- **MUST** log all major changes to `main_change.log`
- **NEVER** use overwrite mode for log files

---

## 6. Multi-Tenancy Rules

### 6.1 Client Isolation
- **MUST** enforce client data isolation at database level
- **MUST** filter all queries by `client_id`
- **NEVER** allow users to access data from other clients
- **MUST** validate `client_id` on every request

### 6.2 OAuth Credentials
- **MUST** store OAuth credentials per client
- **MUST** isolate OAuth tokens by `client_id`
- **NEVER** share OAuth tokens across clients

### 6.3 Campaign Ownership
- **MUST** associate every campaign with a `client_id`
- **MUST** restrict campaign access to users belonging to that client
- **MUST** enforce ownership checks on all campaign operations

---

## 7. Code Quality Rules

### 7.1 No Business Logic in Controllers
- **NEVER** implement business logic in controllers
- **MUST** delegate all business logic to service layer
- Controllers should be thin wrappers around service calls
- Controllers SHOULD remain under ~150 lines
- If controller grows larger, logic MUST be moved to service

### 7.2 Error Handling
- **MUST** implement centralized error handling middleware
- **MUST** return consistent error response format
- **MUST** log all errors with stack traces
- **NEVER** expose internal error details to clients

### 7.3 Code Reusability
- **MUST** create reusable utility functions
- **MUST** avoid code duplication
- **MUST** use shared middleware for common operations

### 7.4 Code Documentation
- **MUST** document all service methods with JSDoc
- **MUST** document all API endpoints with comments
- **MUST** maintain README files for each module

---

## 8. Time and Date Rules

### 8.1 UTC Standard
- **MUST** use UTC for all timestamps in database
- **MUST** use UTC for all API requests and responses
- **MUST** use UTC for all scheduling operations
- **NEVER** use local time zones in backend

### 8.2 Date Formatting
- **MUST** use ISO 8601 format for all dates
- **MUST** validate date formats on input
- **MUST** normalize dates to UTC before storage

---

## 9. Storage Rules

### 9.1 Abstract Storage Provider
- **MUST** use Abstract Storage Provider Interface for file storage
- **MUST** support local filesystem initially
- **MUST** design for future S3-compatible switch without code refactor
- **NEVER** hardcode storage paths

### 9.2 Creative Storage
- **MUST** store creatives in `/storage/creatives/`
- **MUST** organize by client and campaign
- **MUST** validate file types and sizes
- **MUST** scan uploads for malware (future enhancement)

---

## 10. API Design Rules

### 10.1 RESTful Conventions
- **MUST** follow RESTful API conventions
- **MUST** use proper HTTP methods (GET, POST, PUT, PATCH, DELETE)
- **MUST** use proper HTTP status codes
- **MUST** return consistent JSON response format

### 10.2 Response Format
**MUST** use the following response format:
```json
{
  "success": true,
  "data": {},
  "message": "Operation successful",
  "timestamp": "2026-02-06T08:30:00Z"
}
```

For errors:
```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Error message"
  },
  "timestamp": "2026-02-06T08:30:00Z"
}
```

### 10.3 Pagination
- **MUST** implement pagination for list endpoints
- **MUST** use `page` and `limit` query parameters
- **MUST** return total count in response

---

## 11. Database Rules

### 11.1 Mongoose ODM
- **MUST** use Mongoose for all database operations
- **MUST** define schemas with validation rules
- **MUST** use schema methods and virtuals where appropriate
- Any schema change MUST be explicitly approved before implementation
- AI MUST list schema diffs before applying them

### 11.2 Indexing
- **MUST** create indexes on frequently queried fields
- **MUST** create compound indexes for multi-field queries
- **MUST** index `client_id` on all multi-tenant collections

### 11.3 Transactions
- **MUST** use transactions for operations that modify multiple collections
- **MUST** implement rollback on transaction failure

---

## 12. Queue and Background Jobs Rules

### 12.1 BullMQ Usage
- **MUST** use BullMQ for all background jobs
- **MUST** implement job retry logic with exponential backoff
- **MUST** implement dead-letter queue for failed jobs
- **MUST** monitor queue health and job status
- Queue workers MUST NOT expose HTTP endpoints
- Workers MUST NOT share Express app instance with API

### 12.2 Job Types
- Campaign publishing
- Metrics synchronization
- OAuth token refresh
- Scheduled campaign activation
- Webhook processing

### 12.3 Job Monitoring
- **MUST** log job start and completion
- **MUST** track job failures and retries
- **MUST** alert on repeated job failures

---

## 13. Validation Rules

### 13.1 Two-Tier Validation
**MUST** implement two-tier validation:

1. **Tier 1 - Unified Validation**:
   - Executed on every save
   - Validates common campaign fields
   - Checks required fields, data types, ranges

2. **Tier 2 - Platform-Specific Validation**:
   - Executed before scheduling or publishing
   - Enforces platform requirements (e.g., keywords for Google, creatives for Facebook)
   - Validates platform-specific constraints

### 13.2 Validation Enforcement
- **MUST** pass both tiers before scheduling or publishing
- **MUST** return clear validation error messages
- **NEVER** allow invalid campaigns to be published

---

## 14. Deployment Rules

### 14.1 Deployment Readiness
- **MUST** ensure deployment-ready from Day 1
- **MUST** use environment variables for configuration
- **MUST** provide deployment documentation
- **MUST** implement health check endpoints

### 14.2 Production Checklist
Before deploying to production, **MUST** verify:
- [ ] All environment variables configured
- [ ] Database migrations executed
- [ ] Redis connection verified
- [ ] OAuth apps configured (Google, Meta)
- [ ] SSL certificates installed
- [ ] Nginx configured with rate limiting
- [ ] Storage directory permissions set
- [ ] Monitoring and alerting configured
- [ ] Backup strategy implemented
- [ ] Rollback plan documented

---

## 15. Monitoring and Observability Rules

### 15.1 Structured Logging
- **MUST** use structured logging (Winston or Pino)
- **MUST** include context in all log entries (user_id, client_id, campaign_id)
- **MUST** log all API requests and responses

### 15.2 Error Tracking
- **MUST** implement central error tracking
- **MUST** alert on critical errors
- **MUST** track error rates and patterns

### 15.3 Performance Monitoring
- **MUST** monitor API response times
- **MUST** monitor queue processing times
- **MUST** monitor database query performance

---

## 16. Version Control Rules

### 16.1 Git Workflow
- **MUST** commit working code only
- **MUST** write clear commit messages
- **MUST** create feature branches for new features
- **NEVER** commit directly to main branch

### 16.2 .gitignore
**MUST** exclude from version control:
- `node_modules/`
- `.env`
- `*.log`
- `/storage/creatives/`
- Build artifacts

---

## 17. Documentation Rules

### 17.1 Code Documentation
- **MUST** document all service methods
- **MUST** document all API endpoints
- **MUST** document all configuration options

### 17.2 Project Documentation
- **MUST** maintain up-to-date README
- **MUST** document setup and installation steps
- **MUST** document deployment procedures

---

## 18. Retry and Resilience Rules

### 18.1 Retry Logic
- **MUST** implement retry with exponential backoff for external API calls
- **MUST** set maximum retry attempts (e.g., 3-5 retries)
- **MUST** log all retry attempts

### 18.2 Graceful Failure
- **MUST** handle API failures gracefully
- **MUST** update campaign status to FAILED on permanent failure
- **MUST** provide clear error messages for troubleshooting

### 18.3 Token Refresh
- **MUST** implement background job to refresh OAuth tokens before expiry
- **MUST** pause campaigns if token refresh fails
- **MUST** alert admin on token expiry

---

## 19. Testing Rules

### 19.1 Test Coverage
- **MUST** write unit tests for all service layer functions
- **MUST** write integration tests for all API endpoints
- **MUST** write end-to-end tests for critical user flows

### 19.2 Test Execution
- **MUST** run all tests before committing code
- **MUST** ensure all tests pass before proceeding to next phase
- **NEVER** skip tests

### 19.3 Test Data
- **MUST** use test fixtures for consistent test data
- **MUST** clean up test data after tests
- **NEVER** use production data in tests

---

## 20. Performance Rules

### 20.1 Async Operations
- **MUST** use async/await for all I/O operations
- **NEVER** use blocking synchronous operations
- **MUST** process long-running tasks in background queue

### 20.2 Database Optimization
- **MUST** use indexes for frequently queried fields
- **MUST** use aggregation pipelines for complex queries
- **MUST** limit query results with pagination

### 20.3 Caching
- **MUST** cache frequently accessed data (e.g., platform asset IDs)
- **MUST** implement cache invalidation strategy
- **MUST** use Redis for caching

---

## 21. Automated Phase Documentation Rules (MANDATORY)

### 21.1 Phase Summaries
- **MUST** create `docs/phases/phase-XX-summary.md` upon phase completion.
- **MUST** include: Objective, Features, Technical Decisions, Issues/Fixes, and Dependency Tracking (installed/updated/removed).

### 21.2 Test Reports
- **MUST** create `docs/phases/phase-XX-tests.md` documenting all manual and automated testing results.
- **MUST** include: Test Scenarios, Pass/Fail status, Bugs found with fix status, and Regression risks.

### 21.3 Command History
- **MUST** maintain `docs/phases/phase-XX-commands.md` capturing all significant terminal commands.
- **MUST** include a one-line purpose for each command and use proper code blocks.

### 21.4 Trigger Conditions
- Documentation **MUST** be auto-generated or updated when:
  - A phase is marked as complete.
  - Dependencies are modified.
  - Major test suites are executed.
  - Significant architectural changes are committed.

---

## Stop Condition Rule

If AI is uncertain about:
- Architecture choice
- Data model
- Security behavior
AI MUST stop and ask for clarification instead of guessing.

## Summary

These rules are **NON-NEGOTIABLE** and **MUST** be followed at all times. Violation of these rules will result in:
- Security vulnerabilities
- Data integrity issues
- System failures
- Deployment problems

**When in doubt, refer to:**
1. This `rules.md` file
2. `instructions.md` for development guidance
3. `Ad Campaign Automation System – Product Requirements Document (prd).txt` for requirements
4. `The_project_plan.txt` for implementation strategy
