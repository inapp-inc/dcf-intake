INSERT OR IGNORE INTO system_config (key, value_json, updated_at)
VALUES (
  'risk_framework',
  '{"version":"statistical-v1","scaleMin":1,"scaleMax":20,"baselinePoints":2,"emergencyPoints":5,"keywordPoints":{"weapon":4,"injury":3,"removal":2},"defaultKeywordPoints":2,"triageSeverityPoints":{"critical":4,"high":2},"pendingTriageMultiplier":0.5,"bands":[{"min":15,"label":"High"},{"min":10,"label":"Moderate"},{"min":1,"label":"Lower"}]}',
  datetime('now')
);
