import ToolRegistry from "@supershaneski/tool-registry";
import { readdirSync, existsSync } from "node:fs";
import { join } from "node:path";

const toolRegistry = new ToolRegistry()

const toolsDir = join(import.meta.dir, "..", "..", "tools")

if (existsSync(toolsDir)) {
  const files = readdirSync(toolsDir).filter(file => file.endsWith(".js"));
  
  for (const file of files) {
    const filePath = join(toolsDir, file);
    try {
      const module = await import(filePath);
      if (module.metadata && module.handler) {
        toolRegistry.register(module.metadata.name, module.metadata, module.handler);
        console.log(`[Tools] Registered tool: ${module.metadata.name} (from ${file})`);
      } else {
        console.warn(`[Tools] Skipped ${file}: Missing 'metadata' or 'handler' exports.`);
      }
    } catch (err) {
      console.error(`[Tools] Failed to load tool from ${file}:`, err.message);
    }
  }
} else {
  console.warn(`[Tools] Tools directory not found at: ${toolsDir}`);
}

export default toolRegistry