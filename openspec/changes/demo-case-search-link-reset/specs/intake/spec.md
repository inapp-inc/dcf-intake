# intake Specification (delta)

## ADDED Requirements

### Requirement: Global case search

The system MUST allow authenticated users in any role to search cases by case number (`external_id`) or child name.

#### Scenario: Search by case number

- **Given** an authenticated user
- **When** the user searches with a case number prefix or full `IR-YYYY-NNNN` value
- **Then** matching cases are returned with metadata (caseId, externalId, childDisplay, status)

#### Scenario: Search by child name

- **Given** an authenticated user
- **When** the user searches with part of a child's name
- **Then** matching cases are returned from `child_display` or form field `child_name`

#### Scenario: Admin metadata only

- **Given** an authenticated admin
- **When** the admin selects a search result
- **Then** the UI shows metadata only and MUST NOT navigate to case narrative

### Requirement: Case identity

The system MUST use the reported child's name as the case display name and a non-editable auto-generated case number.

#### Scenario: Case number on create

- **Given** a screener starts a new intake
- **When** the case is created
- **Then** `external_id` is assigned sequentially and cannot be edited

#### Scenario: Child name persisted

- **Given** `child_name` is set on the form (AI or human)
- **When** the value is saved or checkpoint completes
- **Then** `child_display` reflects the child name for lists and search

### Requirement: Same-child linking

The system MUST link cases that share normalized child name and date of birth without merging or deleting records.

#### Scenario: Related reports drawer

- **Given** two cases with the same name+DOB match key
- **When** a screener views either case
- **Then** a related-reports control lists the other case(s)
- **And** the user can open a sibling case without removing either record

### Requirement: Demo data reset

The system MUST provide an admin-only mechanism to reset demo case data while preserving configuration and demo users.

#### Scenario: Admin resets demo

- **Given** an authenticated admin
- **When** the admin confirms demo reset
- **Then** all case data and artifacts are cleared
- **And** triage/risk configuration and demo login accounts remain available
