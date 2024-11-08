const fs = require('fs').promises;
const { Readable, Writable } = require('stream');
const { promisify } = require('util');
const https = require('https');
const http = require('http');
const { URL } = require('url');

const pipeline = promisify(require('stream').pipeline);

const isHttpRequest = (request) => {
  const httpMethods = ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS", "HEAD"];
  return httpMethods.includes(request.method.toUpperCase());
};

function parseHttpRequest(request) {
  const lines = request.split(/\r?\n/);
  const parsedRequests = [];
  let method, url, protocol = "HTTP/1.1";
  const headers = {};
  let bodyStream;
  let state = "REQUEST_LINE";
  let contentLength = 0;
  let isChunked = false;

  for (const line of lines) {
    const trimmedLine = line.trim();

    if (state === "REQUEST_LINE") {
      if (!trimmedLine) continue;
      [method, url, protocol] = trimmedLine.split(" ");
      protocol = protocol || "HTTP/1.1";
      state = "HEADERS";
    } else if (state === "HEADERS") {
      if (trimmedLine === "") {
        contentLength = parseInt(headers["Content-Length"] || "0", 10);
        isChunked = headers["Transfer-Encoding"]?.toLowerCase() === "chunked";
        state = "BODY";
        bodyStream = new Readable();
        bodyStream._read = () => {};
      } else {
        const [key, value] = trimmedLine.split(/:\s+/);
        headers[key] = value;
      }
    } else if (state === "BODY") {
      if (isChunked) {
        let chunkSize = parseInt(trimmedLine, 16);
        while (chunkSize > 0) {
          const chunk = lines.splice(0, chunkSize).join("\n");
          bodyStream.push(chunk);
          chunkSize = parseInt(lines.shift(), 16);
        }
        bodyStream.push(null);
        state = "END";
      } else if (contentLength > 0) {
        bodyStream.push(trimmedLine);
        contentLength -= Buffer.byteLength(trimmedLine, "utf-8");
        if (contentLength <= 0) {
          bodyStream.push(null);
          state = "END";
        }
      } else if (/^(GET|POST|PUT|DELETE|PATCH|OPTIONS|HEAD)/.test(trimmedLine)) {
        bodyStream.push(null);
        parsedRequests.push({ method, url, protocol, headers: { ...headers }, body: bodyStream });
        
        method = url = protocol = "";
        Object.keys(headers).forEach((key) => delete headers[key]);
        [method, url, protocol] = trimmedLine.split(" ");
        protocol = protocol || "HTTP/1.1";
        state = "HEADERS";
        bodyStream = new Readable();
        bodyStream._read = () => {};
      } else {
        bodyStream.push(trimmedLine);
      }
    }
  }

  if (method && url) {
    if (state === "BODY") bodyStream.push(null);
    parsedRequests.push({ method, url, protocol, headers, body: bodyStream });
  }

  return parsedRequests;
}

async function handleMultipartData(headers, bodyStream) {
  const boundary = headers['content-type'].split('boundary=')[1];
  const formData = {};
  let currentField = null;
  let currentFieldStream = null;

  return new Promise((resolve, reject) => {
    bodyStream.on('data', (chunk) => {
      const str = chunk.toString();
      if (str.includes(`--${boundary}`)) {
        if (currentFieldStream) {
          currentFieldStream.end();
        }
        const headerMatch = str.match(/Content-Disposition: form-data; name="([^"]+)"/);
        if (headerMatch) {
          currentField = headerMatch[1];
          if (str.includes('filename=')) {
            const filenameMatch = str.match(/filename="([^"]+)"/);
            const filename = filenameMatch ? filenameMatch[1] : `file_${Date.now()}`;
            const saveTo = `upload_${currentField}_${filename}`;
            currentFieldStream = fs.createWriteStream(saveTo);
            formData[currentField] = { filename, saveTo };
          } else {
            formData[currentField] = '';
            currentFieldStream = new Writable({
              write(chunk, encoding, callback) {
                formData[currentField] += chunk.toString();
                callback();
              }
            });
          }
        }
      } else if (currentFieldStream) {
        currentFieldStream.write(chunk);
      }
    });

    bodyStream.on('end', () => {
      if (currentFieldStream) {
        currentFieldStream.end();
      }
      resolve(formData);
    });

    bodyStream.on('error', reject);
  });
}

function makeRequest(url, options, body) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const reqModule = urlObj.protocol === 'https:' ? https : http;
    
    const req = reqModule.request(url, options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        resolve({ statusCode: res.statusCode, headers: res.headers, data });
      });
    });

    req.on('error', reject);

    if (body) {
      if (body instanceof Readable) {
        body.pipe(req);
      } else {
        req.write(body);
        req.end();
      }
    } else {
      req.end();
    }
  });
}

async function handleHttpRequest({ method, url, headers, body }) {
  let requestBody = body;
  let tempFilePath;

  const methodUpper = method.toUpperCase();
  const requestOptions = {
    method: methodUpper,
    headers,
  };

  if (body instanceof Readable) {
    if (headers['content-type']?.startsWith('multipart/form-data')) {
      requestBody = await handleMultipartData(headers, body);
    } else {
      tempFilePath = `temp_${Date.now()}.tmp`;
      await pipeline(body, fs.createWriteStream(tempFilePath));
      requestBody = fs.createReadStream(tempFilePath);
    }
  } else if (typeof body === "string" && body.startsWith("<")) {
    const filePath = body.slice(1).trim();
    try {
      requestBody = await fs.readFile(filePath, "utf8");
    } catch (err) {
      console.error(`Error reading file ${filePath}: ${err.message}`);
      return;
    }
  }

  if (["POST", "PUT", "PATCH"].includes(methodUpper) && !(requestBody instanceof Readable)) {
    requestOptions.headers['Content-Length'] = Buffer.byteLength(requestBody);
  }

  try {
    const response = await makeRequest(url, requestOptions, requestBody);

    console.log(`Response from ${methodUpper} ${url}:\n`);
    console.log(`HTTP/1.1 ${response.statusCode}`);

    Object.entries(response.headers).forEach(([name, value]) => {
      console.log(`${name}: ${value}`);
    });
    console.log();

    const contentType = response.headers['content-type'];
    if (contentType && contentType.startsWith("image")) {
      console.log(`Image response received. Content-Type: ${contentType}`);
    } else {
      console.log(response.data);
    }
  } catch (error) {
    console.error(`Error during HTTP request: ${error.message}`);
  } finally {
    if (tempFilePath) {
      await fs.unlink(tempFilePath).catch(() => {});
    }
  }
}

async function handleAllRequests(content) {
  const requests = parseHttpRequest(content);
  for (const request of requests) {
    if (isHttpRequest(request)) {
      await handleHttpRequest(request);
    } else {
      console.log("Not a valid HTTP request:", request);
    }
  }
}

module.exports = { handleHttpRequest, handleAllRequests, parseHttpRequest, isHttpRequest };