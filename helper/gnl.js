const fs = require("fs/promises");
const readline = require("readline");

class GetNextLine {
  constructor(source, options = {}) {
    this.source = source;
    this.options = options;
    this.fileHandle = null;
    this.rl = null;
    this.buffer = Buffer.alloc(options.bufferSize || 1024);
    this.bufferOffset = 0;
    this.bufferLength = 0;
    this.fileOffset = 0;
    this.eof = false;
    this.lineEnding = options.lineEnding || /\r?\n/;
    this.isTerminal = source === "terminal";
  }

  async open() {
    if (this.isTerminal) {
      this.rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
        prompt: this.options.prompt || "",
      });
    } else {
      try {
        this.fileHandle = await fs.open(this.source, "r");
      } catch (error) {
        throw new Error(`Failed to open file: ${error.message}`);
      }
    }
  }

  async close() {
    if (this.isTerminal && this.rl) {
      this.rl.close();
    } else if (this.fileHandle) {
      await this.fileHandle.close();
      this.fileHandle = null;
    }
  }

  async fillBuffer() {
    if (this.eof) return 0;

    try {
      const { bytesRead } = await this.fileHandle.read(
        this.buffer,
        0,
        this.buffer.length,
        this.fileOffset
      );

      this.bufferOffset = 0;
      this.bufferLength = bytesRead;
      this.fileOffset += bytesRead;

      if (bytesRead < this.buffer.length) {
        this.eof = true;
      }

      return bytesRead;
    } catch (error) {
      throw new Error(`Error reading file: ${error.message}`);
    }
  }

  async getNextLine() {
    if (!this.rl && !this.fileHandle) {
      await this.open();
    }

    if (this.isTerminal) {
      return new Promise((resolve) => {
        this.rl.question("", (line) => {
          if (line.toLowerCase() === "eof") {
            this.eof = true;
            resolve(null);
          } else {
            resolve(line);
          }
        });
      });
    }

    let line = "";
    let lineEnding = null;

    while (true) {
      if (this.bufferOffset >= this.bufferLength) {
        const bytesRead = await this.fillBuffer();
        if (bytesRead === 0 && line.length === 0) {
          await this.close();
          return line || null; // EOF reached
        }
      }

      const remainingBuffer = this.buffer.slice(
        this.bufferOffset,
        this.bufferLength
      );
      const endingMatch = remainingBuffer.toString().match(this.lineEnding);

      if (endingMatch) {
        lineEnding = endingMatch[0];
        const endIndex = endingMatch.index;
        line += remainingBuffer.slice(0, endIndex).toString();
        this.bufferOffset += endIndex + lineEnding.length;
        break;
      } else {
        line += remainingBuffer.toString();
        this.bufferOffset = this.bufferLength;
      }
    }

    return line;
  }
}

module.exports = { GetNextLine };