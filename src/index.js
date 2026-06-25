import { now } from "./lib/utils"
import routes from "./routes"

const server = Bun.serve({
    port: 3000,
    routes,
})

console.log(`\n[${now()}] HTTP MCP Server started and listening on http://localhost:${server.port}`)

process.on("SIGINT", async () => {
    console.log(`\n[${now()}] Shutting down server...`)
    process.exit(0)
})

process.on("exit", (code) => {
    console.log(`[${now()}] Server exited with code ${code}`)
})