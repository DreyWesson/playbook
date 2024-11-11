# Playbook CLI

Playbook CLI is a versatile command processor that allows you to perform various file operations, execute terminal commands, handle math calculations, and make HTTP requests directly from text files. It's like having Postman or Insomnia built into your command line!

## Why You Might Need It

1. Server-Friendly: As a CLI tool, it's perfect for headless server environments where GUI applications aren't practical or available.
2. API Testing Without GUI: Perform HTTP requests (GET, POST, PUT, PATCH, DELETE) similar to Postman or Insomnia, directly from the command line.
3. Resource Efficiency: Lightweight Node.js application that consumes fewer system resources compared to full GUI tools.
4. Scriptable and Versionable: File-based approach allows easy creation, saving, and version control of API tests and other operations.
5. Easy Installation: Simple to install and use on any system with Node.js, making it ideal for cloud environments.
6. No GUI Dependency: Perfect for environments where installing GUI applications is impractical or impossible.
7. All-in-One Tool: Combines HTTP request functionality, file operations, and command execution in a single, lightweight package.

Playbook CLI is especially valuable for developers and administrators working with virtual servers, CI/CD pipelines, or any environment where GUI tools are impractical. It provides a streamlined, efficient way to perform various tasks that would typically require multiple tools or a graphical interface.

## Installation

### Local Installation (recommended for command-line usage)

```bash
    npm install playbook_cli
```

### Global Installation

```bash
    npm install -g playbook_cli
```

### Usage

If installed globally:
Run the tool directly from the command line:

```bash
    playbook_cli
```

If installed locally:

1. Add a script to your project's package.json:

    ```json
    "scripts": {
    "playbook": "node node_modules/playbook_cli/index.js" // or npx playbook_cli
    }
    ```

2. Run the tool:

    ```bash
        npm run playbook
    ```

    Alternatively, you can run it directly with node:

    ```bash
        node node_modules/playbook_cli/index.js
    ```

### How to use

1. When prompted, enter a filename to create.
2. Start typing commands in the created file.
3. The tool will process commands based on the file extension:
    - No extension: Executes as a terminal command
    - .math: Handles math calculations
    - .txt or .file: Performs file operations
    - .http or .rest: Handles HTTP requests (like Postman or Insomnia!)
4. To exit, type 'exit' or 'quit' when prompted for a filename.

### HTTP Requests (Postman/Insomnia-like functionality)

Using the .http or .rest extension, you can create files that work like Postman or Insomnia. Here's a sample usage (write changes is the file you created):

```http
    GET https://jsonplaceholder.typicode.com/posts/1

    GET https://source.unsplash.com/random/4000x3000

    GET https://via.placeholder.com/5000x5000

    GET https://eoimages.gsfc.nasa.gov/images/imagerecords/57000/57735/land_ocean_ice_8192.png

    PUT https://jsonplaceholder.typicode.com/posts/1
    Content-Type: application/json

    {
    "id": 1,
    "title": "updated title",
    "body": "updated body content",
    "userId": 1
    }

    PATCH https://jsonplaceholder.typicode.com/posts/1
    Content-Type: application/json

    {
    "title": "partially updated title"
    }

    DELETE https://jsonplaceholder.typicode.com/posts/1

    POST https://jsonplaceholder.typicode.com/comments
    Content-Type: application/json

    {
    "postId": 1,
    "name": "New Comment",
    "email": "test@example.com",
    "body": "This is a new comment."
    }
```
