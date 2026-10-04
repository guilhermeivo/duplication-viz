import { createCanvas } from "canvas";
import fs from "node:fs";

import { status, StatusType } from "./src/status.js"
import { renderVisualization } from "./src/app.js"

import * as d3 from "d3";
globalThis.d3 = d3;

const config = {
    SCALE: 4,

    JSON_FILE: "examples/linus-linux/root.json",
    SHOW_FOLDERS: true,
    METHOD: "RADIAL",
    DEPTH: -1,
    START_COLOR: { r: 0.03, g: 0.18, b: 0.87, alpha: 0.15 },
    END_COLOR: { r: 0.03, g: 0.18, b: 0.42, alpha: 0.85 },
    WIDTH: 1920,
    HEIGHT: 1920,
    PADDING: 120,
    LINE_WIDTH: 0.02,
    SEGMENTS: 16,

    CONTEXT_TYPE: "2d" // Canvas 2D
}

const diameter = Math.min(config.WIDTH, config.HEIGHT);

config.INNER_RADIUS = (diameter / 2) - config.PADDING;

const canvas = createCanvas(
    config.WIDTH * config.SCALE,
    config.HEIGHT * config.SCALE
);

status.init();

try {
    const json = JSON.parse(fs.readFileSync(config.JSON_FILE, "utf8"));
    const data = json.data;

    renderVisualization(canvas, config, data);
} catch (error) {
    status.set(error, { type: StatusType.ERROR });
}

fs.writeFileSync("visualization.png", canvas.toBuffer("image/png"));
