# bun-mcp-server

A white-label HTTP-based [Model Context Protocol](https://modelcontextprotocol.io/) (MCP) server built with [Bun](https://bun.sh).

## Motivation

This project began as a personal learning exercise to better understand how MCP servers work by building one from the ground up. As such, it currently implements a meaningful subset of the MCP specification, with compliance support being added over time as the project evolves.

You can read the full MCP specification [here](https://modelcontextprotocol.io/specification/2025-11-25/basic).

## Features

- **White-label Config** — Server identity (name, title, description, version, categories) is controlled entirely from a single `mcp.config.js` file.
- **Auto Tool Discovery** — Tools placed in the `tools/` directory are loaded and registered automatically at startup — no manual wiring required.
- **HTTP Transport** — Serves MCP over a standard HTTP endpoint (`/mcp`), supporting `POST`, `GET`, `DELETE`, and `OPTIONS`.
- **JSON-RPC 2.0** — Fully compliant request/response framing with proper error codes (`-32700`, `-32600`, `-32601`, `-32602`, `-32603`).
- **Session Management** — Issues an `mcp-session-id` on `initialize`, tracks sessions in memory, and automatically expires them after 5 minutes of inactivity.
- **Protocol Version Enforcement** — Validates the `mcp-protocol-version` header on every non-initialization request.
- **Origin-aware CORS** — Reflects the request `Origin` header and exposes `mcp-session-id` and `mcp-protocol-version` to browser clients.

## Quick Start

### Install dependencies

```bash
bun install
```

### Start the server

```bash
bun run dev
```

The server starts on **http://localhost:3000** with file-watching enabled for live reload during development.

## White-labeling

Clone the repo, edit the config, add your tools. Follow the steps below to get started. 

### Step 1 — Configure your identity

Open `mcp.config.js` and update the following values:

```js
export const config = {
  name: "my-mcp-server",         // Machine-readable identifier (used in client configs)
  title: "My MCP Server",        // Human-readable display name
  description: "Does something useful.",
  version: "1.0.0",
  protocolVersion: "2025-11-25", // MCP spec version this server targets
  categories: ["demo"],          // Descriptive tags for discoverability
}
```

These values flow into two places automatically:
- The **`initialize` response** — returned to any MCP client during the handshake
- The **Server Card** at `GET /.well-known/mcp` — used for server discovery

### Step 2 — Add your tools

Drop `.js` files into the `tools/` directory. The server loads them automatically at startup — no registration needed. See [Tools](#tools) for the file format.

### Step 3 — Announce your server

Once running, your server self-describes via the `/.well-known/mcp` endpoint — the **MCP Server Card**. This gives clients a machine-readable way to discover your server's identity, transport type, and endpoint URL without any manual configuration.

```bash
curl http://localhost:3000/.well-known/mcp
```

```json
{
  "name": "my-mcp-server",
  "title": "My MCP Server",
  "description": "Does something useful.",
  "version": "1.0.0",
  "url": "http://localhost:3000/mcp",
  "transport": "http",
  "categories": ["demo"]
}
```

> [!Note]
> The `/.well-known/mcp` Server Card is not yet part of the official MCP specification, but it fills a gap: there is currently no standardized way for HTTP-based MCP servers to announce themselves. This endpoint follows the established `/.well-known/` convention for service discovery on the web.

## Tools

### Available Tools

| Tool | Description | Parameters |
| --- | --- | --- |
| `get_weather` | Get the current weather for a given city | `city` (string, required) |

> The `get_weather` tool returns simulated data (random temperature, "Cloudy" condition) — it is included as a demo tool for testing the MCP lifecycle.

### Adding New Tools

Drop a new `.js` file into the `tools/` directory. The server picks it up automatically at startup.

Each tool file must export two things:

**`metadata`** — the tool's schema (name, description, input shape):
```js
export const metadata = {
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
}
```

**`handler`** — an async function that receives the tool's arguments:
```js
export async function handler({ input }) {
  // Your tool logic here
  return { result: `Processed: ${input}` }
}
```

The tool is automatically available via `tools/list` and executable via `tools/call` — no additional wiring needed.

See [`tools/get_weather.js`](tools/get_weather.js) for a working example.

## Project Structure

```
bun-mcp-server/
├── src/
│   ├── index.js          # Entry point — starts the Bun HTTP server and runs session cleanup
│   ├── lib/
│   │   ├── sessions.js   # In-memory session store (Map)
│   │   └── utils.js      # Shared utilities (timestamps, CORS headers, logging, IP parsing)
│   ├── mcp/
│   │   ├── index.js      # Core MCP request handler (JSON-RPC dispatch)
│   │   └── tools.js      # Auto-loads tools from the tools/ directory
│   └── routes/
│       └── index.js      # HTTP route definitions (/mcp, /.well-known/mcp, catch-all)
├── tools/                # Drop tool files here — they are picked up automatically
│   └── get_weather.js    # Example tool (simulated weather data)
├── mcp.config.js         # Server identity and capabilities config
├── package.json
└── jsconfig.json
```

## Prerequisites

- [Bun](https://bun.sh) v1.3+ installed

## API Reference

### `POST /mcp`

The main MCP endpoint. Accepts JSON-RPC 2.0 requests and dispatches them to the appropriate handler.

For all methods except `initialize` and notifications, the request must include:
- `mcp-session-id` header — a valid session ID issued during `initialize`
- `mcp-protocol-version` header — must match the server's configured protocol version

**Supported methods:**

| Method | Description |
| --- | --- |
| `initialize` | Handshake — returns server info, protocol version, and capabilities. Issues `mcp-session-id` in the response header. |
| `ping` | No-op keep-alive — returns an empty result `{}` |
| `tools/list` | Returns the list of available tools with their schemas |
| `tools/call` | Executes a registered tool by name with the given arguments |
| `notifications/initialized` | Acknowledges client initialization (returns `202`) |
| `notifications/roots/list_changed` | Acknowledges root change notifications (returns `202`) |

### `GET /mcp`

Session probe. Requires a valid `mcp-session-id` header. Returns `200` if the session exists, `404` if not. Returns `406` if the client requests `text/event-stream` (SSE is not currently supported).

### `DELETE /mcp`

Session termination. Requires a valid `mcp-session-id` header. Removes the session and returns `204`.

### `OPTIONS /mcp`

CORS preflight. Returns `204` with appropriate `Access-Control-*` headers.

### `GET /.well-known/mcp`

See [Step 3 — Announce your server](#step-3--announce-your-server) above.

### `* /*`

Catch-all route that returns a `404 Not Found` JSON response for any unmatched path.

## Usage Examples

### Initialize the server

On success, the server returns an `mcp-session-id` header. Save it — all subsequent requests must include it.

```bash
curl -D - -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "initialize",
    "params": {
      "protocolVersion": "2025-11-25",
      "capabilities": {},
      "clientInfo": { "name": "test-client", "version": "1.0.0" }
    }
  }'
```

### List available tools

```bash
curl -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -H "mcp-session-id: <your-session-id>" \
  -H "mcp-protocol-version: 2025-11-25" \
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
  -H "mcp-session-id: <your-session-id>" \
  -H "mcp-protocol-version: 2025-11-25" \
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

### Terminate a session

```bash
curl -X DELETE http://localhost:3000/mcp \
  -H "mcp-session-id: <your-session-id>"
```

## Connecting a Client

You can verify that the server is functioning correctly by connecting it to an MCP client, such as VS Code or AntiGravity.

> [!Note]
> Ensure your MCP server is already running locally before connecting. Upon success, you will see connection activity in your server's console logs.

### VS Code

1. Create or open `.vscode/mcp.json` in your project directory.
2. Add the following entry:
```json
{
  "servers": {
    "my-mcp-server": {
      "url": "http://localhost:3000/mcp"
    }
  }
}
```
3. In the VS Code Chat panel, click the **gear icon** to open the **Agent Customizations** dialog.
4. Select **MCP Servers** from the sidebar. You should see `my-mcp-server` listed under **Workspace**.
5. Right-click `my-mcp-server` and select **Start Server** from the context menu to initialize the connection.

### AntiGravity

1. **Open Configuration:** Navigate to **Additional Options** (`...`) and select **MCP Servers**.
2. **Manage Servers:** Click **Manage MCP Servers**, then select **View raw config** to open the `mcp_config.json` file.
3. **Add Server:** Add the following configuration:
```json
{
  "mcpServers": {
    "my-mcp-server": {
      "serverUrl": "http://localhost:3000/mcp"
    }
  }
}
```
4. **Connect:** Save the file, return to the **Manage MCP Servers** menu, and click **Refresh**.

Once connected, confirm that tool discovery and execution are working by sending a prompt through your IDE's chat interface:

> *"Let's test the MCP server. Get the weather for Tokyo today."*

If successful, the chat should trigger the tool and return the relevant data from your server.

## Error Handling

The server returns standard JSON-RPC 2.0 error responses:

| Code | Meaning |
| --- | --- |
| `-32700` | Parse error — malformed JSON body |
| `-32600` | Invalid Request — missing `jsonrpc` or `method`, or bad protocol version |
| `-32601` | Method not found — unsupported MCP method |
| `-32602` | Invalid params — missing or malformed tool parameters |
| `-32603` | Internal error — unexpected server-side failure |

## Musings & Future Direction

### 2026-07-01 — Streamable HTTP

The MCP specification defines Streamable HTTP as one of the supported transport mechanisms for MCP servers. It replaces the HTTP+SSE transport used in earlier versions of the protocol.

I haven't implemented Streamable HTTP in this project yet, as I'm still learning how it works. Support for it will be added in the future, hopefully.

### 2026-06-30 - MCP Server Card

The idea is to introduce an MCP Server Card, similar to the Web App Manifest for web applications. A Server Card would provide standardized metadata that serves as the foundation for searchable directories of MCP servers, making it easy for users to discover and add servers to their MCP clients or IDEs. That’s the dream, at least.

## License

MIT © supershaneski
