import * as fs from "node:fs"
import * as path from "node:path"

export const now = () => new Date().toLocaleString("ja-JP", { timeZone: "Asia/Tokyo" })

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  //"Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  //"Access-Control-Allow-Headers": "Content-Type, Accept",
}

export const corsHeaders2 = {
  "Access-Control-Allow-Credentials": "true",
  "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Accept, mcp-session-id, mcp-protocol-version",
  "Access-Control-Expose-Headers": "mcp-session-id",
}

export function getCorsHeaders(req) {
  const origin = req.headers.get("origin")
  const headers = { ...corsHeaders2 }
  if (origin) {
    headers["Access-Control-Allow-Origin"] = origin
  } else {
    headers["Access-Control-Allow-Origin"] = "*"
    delete headers["Access-Control-Allow-Credentials"]
  }
  return headers;
}

export function logDebug(message) {
  const logPath = path.join(import.meta.dir, "..", "..", "debug.log")
  fs.appendFileSync(logPath, message + "\n")
}

export function getClientIp(arg) {
  const addr = arg?.address || ""

  // IPv6 localhost
  if (addr === "::1") return "localhost"

  // IPv4-mapped IPv6: ::ffff:x.x.x.x
  if (addr.startsWith("::ffff:")) {
    return addr.replace("::ffff:", "")
  }

  // Raw IPv4 or other IPv6
  return addr
}
