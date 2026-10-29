/* Creates .env from .env.example the first time `npm run setup` runs. */
import { copyFileSync, existsSync } from "node:fs";
if (!existsSync(".env") && existsSync(".env.example")) { copyFileSync(".env.example", ".env"); console.log("[setup] Created .env from .env.example"); }
