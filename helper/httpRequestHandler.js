const { isHttpRequest, parseHttpRequest } = require("../utils");

async function handleHttpRequest({ method, url, headers, body }) {
  const controller = new AbortController();
  const signal = controller.signal;
  let requestBody = body;

  // Handle file reference for request body
  if (typeof body === "string" && body.startsWith("<")) {
    const filePath = body.slice(1).trim();
    try {
      requestBody = await FileSystem.readFile(filePath, "utf8");
    } catch (err) {
      console.error(`Error reading file ${filePath}: ${err.message}`);
      return;
    }
  }

  const methodUpper = method.toUpperCase();
  const requestOptions = {
    method: methodUpper,
    headers,
    body: ["POST", "PUT", "PATCH"].includes(methodUpper)
      ? JSON.stringify(requestBody)
      : undefined,
    signal,
  };

  try {
    const response = await fetch(url, requestOptions);
    const responseHeaders = {};

    response.headers.forEach((value, name) => {
      responseHeaders[name] = value;
    });

    // Get the response body
    const contentType = response.headers.get("content-type");
    const responseData =
      contentType && contentType.includes("application/json")
        ? await response.json()
        : await response.text();

    if (contentType && contentType.startsWith("image")) {
      // Display image directly in a data URI format
      const blob = await response.blob();
      const imageUrl = URL.createObjectURL(blob);
      console.log(`Image response: ${imageUrl}`);
    } else {
      console.log(`Response from ${methodUpper} ${url}:\n`);
      console.log(`HTTP/1.1 ${response.status} ${response.statusText}`);

      response.headers.forEach((value, name) => {
        console.log(`${name}: ${value}`);
      });
      console.log(); // Blank line

      console.log(responseData); // Output the body
    }
  } catch (error) {
    console.error(`Error during HTTP request: ${error.message}`);
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

module.exports = { handleHttpRequest, handleAllRequests };
