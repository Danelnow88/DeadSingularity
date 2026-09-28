'use strict';

const http = require('http');
const fs = require('fs');
const path = require('path');

const HOST = '127.0.0.1';
const PORT = 8000;
const ROOT = path.resolve(__dirname, '..');
const HEALTH_PATH = '/__neon_void_dev_server__';
const HEALTH_BODY = 'NEON_VOID_DEV_SERVER_OK';

const MIME_TYPES = Object.freeze({
  '.html': 'text/html; charset=utf-8',
  '.htm': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.wav': 'audio/wav',
  '.mp3': 'audio/mpeg',
  '.ogg': 'audio/ogg',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.txt': 'text/plain; charset=utf-8',
  '.map': 'application/json; charset=utf-8'
});

function sendText(res, statusCode, body) {
  res.writeHead(statusCode, {
    'Content-Type': 'text/plain; charset=utf-8',
    'Cache-Control': 'no-store',
    'Content-Length': Buffer.byteLength(body)
  });
  res.end(body);
}

function resolveRequestPath(requestUrl) {
  const rawPathname = String(requestUrl || '').split('?')[0].split('#')[0];
  if (!rawPathname.startsWith('/')) return null;

  let pathname;
  try {
    pathname = decodeURIComponent(rawPathname);
  } catch (error) {
    return null;
  }

  const normalizedSeparators = pathname.replace(/\\/g, '/');
  const pathSegments = normalizedSeparators.split('/');
  if (pathSegments.some((segment) => segment === '..')) return null;

  const relativePath = normalizedSeparators.replace(/^\/+/, '');
  const resolvedPath = path.resolve(ROOT, relativePath);
  const rootPrefix = ROOT.endsWith(path.sep) ? ROOT : ROOT + path.sep;
  if (resolvedPath !== ROOT && !resolvedPath.startsWith(rootPrefix)) {
    return null;
  }
  return resolvedPath;
}

function serveStatic(req, res) {
  const filePath = resolveRequestPath(req.url || '/');
  if (!filePath) {
    sendText(res, 403, 'Forbidden');
    return;
  }

  fs.stat(filePath, (statError, stats) => {
    if (statError || !stats.isFile()) {
      sendText(res, 404, 'Not Found');
      return;
    }

    const contentType = MIME_TYPES[path.extname(filePath).toLowerCase()] || 'application/octet-stream';
    res.writeHead(200, {
      'Content-Type': contentType,
      'Cache-Control': 'no-store',
      'Content-Length': stats.size
    });

    if (req.method === 'HEAD') {
      res.end();
      return;
    }

    fs.createReadStream(filePath)
      .on('error', () => {
        if (!res.headersSent) sendText(res, 500, 'Internal Server Error');
        else res.destroy();
      })
      .pipe(res);
  });
}

function createServer() {
  return http.createServer((req, res) => {
    if (req.url && req.url.split('?')[0] === HEALTH_PATH) {
      if (req.method === 'GET' || req.method === 'HEAD') sendText(res, 200, HEALTH_BODY);
      else sendText(res, 405, 'Method Not Allowed');
      return;
    }

    if (req.method !== 'GET' && req.method !== 'HEAD') {
      sendText(res, 405, 'Method Not Allowed');
      return;
    }

    serveStatic(req, res);
  });
}

function checkExistingServer(callback) {
  const request = http.get({ host: HOST, port: PORT, path: HEALTH_PATH, timeout: 700 }, (res) => {
    let body = '';
    res.setEncoding('utf8');
    res.on('data', (chunk) => { body += chunk; });
    res.on('end', () => callback(null, res.statusCode === 200 && body === HEALTH_BODY));
  });
  request.on('timeout', () => request.destroy(new Error('timeout')));
  request.on('error', (error) => callback(error, false));
}

function start() {
  checkExistingServer((healthError, isOurServer) => {
    if (isOurServer) {
      console.log('NEON VOID local server already running at http://' + HOST + ':' + PORT);
      return;
    }

    const server = createServer();
    server.once('error', (error) => {
      if (error.code === 'EADDRINUSE') {
        console.error('ERROR: port ' + PORT + ' is occupied by another process.');
        console.error('The existing process was not stopped and no duplicate server was started.');
      } else {
        console.error('ERROR: could not start local server:', error.message);
      }
      process.exitCode = 1;
    });
    server.listen(PORT, HOST, () => {
      console.log('NEON VOID local server listening at http://' + HOST + ':' + PORT);
      console.log('Serving project root: ' + ROOT);
    });
  });
}

if (require.main === module) start();

module.exports = { HEALTH_BODY, HEALTH_PATH, HOST, PORT, ROOT, createServer, resolveRequestPath };