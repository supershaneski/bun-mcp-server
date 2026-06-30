import toolRegistry from "./tools"
import { config } from "../config"
//import sessions from "../lib/sessions"

export async function mcpRequestHandler(body) {
    try {
        if (!body || body.jsonrpc !== "2.0") {
            return {
                status: 'error',
                code: -32600,
                message: "Invalid Request: jsonrpc version must be 2.0"
            }
        }

        const method = body.method
        if (!method) {
            return {
                status: 'error',
                code: -32600,
                message: "Invalid Request: method is required"
            }
        }

        console.log(method, body)

        let result = {}

        switch (method) {
            case "initialize":
                //const id = crypto.randomUUID()
                //sessions.set(id, { id, lastActivity: Date.now() })
                result = {
                    status: 'response',
                    //sessionId: id,
                    data: {
                        protocolVersion: config.protocolVersion,
                        capabilities: {
                            tools: {}
                        },
                        serverInfo: {
                            name: config.name,
                            version: config.version
                        }
                    }
                }
                break
            case "tools/list":
                const availableTools = toolRegistry.getTools()
                    .map((tool) => ({
                        name: tool.name,
                        title: tool.title ?? tool.name,
                        description: tool.description,
                        inputSchema: tool.parameters
                    }))

                result = {
                    data: { tools: availableTools }
                }
                break
            case "tools/call":
                if (!body.params || typeof body.params !== 'object') {
                    return {
                        status: 'error',
                        code: -32602,
                        message: "Invalid params: 'params' object is required"
                    }
                }
                const name = body.params.name
                if (!name || typeof name !== 'string') {
                    return {
                        status: 'error',
                        code: -32602,
                        message: "Invalid params: 'name' is required and must be a string"
                    }
                }
                const args = body.params.arguments || {}

                // Verify tool existence
                const tools = toolRegistry.getTools()
                if (!tools.some(t => t.name === name)) {
                    return {
                        status: 'error',
                        code: -32602,
                        message: `Tool not found: ${name}`
                    }
                }

                let response
                let isError = false
                let textContent = ""
                try {
                    response = await toolRegistry.execute(name, args)
                    if (response && response.status === 'error') {
                        isError = true
                        textContent = response.message || "Tool error"
                    } else {
                        textContent = JSON.stringify(response)
                    }
                } catch (toolErr) {
                    isError = true
                    textContent = `Tool execution failed: ${toolErr.message}`
                }

                result = {
                    data: {
                        content: [
                            {
                                type: "text",
                                text: textContent
                            }
                        ],
                        isError
                    }
                }
                break
            case "notifications/initialized":
                result = {
                    status: 'accepted'
                }
                break
            case "notifications/roots/list_changed":
                result = {
                    status: 'accepted'
                }
                break
            default:
                result = {
                    status: 'error',
                    code: -32601,
                    message: "Method not found"
                }
        }

        return result

    } catch(err) {
        return {
            status: 'error',
            code: -32603, // Internal error
            message: err.message
        }
    }
}