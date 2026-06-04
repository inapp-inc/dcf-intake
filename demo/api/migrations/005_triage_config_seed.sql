-- Seed triage config on DBs that ran 004 before seed was added
INSERT OR IGNORE INTO system_config (key, value_json, updated_at)
VALUES (
  'triage',
  '{"keywordPatterns":[{"label":"weapon","pattern":"\\b(gun|firearm|weapon|knife|pistol|rifle)\\b","flags":"i"},{"label":"injury","pattern":"\\b(bruise|bruising|hit|beat|abuse|hurt)\\b","flags":"i"},{"label":"removal","pattern":"\\b(removal|removed|foster)\\b","flags":"i"}],"triageIndicators":[{"id":"young_child","label":"Very young child in household","severity":"high"},{"id":"weapon","label":"Weapon present","severity":"critical"},{"id":"prior_removal","label":"Prior removal history","severity":"high"},{"id":"perp_in_home","label":"Perpetrator currently in home","severity":"high"},{"id":"imminent_fear","label":"Reporter expressing imminent fear","severity":"critical"}],"escalationThreshold":2}',
  datetime('now')
);
