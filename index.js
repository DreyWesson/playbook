#!/usr/bin/env node

const fs = require('fs/promises');
const fsSync = require('fs');
const { handleAllRequests } = require("./helper/httpRequestHandler.js");
const fileOperations = require("./helper/fileOps.js");
const { handleMath, executeCommand } = require("./helper/commandExecutor.js");
const { printWelcome } = require("./utils/index.js");
// const { watch } = require('fs');
const { getCommandFileName } = require("./helper/cmd.js");
const { COLORS } = require("./utils/constant.js");

async function prependToFile(filePath, data) {
  try {
    const existingContent = await fs.readFile(filePath, 'utf8');
    const newContent = data + existingContent;
    await fs.writeFile(filePath, newContent, 'utf8');
    // await filePath.close();
    console.log('Data prepended successfully!');
  } catch (err) {
    console.error('Error prepending data:', err);
  }
}

const debounce = (fn, delay) => {
  let timeId;
  let lastCallTime = 0;

  return function (...args) {
    const now = Date.now();
    if (now - lastCallTime < delay) {
      clearTimeout(timeId);
    }
    lastCallTime = now;

    timeId = setTimeout(() => {
      args.length > 0 ? console.log(args[0]) : null;
      fn.apply(this, args);
    }, delay);
  };
};

// async function fileWatcher(filePath, options = {}, cb) {
//   const debouncedCallback = debounce(cb, 100);
//   let watcher;

//   try {
//     console.log(
//       `${COLORS.CYAN}Watching ${COLORS.YELLOW}${filePath}${COLORS.CYAN} for changes...${COLORS.RESET}`
//     );
//     watcher = fs.watch(filePath, {
//       recursive: true,
//       ...options.watchOptions,
//     });

//     for await (const event of watcher) {
//       if (
//         options.type ? event.eventType === options.type.toLowerCase() : true
//       ) {
//         const eventType =
//           event.eventType.charAt(0).toUpperCase() + event.eventType.slice(1);
//         debouncedCallback(
//           `${COLORS.MAGENTA}${eventType} detected${COLORS.RESET}: ${filePath}`
//         );
//       }
//     }
//   } catch (error) {
//     console.error(`Error watching file: ${error.message}`);
//   }
// }

async function fileWatcher(filePath, options = {}, cb) {
  const debouncedCallback = debounce(cb, 100);

  console.log(`${COLORS.CYAN}Watching ${COLORS.YELLOW}${filePath}${COLORS.CYAN} for changes...${COLORS.RESET}`);
  
  fsSync.watchFile(filePath, { interval: 100 }, (curr, prev) => {
    if (curr.mtime !== prev.mtime) {
      const eventType = 'Change';
      debouncedCallback(`${COLORS.MAGENTA}${eventType} detected${COLORS.RESET}: ${filePath}`);
    }
  });
}

(async function () {
  printWelcome();

  let filePath;
  while (!filePath) {
    filePath = await getCommandFileName();
    if (!filePath || filePath.trim() === "") {
      console.log("Invalid filename. Please enter a file name.");
      filePath = null;
    }
  }
  const extIdx = filePath.lastIndexOf(".");
  const ext = extIdx !== -1 ? filePath.substring(extIdx + 1) : "";
  if (filePath === "exit" || filePath === "quit") process.exit(0);

  try {
    await fs.access(filePath);
  } catch (error) {
    if (error.code === 'ENOENT') {
      await fs.writeFile(filePath, '', { flag: 'wx' });
      console.log(`File ${filePath} created.`);
    } else {
      throw error;
    }
  }

  // await fs.writeFile(filePath, '', { flag: 'a' });
  await prependToFile(filePath, "____WAIT____ ");
  
  const options = { type: "change" };
  fileWatcher(filePath, options, cb);

  async function cb() {
    try {
      const content = await fs.readFile(filePath, 'utf8');

      if (!content || content.length < 2) return;

      if (content.includes("____WAIT____")) return;
      if (ext === "") executeCommand(content);
      if (ext === "math") handleMath(content);
      if (ext === "txt" || ext === "file")
        await fileOperations.fileHandler(filePath);
      if (ext === "http" || ext === "rest") await handleAllRequests(content);
    } catch (error) {
      console.error('Error reading file:', error);
    }
  }
})().catch(console.error);