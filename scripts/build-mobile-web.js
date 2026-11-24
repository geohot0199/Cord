#!/usr/bin/env node
// Builds the web root Capacitor packages into the Android app.
//
// The desktop renderer loads the shared Knot renderer from
// ../companion/renderer/knot3d.js, so the Android web root mirrors the same
// two directories instead of flattening the app. Capacitor opens /index.html;
// that file hands off to /renderer/index.html, where all relative paths work
// exactly as they do in Electron.
'use strict';

const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const out = path.join(root, 'www');

fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(out, { recursive: true });
fs.cpSync(path.join(root, 'renderer'), path.join(out, 'renderer'), { recursive: true });
fs.mkdirSync(path.join(out, 'companion', 'renderer'), { recursive: true });
fs.copyFileSync(path.join(root, 'companion', 'renderer', 'knot3d.js'), path.join(out, 'companion', 'renderer', 'knot3d.js'));
fs.writeFileSync(path.join(out, 'index.html'), `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
  <title>Nūs</title>
  <script>location.replace('renderer/index.html');</script>
</head>
<body><a href="renderer/index.html">Open Nūs</a></body>
</html>
`, 'utf8');
console.log('mobile web root written to www/');
