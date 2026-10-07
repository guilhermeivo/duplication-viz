import { createCanvas } from "canvas";
import fs from "node:fs";

import { status, StatusType } from "#src/ui/status.js"
import { renderVisualization } from "#src/app.js"

import { store } from "#src/store.js"

import * as d3 from "d3";
globalThis.d3 = d3;

store.set({
    json: "examples/linus-linux/root.json",

    // app
    scale: 4,
    show_folders: false,
    method: "radial",
    square_radius: 16,
    start_color: { r: 0.03, g: 0.18, b: 0.87, alpha: 0.15 },
    end_color: { r: 0.03, g: 0.18, b: 0.42, alpha: 0.85 },
    width: 1920,
    height: 1920,
    
    line_width: 0.2, // px
    segments: 16,
    
    padding: 120,
    depth: -1,
    arc_width: 1.0,

    context_type: "2d" // Canvas 2D
})

const diameter = Math.min(store.get("width"), store.get("height"));
store.set({ "inner_radius": (diameter / 2) - store.get("padding") })

const canvas = createCanvas(
    store.get("width") * store.get("scale"),
    store.get("height") * store.get("scale")
);

status.init();

try {
    const json = JSON.parse(fs.readFileSync(store.get("json"), "utf8"));
    const data = json.data;

    renderVisualization(canvas, data);
} catch (error) {
    status.set(error, { type: StatusType.ERROR });
}

fs.writeFileSync("visualization.png", canvas.toBuffer("image/png"));
