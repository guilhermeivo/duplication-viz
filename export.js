import { createCanvas } from "canvas";
import fs from "node:fs";
import { readFile } from "node:fs/promises";

import { status, StatusType } from "#src/ui/status.js"

import initialize from "#src/worker/tasks/initialize.js";
import render from "#src/worker/tasks/render.js";

import { store, storeDynamic } from "#src/store.js"

import * as d3 from "d3";
globalThis.d3 = d3;

const json = await readFile(
    "./examples/linus-linux/root.json",
    "utf8"
);

const url = `data:application/json,${encodeURIComponent(json)}`;

store.set({
    data_url: url,

    // app
    scale: 4,
    show_folders: false,
    method: "radial",
    square_radius: 16,

    start_color: { r: 0.03, g: 0.18, b: 0.87, alpha: 0.01 },
    end_color: { r: 0.03, g: 0.18, b: 0.42, alpha: 0.50 },
    width: 1920,
    height: 1920,

    dpr: 1,
    
    line_width: 0.05, // px
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
    const message = {
        canvas: canvas,
        dpr: store.get("dpr"),

        config: store.get(),
        dynamic: storeDynamic.get(),
    }

    const { renderer, links, collector, line } = await initialize(message);
    await render({ renderer, links, collector, line, ...message });
} catch (error) {
    status.set(error, { type: StatusType.ERROR });
}

fs.writeFileSync("visualization.png", canvas.toBuffer("image/png"));
