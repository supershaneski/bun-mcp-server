import { now, corsHeaders, getCorsHeaders, logDebug } from "../lib/utils"
import { mcpRequestHandler } from "../mcp"
import sessions from "../lib/sessions"
import { config } from "../../mcp.config.js"

export default {
    "/mcp": async (req) => {
        const pathname = new URL(req.url).pathname
        console.log(`[${now()}] ${req.method} ${pathname}`)

        const acceptedMediaTypes = (req.headers.get('accept') ?? '')
            .split(',')
            .map(type => type.split(";")[0].trim())

        let sessionId = req.headers.get('mcp-session-id')
        const protocolVersion = req.headers.get('mcp-protocol-version') ?? null
        const headers = getCorsHeaders(req)

        // Handle preflight
        if (req.method === 'OPTIONS') {
            return new Response(null, {
                status: 204,
                headers,
            })
        }

        if (req.method === 'GET' || req.method === 'DELETE') {

            if (!sessionId) {
                return Response.json({
                    message: "Missing session Id"
                }, {
                    status: 400,
                    headers
                });
            }

            const session = sessions.get(sessionId)
            if (!session) {
                return Response.json({
                    message: "Session not found"
                }, {
                    status: 404,
                    headers
                });
            }

            if (req.method === 'DELETE') {
                // Delete session
                sessions.delete(sessionId)
                return new Response(null, {
                    status: 204,
                    headers
                })
            } else {
                
                if (acceptedMediaTypes.includes('text/event-stream')) {
                    // Not handling streaming HTTP request for GET
                    return Response.json({
                        message: "Does not support text/event-stream"
                    }, {
                        status: 406,
                        headers
                    })
                } else {
                    return new Response(null, {
                        status: 200,
                        headers
                    })
                }
            }

        }

        if (!sessionId) {
            sessionId = crypto.randomUUID()
            sessions.set(sessionId, { id: sessionId, lastActivity: Date.now() })
        } else {
            const session = sessions.get(sessionId)
            if (!session) {
                return Response.json({
                    message: "Session not found"
                }, {
                    status: 404,
                    headers
                })
            }

            session.lastActivity = Date.now()
        }

        let body
        try {
            body = await req.json()
        } catch (err) {
            console.error(`Parse error: ${err.message}`)
            return Response.json({
                jsonrpc: "2.0",
                id: null,
                error: { code: -32700, message: "Parse error" }
            }, {
                status: 200,
                headers
            })
        }

        const id = body.id !== undefined ? body.id : null;

        // Protocol version validation
        const isInitialize = body.method === "initialize"
        const isNotification = body.method && body.method.startsWith("notifications/")

        if (!isInitialize && !isNotification) {
            if (!protocolVersion) {
                return Response.json({
                    jsonrpc: "2.0",
                    id,
                    error: { code: -32600, message: "Missing mcp-protocol-version header" }
                }, {
                    status: 400,
                    headers
                })
            }
            if (protocolVersion !== config.protocolVersion) {
                return Response.json({
                    jsonrpc: "2.0",
                    id,
                    error: { code: -32600, message: `Unsupported protocol version: ${protocolVersion}` }
                }, {
                    status: 400,
                    headers
                })
            }
        }

        const result = await mcpRequestHandler(body)

        if (result.status === 'accepted') {
            return new Response(null, {
                status: 202,
                headers
            })
        } else if (result.status === 'error') {
            return Response.json({
                jsonrpc: "2.0",
                id,
                error: { code: result.code, message: result.message }
            }, {
                status: 200,
                headers
            });
        } else {
            return Response.json({
                jsonrpc: "2.0",
                id,
                result: result.data,
            }, {
                status: 200,
                headers: {
                    ...headers,
                    ...(sessionId ? { "mcp-session-id": sessionId } : {})
                },
            });
        }
    },
    "/.well-known/mcp": (req) => {
        const pathname = new URL(req.url).pathname
        console.log(`[${now()}] ${req.method} ${pathname}`)

        // Handle preflight
        if (req.method === 'OPTIONS') {
            return new Response(null, {
                status: 204,
                headers: corsHeaders,
            })
        }

        // Enforce GET requests
        if (req.method !== 'GET') {
            return Response.json({
                message: "Method not allowed"
            }, {
                status: 405,
                headers: corsHeaders
            });
        }

        // MCP Server Card
        const info = {
            title: config.title,
            name: config.name,
            description: config.description,
            version: config.version,
            url: new URL("/mcp", req.url).toString(),
            authentication: {}, // If no-auth, either omit or empty object is valid
            transport: "http",
            categories: config.categories,
        }

        return Response.json(info, {
            status: 200,
            headers: corsHeaders
        })
    },
    "/*": (req) => {
        const pathname = new URL(req.url).pathname
        const message = `[${now()}] ${req.method} ${pathname} Not found`
        console.log(message)
        //logDebug(`[${now()}] ${req.method} ${pathname} Not found`)
        return Response.json({ message: "Not found" }, { status: 404 })
    }
}