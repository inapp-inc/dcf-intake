# audit Specification

## Purpose

Tamper-evident audit logging for AI outputs, human overrides, and access events (PRD §12.7, Module 9).

**Related:** AI output provenance (model versions) in `ai-capabilities`. Architecture §11.8, §14.

## Requirements

### Requirement: Append-only audit events

The system MUST append audit events; demo storage MUST NOT allow update or delete of audit rows via application API.

#### Scenario: Override logged

- **Given** a screener overrides a risk score with reason
- **When** the override is saved
- **Then** an audit event records prior score, new action, reason, user id, and model version

### Requirement: AI output provenance

Audit events for AI outputs MUST include model or template version identifiers where applicable.

#### Scenario: Risk score audit

- **Given** a risk score is generated
- **When** the score is stored
- **Then** audit includes model version and contributing factor snapshot hash

### Requirement: Auditor read access

Authorized auditor roles MUST query audit events by case id and time range without write access.

#### Scenario: Supervisor audit trail

- **Given** an authenticated supervisor
- **When** requesting audit for a team case
- **Then** the API returns audit events for that case only

### Requirement: Retention configuration

The system MUST support configurable retention period via environment configuration (demo default 90 days; production target 7 years).

#### Scenario: Retention env

- **Given** `AUDIT_RETENTION_DAYS=90` in deployment config
- **When** audit purge job runs (if enabled)
- **Then** only events older than 90 days are eligible for purge in demo mode
