const { COLORS } = require("./constant");

const isHttpRequest = (request) => {
  const httpMethods = [
    "GET",
    "POST",
    "PUT",
    "DELETE",
    "PATCH",
    "OPTIONS",
    "HEAD",
  ];
  return httpMethods.includes(request.method.toUpperCase());
};

function parseHttpRequest(request) {
  const lines = request.split(/\r?\n/);
  const parsedRequests = [];
  let method,
    url,
    protocol = "HTTP/1.1";
  const headers = {};
  let bodyLines = [];
  let state = "REQUEST_LINE";
  let contentLength = 0;
  let isChunked = false;

  for (const line of lines) {
    const trimmedLine = line.trim();

    if (state === "REQUEST_LINE") {
      if (!trimmedLine) continue; // Skip empty lines before request line
      [method, url, protocol] = trimmedLine.split(" ");
      protocol = protocol || "HTTP/1.1";
      state = "HEADERS";
    } else if (state === "HEADERS") {
      if (trimmedLine === "") {
        // An empty line indicates the end of headers, move to BODY state
        contentLength = parseInt(headers["Content-Length"] || "0", 10);
        isChunked = headers["Transfer-Encoding"]?.toLowerCase() === "chunked";
        state = "BODY";
      } else {
        const [key, value] = trimmedLine.split(/:\s+/);
        headers[key] = value;
      }
    } else if (state === "BODY") {
      if (isChunked) {
        // Handle chunked transfer encoding
        let chunkSize = parseInt(trimmedLine, 16);
        while (chunkSize > 0) {
          const chunk = lines.splice(0, chunkSize).join("\n");
          bodyLines.push(chunk);
          chunkSize = parseInt(lines.shift(), 16); // Read next chunk size
        }
        state = "END"; // End of chunked body
      } else if (contentLength > 0) {
        // Read body based on Content-Length
        bodyLines.push(trimmedLine);
        contentLength -= Buffer.byteLength(trimmedLine, "utf-8");
        if (contentLength <= 0) {
          state = "END"; // End of body based on Content-Length
        }
      } else if (
        /^(GET|POST|PUT|DELETE|PATCH|OPTIONS|HEAD)/.test(trimmedLine)
      ) {
        // If we encounter another request line, finalize the current request
        parsedRequests.push({
          method,
          url,
          protocol,
          headers: { ...headers },
          body: parseBody(bodyLines.join("\n"), headers),
        });

        // Reset for the next request
        method = url = protocol = "";
        bodyLines = [];
        Object.keys(headers).forEach((key) => delete headers[key]);

        [method, url, protocol] = trimmedLine.split(" ");
        protocol = protocol || "HTTP/1.1";
        state = "HEADERS";
      } else {
        // Accumulate body lines
        bodyLines.push(trimmedLine);
      }
    }
  }

  // Add the last request if it exists
  if (method && url) {
    parsedRequests.push({
      method,
      url,
      protocol,
      headers,
      body: parseBody(bodyLines.join("\n"), headers),
    });
  }

  return parsedRequests;
}

function parseBody(body, headers) {
  const contentType = headers["Content-Type"] || headers["content-type"];
  if (contentType && contentType.includes("application/json")) {
    try {
      return JSON.parse(body);
    } catch (e) {
      console.error("Failed to parse JSON body:", e.message);
    }
  }
  return body.trim();
}

// function printWelcome() {
//   const { RESET, BOLD, GREEN, YELLOW, BLUE, MAGENTA, GRAY, RED } = COLORS;

//   console.log(`${BOLD}${GREEN}Welcome to the Command Processor!${RESET}`);
//   console.log(`Create a command file when prompted.`);
//   console.log(`${YELLOW}Usage based on file extensions:${RESET}`);
//   console.log(`${MAGENTA}  - ".http" or ".rest": ${GRAY}HTTP requests${RESET}`);
//   console.log(`${BLUE}  - ".txt" or ".file": ${GRAY}File operations${RESET}`);
//   console.log(`${GREEN}  - ".math": ${GRAY}Math calculations${RESET}`);
//   console.log(`${RED}  - No extension: ${GRAY}Terminal commands${RESET}`);
//   console.log(`${YELLOW}Usage based on autosave:${RESET}`);
//   console.log(`  if (done) BOF(remove____WAIT____) && EOF(add_new_line)`);
//   console.log(`${RED}Exit: ${GRAY}Enter exit or quit${RESET}`);
// }

function printWelcome() {
  const RESET = "\x1b[0m";
  const BOLD = "\x1b[1m";
  const GREEN = "\x1b[32m";
  const YELLOW = "\x1b[33m";
  const BLUE = "\x1b[34m";
  const MAGENTA = "\x1b[35m";
  const GRAY = "\x1b[90m";
  const RED = "\x1b[31m";

  console.log(`
   ____                                          _ 
  / ___|___  _ __ ___  _ __ ___   __ _ _ __   __| |
 | |   / _ \\| '_ \` _ \\| '_ \` _ \\ / _\` | '_ \\ / _\` |
 | |__| (_) | | | | | | | | | | | (_| | | | | (_| |
  \\____\\___/|_| |_| |_|_| |_| |_|\\__,_|_| |_|\\__,_|
  ____                                             
 |  _ \\ _ __ ___   ___ ___  ___ ___  ___  _ __     
 | |_) | "__/ _ \\ / __/ _ \\/ __/ __|/ _ \\| '__|    
 |  __/| | | (_) | (_|  __/\\__ \\__ \\ (_) | |       
 |_|   |_|  \\___/ \\___\\___||___/___/\\___/|_| `);
  console.log(`
  ${BOLD}${GREEN}Welcome to the Command Processor!${RESET}
  Create files with extensions to perform specific tasks:
  ${MAGENTA}.http${RESET}/${BLUE}.txt${RESET}/${GREEN}.math${RESET}/${RED}none${RESET} for HTTPFile/Math/Terminal ops.
  Autosave: remove ____WAIT___ @BOF and include newline @EOF rules apply.
  ${RED}Exit: type 'exit' or 'quit'${RESET}
  `);
}

// Call the function to display the welcome message
// printWelcome();

module.exports = { parseHttpRequest, isHttpRequest, printWelcome };
