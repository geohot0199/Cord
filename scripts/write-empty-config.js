#!/usr/bin/env node
// Writes an empty src/config.js for a public build. Sign-in, live calendar,
// and Outlook stay off; the app remains local-first and every other feature
// works. CI uses this instead of requiring the founder's secrets.
'use strict';

const fs = require('fs');
const path = require('path');

const target = path.join(__dirname, '..', 'src', 'config.js');
if (fs.existsSync(target)) {
  console.log('write-empty-config: src/config.js already exists, leaving it alone.');
  process.exit(0);
}
fs.writeFileSync(target, `// Local configuration. Gitignored; generated for a public build.
module.exports = {
  supabase: { url: '', anonKey: '' },
  googleCalendar: { clientId: '', clientSecret: '', scopes: [] },
  outlook: { clientId: '', tenant: 'common', scopes: [], sendScopes: [] },
};
module.exports.isSupabaseConfigured = (cfg) => Boolean(cfg && cfg.supabase && cfg.supabase.url && cfg.supabase.anonKey);
module.exports.isGoogleCalendarConfigured = (cfg) => Boolean(cfg && cfg.googleCalendar && cfg.googleCalendar.clientId && cfg.googleCalendar.clientSecret);
module.exports.isOutlookConfigured = (cfg) => Boolean(cfg && cfg.outlook && cfg.outlook.clientId);
`, 'utf8');
console.log('write-empty-config: wrote src/config.js');
