import { now, corsHeaders, corsHeaders2, logDebug } from "../lib/utils"
import { mcpRequestHandler } from "../mcp"
import sessions from "../lib/sessions"

export default {
    "/mcp": async (req) => {
        const pathname = new URL(req.url).pathname
        console.log(`[${now()}] ${req.method} ${pathname}`)

        const origin = req.headers.get('origin')

        // TODO: Provide SSE response if client supports it
        // let accept = req.headers.get('accept') ?? ''
        // const isSSE = accept.split(',').includes('text/event-stream') // Check SSE
        
        let sessionId = req.headers.get('mcp-session-id')

        // Handle preflight
        if (req.method === 'OPTIONS') {
            return new Response(null, {
                status: 204,
                headers: {
                    ...corsHeaders2,
                    "Access-Control-Allow-Origin": origin ?? "*"
                },
            })
        }

        // TODO: Allow GET
        if (req.method === 'GET') {
            return Response.json({
                message: "Method not allowed"
            }, {
                status: 405,
                headers: {
                    ...corsHeaders2,
                    "Access-Control-Allow-Origin": origin ?? "*"
                }
            })
        }

        if (req.method === 'DELETE') {
            if (!sessionId) {
                return Response.json({ 
                    message: "Missing session Id" 
                }, { 
                    status: 400,
                    headers: {
                        ...corsHeaders2,
                        "Access-Control-Allow-Origin": origin ?? "*"
                    }
                });
            }

            const session = sessions.get(sessionId)
            if (!session) {
                return Response.json({ 
                    message: "Session not found" 
                }, { 
                    status: 404,
                    headers: {
                        ...corsHeaders2,
                        "Access-Control-Allow-Origin": origin ?? "*"
                    }
                });
            }

            // Delete session
            sessions.delete(sessionId)
            return new Response(null, {
                status: 204,
                headers: {
                    ...corsHeaders2,
                    "Access-Control-Allow-Origin": origin ?? "*"
                }
            })

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
                    status: 405,
                    headers: {
                        ...corsHeaders2,
                        "Access-Control-Allow-Origin": origin ?? "*"
                    }
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
                headers: {
                    ...corsHeaders2,
                    "Access-Control-Allow-Origin": origin ?? "*"
                }
            })
        }

        const id = body.id !== undefined ? body.id : null;

        const result = await mcpRequestHandler(body)

        if (result.status === 'accepted') {
            return new Response(null, {
                status: 202,
                headers: corsHeaders2
            })
        } else if (result.status === 'error') {
            return Response.json({
                jsonrpc: "2.0",
                id,
                error: { code: result.code, message: result.message }
            }, {
                status: 200,
                headers: {
                    ...corsHeaders2,
                    "Access-Control-Allow-Origin": origin ?? "*"
                }
            });
        } else {
            return Response.json({
                jsonrpc: "2.0",
                id,
                result: result.data,
            }, {
                status: 200,
                headers: {
                    ...corsHeaders2,
                    "Access-Control-Allow-Origin": origin ?? "*",
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
            "title": "weather-server",
            "name": "Weather MCP",
            "description": "Provides weather information",
            "version": "1.0.0",
            "url": "http://localhost:3000/mcp",
            "authentication": {}, // If no-auth, either omit or empty object is valid
            "transport": "http",
            "categories": [
                "weather"
            ],
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