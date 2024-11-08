// const FileSystem = require("../../02.FileSystem/filesystem.js");
const fs = require("fs/promises");
const { GetNextLine } = require("./gnl.js");
const { actions } = require("../utils/constant.js");

function formatExtractedTokens(command) {
  const splitCommand = command.split(" ");

  const pathIndex = splitCommand.findIndex(
    (part) =>
      part.startsWith("/") || part.startsWith("./") || part.includes(".")
  );

  if (pathIndex === -1) {
    return [command];
  }

  const actionPart = splitCommand.slice(0, pathIndex).join(" ");
  const filePath = splitCommand[pathIndex];
  const content = splitCommand.slice(pathIndex + 1).join(" ");

  return [actionPart, filePath, content];
}

function actionIncludes(actionPart, actionArray) {
  return actionArray.some((word) =>
    actionPart.toLowerCase().includes(word.toLowerCase())
  );
}

async function processLine(line) {
  if (!line.trim()) return;
  const [action, filePath, content] = formatExtractedTokens(line);
  
  try {
    
    if (actionIncludes(action, actions.CREATE_FILE)) {
      // await FileSystem.createFile(filePath);
      const file = await fs.open(filePath, "wx");
        await file.close();
        console.log(`${filePath} created successfully!`);
    } else if (actionIncludes(action, actions.DELETE_FILE)) {
      // await FileSystem.deleteFile(filePath);
      await fs.unlink(filePath);
      console.log(`File deleted successfully: ${filePath}`);
    } else if (actionIncludes(action, actions.RENAME_FILE)) {
      let oldname = filePath;
      let newname = content;
      // await FileSystem.renameFile(oldname, newname);
      await fs.rename(oldname, newname);
      console.log(`${oldname} rename successful: ${newname}`);
    } else if (actionIncludes(action, actions.ADD_TO_FILE)) {
      // await FileSystem.addToFile(filePath, content);
      await fs.appendFile(filePath, content);
      console.log(`Successfully added content to ${filePath}`);
    }
  } catch (error) {
    console.log("Some error occurred!!!")
    console.log(error)
  }

}

async function fileHandler(filePath) {
  const gnl = new GetNextLine(filePath, {
    bufferSize: 64,
    lineEnding: /\r?\n|\r/,
  });

  try {
    await gnl.open();
    let line;
    while ((line = await gnl.getNextLine()) !== null) {
      console.log(line);
      await processLine(line);
    }
  } catch (error) {
    console.error("Error during file processing:", error.message);
  } finally {
    await gnl.close();
  }
}

module.exports = { fileHandler };
