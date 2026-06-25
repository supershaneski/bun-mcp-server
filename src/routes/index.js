import { now, corsHeaders, logDebug } from "../lib/utils"
import { mcpRequestHandler } from "../mcp"

export default {
    "/mcp": async (req) => {
        const pathname = new URL(req.url).pathname
        console.log(`[${now()}] ${req.method} ${pathname}`)

        // Handle preflight
        if (req.method === 'OPTIONS') {
            return new Response(null, {
                status: 204,
                headers: corsHeaders,
            })
        }

        // Enforce POST requests
        if (req.method !== 'POST') {
            return Response.json({
                message: "Method not allowed"
            }, {
                status: 405,
                headers: corsHeaders
            })
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
                headers: corsHeaders
            })
        }

        const id = body.id !== undefined ? body.id : null;

        const result = await mcpRequestHandler(body)

        if (result.status === 'accepted') {
            return new Response(null, {
                status: 202,
                headers: corsHeaders
            })
        } else if (result.status === 'error') {
            return Response.json({
                jsonrpc: "2.0",
                id,
                error: { code: result.code, message: result.message }
            }, {
                status: 200,
                headers: corsHeaders
            });
        } else {
            return Response.json({
                jsonrpc: "2.0",
                id,
                result: result.data,
            }, {
                status: 200,
                headers: corsHeaders,
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