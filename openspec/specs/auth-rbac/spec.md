# auth-rbac Specification

## Purpose

Define authentication and role-based access control for the DCF AIT demo platform, aligned with PRD Module 9 (RBAC) and the UI role picker.

**Architecture:** `Docs/DCF-AIT-PLATFORM-ARCHITECTURE.md` §14.3.

## Requirements

### Requirement: Demo role authentication

The system MUST allow a user to authenticate by selecting one of four demo roles: screener, supervisor, worker, or admin.

#### Scenario: Successful demo login

- **Given** the login screen is displayed
- **When** the user selects the screener role and submits
- **Then** the system issues a JWT containing role `screener` and area office claims
- **And** the user is redirected to the screener dashboard

### Requirement: Role-based API authorization

The API MUST enforce authorization on every protected endpoint based on the caller's role.

#### Scenario: Worker denied screener-only intake

- **Given** a valid JWT for role `worker`
- **When** the user calls `POST /api/v1/cases` to create a new 51A intake
- **Then** the API returns HTTP 403 Forbidden
- **And** an audit event records the denied access attempt

### Requirement: IT admin case content isolation

The IT admin role MUST NOT read case narrative content (transcripts, 51A fields, 51B drafts).

#### Scenario: Admin blocked from case detail

- **Given** a valid JWT for role `admin`
- **When** the user requests `GET /api/v1/cases/{caseId}` including narrative fields
- **Then** the API returns HTTP 403 Forbidden or a redacted payload without PII

### Requirement: Access audit logging

The system MUST log every successful and failed authorization decision with user id, role, resource, and timestamp.

#### Scenario: Case view logged

- **Given** a screener views an assigned case
- **When** `GET /api/v1/cases/{caseId}` succeeds
- **Then** an audit event of type `case.access` is persisted

### Requirement: Admin system configuration without case PII

The admin role MUST manage triage and risk framework configuration via dedicated admin endpoints and MUST remain blocked from case narrative APIs.

#### Scenario: Admin saves risk framework

- **Given** a valid JWT for role `admin`
- **When** the user calls `PUT /admin/risk-framework` with valid JSON
- **Then** the configuration is persisted under `system_config`
- **And** `GET /cases/{caseId}` with narrative fields remains forbidden or redacted
