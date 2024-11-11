# Playbook CLI

A command processor for various file operations.

## Installation

### Global Installation (recommended for command-line usage)

If installed globally:
Run the tool directly from the command line:

```bash
    npm install -g playbook_cli
```

### Local Installation

If installed locally:
Add a script to your project's package.json
Then, run the playbook

```json
   "scripts": {
       "playbook": "node node_modules/playbook_cli/index.js"
   }
npm run playbook
```

Alternatively, run directly with:

```bash
    node node_modules/playbook_cli/index.js
```

## Usage

1. Run the tool:

2. When prompted, enter a filename to create.

3. Start typing commands in the created file.

4. The tool will process commands based on the file extension:

   - No extension: Executes as a terminal command
   - .math: Handles math calculations
   - .txt or .file: Performs file operations
   - .http or .rest: Handles HTTP requests

5. To exit, type 'exit' or 'quit' when prompted for a filename.
