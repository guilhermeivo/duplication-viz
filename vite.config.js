import { defineConfig } from "vite";
import { fileURLToPath, URL } from "node:url";

export default defineConfig({
    resolve: {
        alias: {
            "@src": fileURLToPath(
                new URL("./src", import.meta.url)
            ),
            "@worker": fileURLToPath(
                new URL("./src/worker", import.meta.url)
            )
        }
    }
});
