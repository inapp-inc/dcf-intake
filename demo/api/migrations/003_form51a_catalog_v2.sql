-- Backfill expanded 51A intake fields for existing cases (catalog v2)
-- Uses INSERT OR IGNORE (SQLite does not support ON CONFLICT with INSERT...SELECT).

INSERT OR IGNORE INTO form_51a_fields (case_id, section_id, field_id, label, required, value, source, confirmed_by_human, missing, multiline)
SELECT c.id, 'incident', 'incident_location', 'Incident Location', 0, '', 'human', 0, 0, 0
FROM cases c;

INSERT OR IGNORE INTO form_51a_fields (case_id, section_id, field_id, label, required, value, source, confirmed_by_human, missing, multiline)
SELECT c.id, 'incident', 'dv_concerns', 'Domestic Violence / Safety Concerns', 0, '', 'human', 0, 0, 1
FROM cases c;

INSERT OR IGNORE INTO form_51a_fields (case_id, section_id, field_id, label, required, value, source, confirmed_by_human, missing, multiline)
SELECT c.id, 'reporter', 'rep_addr', 'Reporter Address', 0, '', 'human', 0, 0, 0
FROM cases c;

INSERT OR IGNORE INTO form_51a_fields (case_id, section_id, field_id, label, required, value, source, confirmed_by_human, missing, multiline)
SELECT c.id, 'reporter', 'rep_relationship', 'Relationship to Child', 0, '', 'human', 0, 0, 0
FROM cases c;

INSERT OR IGNORE INTO form_51a_fields (case_id, section_id, field_id, label, required, value, source, confirmed_by_human, missing, multiline)
SELECT c.id, 'reporter', 'rep_is_caretaker', 'Reporter Is Caretaker? (yes / no)', 0, '', 'human', 0, 0, 0
FROM cases c;

INSERT OR IGNORE INTO form_51a_fields (case_id, section_id, field_id, label, required, value, source, confirmed_by_human, missing, multiline)
SELECT c.id, 'household', 'caregiver_phone', 'Primary Caregiver Phone', 0, '', 'human', 0, 0, 0
FROM cases c;

INSERT OR IGNORE INTO form_51a_fields (case_id, section_id, field_id, label, required, value, source, confirmed_by_human, missing, multiline)
SELECT c.id, 'household', 'caregiver_dob', 'Primary Caregiver DOB / Age', 0, '', 'human', 0, 0, 0
FROM cases c;

INSERT OR IGNORE INTO form_51a_fields (case_id, section_id, field_id, label, required, value, source, confirmed_by_human, missing, multiline)
SELECT c.id, 'household', 'caregiver2_addr', 'Second Caregiver Address', 0, '', 'human', 0, 0, 0
FROM cases c;

INSERT OR IGNORE INTO form_51a_fields (case_id, section_id, field_id, label, required, value, source, confirmed_by_human, missing, multiline)
SELECT c.id, 'household', 'caregiver2_phone', 'Second Caregiver Phone', 0, '', 'human', 0, 0, 0
FROM cases c;

INSERT OR IGNORE INTO form_51a_fields (case_id, section_id, field_id, label, required, value, source, confirmed_by_human, missing, multiline)
SELECT c.id, 'household', 'caregiver2_dob', 'Second Caregiver DOB / Age', 0, '', 'human', 0, 0, 0
FROM cases c;

INSERT OR IGNORE INTO form_51a_fields (case_id, section_id, field_id, label, required, value, source, confirmed_by_human, missing, multiline)
SELECT c.id, 'filing', 'action_taken', 'Action Already Taken', 0, '', 'human', 0, 0, 1
FROM cases c;

INSERT OR IGNORE INTO form_51a_fields (case_id, section_id, field_id, label, required, value, source, confirmed_by_human, missing, multiline)
SELECT c.id, 'filing', 'protective_strengths', 'Protective Factors / Strengths', 0, '', 'human', 0, 0, 1
FROM cases c;
