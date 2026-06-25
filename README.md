# bun-mcp-server

A lightweight HTTP-based [Model Context Protocol](https://modelcontextprotocol.io/) (MCP) server built with [Bun](https://bun.sh).

## Motivation

This project explores the MCP lifecycle through a clean, modular implementation built with **Bun**. By separating HTTP routing from JSON-RPC 2.0 handling, the architecture aims to remain transport-agnostic, providing a clear reference for how the protocol functions under the hood.

> [!Note]
> This is an educational, work-in-progress implementation and does not cover the full MCP specification.

---

本プロジェクトは、**Bun** を使用したクリーンかつモジュール化された実装を通じて、MCP（Model Context Protocol）のライフサイクルを探求するものです。HTTPルーティングとJSON-RPC 2.0の処理を分離することでトランスポート層に依存しない設計を実現し、プロトコルの内部動作を理解するためのリファレンスとして機能します。

> [!Note]
> 本プロジェクトは学習・研究用であり、MCP仕様のすべてを実装しているわけではありません。


You can read the full MCP specification [here](https://modelcontextprotocol.io/specification/2025-11-25/basic).


## Features

- **HTTP Transport** — Serves MCP over a standard HTTP `POST` endpoint (`/mcp`), compatible with any MCP client that supports the HTTP transport.
- **JSON-RPC 2.0** — Fully compliant request/response framing with proper error codes (`-32700`, `-32600`, `-32601`, `-32602`, `-32603`).
- **Tool Registry** — Pluggable tool system for easy registration and execution of tools.

## Project Structure

```
bun-mcp-server/
├── src/
│   ├── index.js          # Entry point — starts the Bun HTTP server on port 3000
│   ├── lib/
│   │   └── utils.js      # Shared utilities (timestamps, CORS headers, logging, IP parsing)
│   ├── mcp/
│   │   ├── index.js      # Core MCP request handler (JSON-RPC dispatch)
│   │   └── tools.js      # Tool definitions and registration
│   └── routes/
│       └── index.js      # HTTP route definitions (/mcp, /.well-known/mcp, catch-all)
├── package.json
├── jsconfig.json
└── BRIEF.md              # Project brief / requirements
```

## Prerequisites

- [Bun](https://bun.sh) v1.3+ installed

## Getting Started

### Install dependencies

```bash
bun install
```

### Start the server

```bash
bun run dev
```

The server starts on **http://localhost:3000** with file-watching enabled for live reload during development.

## API Endpoints

### `POST /mcp`

The main MCP endpoint. Accepts JSON-RPC 2.0 requests and dispatches them to the appropriate handler.

**Supported methods:**

| Method | Description |
| --- | --- |
| `initialize` | Handshake — returns server info, protocol version, and capabilities |
| `tools/list` | Returns the list of available tools with their schemas |
| `tools/call` | Executes a registered tool by name with the given arguments |
| `notifications/initialized` | Acknowledges client initialization (returns `202`) |
| `notifications/roots/list_changed` | Acknowledges root change notifications (returns `202`) |

### `GET /.well-known/mcp`

This endpoint serves as the **MCP Server Card**. It provides essential metadata about the server—such as its name, description, supported transport types, and the base URL for the MCP endpoint—allowing clients to identify and connect to the service automatically.

While this mechanism is not currently part of the official Model Context Protocol (MCP) specification, it addresses a critical gap: enabling HTTP-based MCP servers to be discoverable via standard web patterns and simplifying the process for users to add them to their environments.

The return value will be mapped to the client's MCP server config file:
```json
{
  "servers": {
    "weather-server": {
      "type": "http",
      "url": "http://localhost/mcp"
    }
  }
}
```

### `* /*`

Catch-all route that returns a `404 Not Found` JSON response for any unmatched path.

## Usage Examples

### Initialize the server

```bash
curl -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "initialize",
    "params": {
      "protocolVersion": "2024-11-05",
      "capabilities": {},
      "clientInfo": { "name": "test-client", "version": "1.0.0" }
    }
  }'
```

### List available tools

```bash
curl -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 2,
    "method": "tools/list"
  }'
```

### Call a tool

```bash
curl -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 3,
    "method": "tools/call",
    "params": {
      "name": "get_weather",
      "arguments": { "city": "Tokyo" }
    }
  }'
```

### Discover the server

```bash
curl http://localhost:3000/.well-known/mcp
```

## Live Testing

You can verify that the server is functioning correctly by connecting it to an MCP client, such as VS Code or AntiGravity.

## VSCode
Follow these steps to configure and connect:

1. Create or open `.vscode/mcp.json` in your project directory.
2. Add the following entry:
```json
{
  "servers": {
    "weather-server": {
      "url": "http://localhost:3000/mcp",
      "headers": {
        "Content-Type": "application/json"
      }
    }
  }
}

```
3. In the VS Code Chat panel, click the **gear icon** to open the **Agent Customizations** dialog.
4. Select **MCP Servers** from the sidebar. You should see `weather-server` listed under **Workspace**.
5. Right-click `weather-server` and select **Start Server** from the context menu to initialize the connection.

### AntiGravity
Follow these steps to configure and connect:

1. **Open Configuration:** Navigate to **Additional Options** (`...`) and select **MCP Servers**.
2. **Manage Servers:** Click **Manage MCP Servers**, then select **View raw config** to open the `mcp_config.json` file.
3. **Add Server:** Add the following configuration:
```json
{
  "mcpServers": {
    "weather-server": {
      "serverUrl": "http://localhost:3000/mcp",
      "headers": {
        "Content-Type": "application/json"
      }
    }
  }
}

```
4. **Connect:** Save the file, return to the **Manage MCP Servers** menu, and click **Refresh**.

---
> [!Note] 
> Ensure your MCP server is already running locally before connecting to either one. Upon success, you will see connection activity in your server’s console logs.


Once connected, confirm that tool discovery and execution are working by sending a prompt through your IDE's chat interface:

> *"Let's test the MCP server. Get the weather for Tokyo today."*

If successful, the chat should trigger the tool and return the relevant data from your server.


## Available Tools

| Tool | Description | Parameters |
| --- | --- | --- |
| `get_weather` | Get the current weather for a given city | `city` (string, required) |

> The `get_weather` tool returns simulated data (random temperature, "Cloudy" condition) — it is included as a demo tool for testing the MCP lifecycle.

## Adding New Tools

Register new tools in [`src/mcp/tools.js`](src/mcp/tools.js) using the tool registry:

```js
toolRegistry.register(
  "my_tool",
  {
    name: "my_tool",
    title: "My Tool",
    description: "Does something useful.",
    parameters: {
      type: "object",
      properties: {
        input: { type: "string", description: "Some input value" }
      },
      required: ["input"]
    }
  },
  async ({ input }) => {
    // Your tool logic here
    return { result: `Processed: ${input}` }
  }
)
```

The tool is automatically available via `tools/list` and executable via `tools/call` — no additional wiring needed.

## Error Handling

The server returns standard JSON-RPC 2.0 error responses:

| Code | Meaning |
| --- | --- |
| `-32700` | Parse error — malformed JSON body |
| `-32600` | Invalid Request — missing `jsonrpc` or `method` |
| `-32601` | Method not found — unsupported MCP method |
| `-32602` | Invalid params — missing or malformed tool parameters |
| `-32603` | Internal error — unexpected server-side failure |

## License

MIT © supershaneski
