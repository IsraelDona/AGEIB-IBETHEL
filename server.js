const http = require('http');
const fs = require('fs');
const path = require('path');

function loadDotEnv(filePath) {
  if (!fs.existsSync(filePath)) return;

  const content = fs.readFileSync(filePath, 'utf8');
  content.split(/\r?\n/).forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return;

    const eqIndex = trimmed.indexOf('=');
    if (eqIndex === -1) return;

    const key = trimmed.slice(0, eqIndex).trim();
    let value = trimmed.slice(eqIndex + 1).trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    if (key && process.env[key] === undefined) {
      process.env[key] = value;
    }
  });
}

loadDotEnv(path.join(__dirname, '.env'));

const contactHandler = require('./api/contact');

const rootDir = __dirname;
const assetsDir = path.join(rootDir, 'assets');
const imgDir = path.join(rootDir, 'img');

const mimeTypes = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.json': 'application/json; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8'
};

function send(res, statusCode, body, contentType) {
  res.writeHead(statusCode, {
    'Content-Type': contentType || 'text/plain; charset=utf-8'
  });
  res.end(body);
}

function sendJson(res, statusCode, payload) {
  send(res, statusCode, JSON.stringify(payload), 'application/json; charset=utf-8');
}

function serveFile(res, filePath) {
  fs.readFile(filePath, (err, data) => {
    if (err) {
      send(res, 404, 'Not found');
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    send(res, 200, data, mimeTypes[ext] || 'application/octet-stream');
  });
}

function createResponse(res) {
  return {
    status(code) {
      res.statusCode = code;
      return this;
    },
    setHeader(name, value) {
      res.setHeader(name, value);
      return this;
    },
    send(payload) {
      if (Buffer.isBuffer(payload)) {
        res.end(payload);
        return;
      }
      if (typeof payload === 'object') {
        res.end(JSON.stringify(payload));
        return;
      }
      res.end(String(payload));
    }
  };
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, 'http://localhost');
  const pathname = url.pathname;

  if (pathname === '/api/contact') {
    if (req.method !== 'POST') {
      sendJson(res, 405, { message: 'Method not allowed' });
      return;
    }

    let rawBody = '';
    req.on('data', (chunk) => {
      rawBody += chunk;
    });

    req.on('end', async () => {
      try {
        req.body = rawBody;
        await contactHandler(req, createResponse(res));
      } catch (error) {
        sendJson(res, 500, { message: 'Internal server error' });
      }
    });

    return;
  }

  if (pathname === '/' || pathname === '/index.html') {
    serveFile(res, path.join(assetsDir, 'index.html'));
    return;
  }

  if (pathname.startsWith('/assets/')) {
    const filePath = path.join(rootDir, pathname.slice(1));
    if (!filePath.startsWith(assetsDir)) {
      send(res, 403, 'Forbidden');
      return;
    }
    serveFile(res, filePath);
    return;
  }

  if (pathname.startsWith('/img/')) {
    const filePath = path.join(rootDir, pathname.slice(1));
    if (!filePath.startsWith(imgDir)) {
      send(res, 403, 'Forbidden');
      return;
    }
    serveFile(res, filePath);
    return;
  }

  send(res, 404, 'Not found');
});

const port = Number(process.env.PORT || 3000);

server.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
