import * as d3 from "d3";

import update from "#worker/tasks/update.js";

import getRendererClass from "#src/renderers/renderer.js"
import { packageHierarchy } from "#src/data.js"

import { ProtocolEvents } from "#worker/protocol.js";

export default async function initialize({
    canvas, dpr, config, dynamic
}) {
    self.postMessage({
        type: ProtocolEvents.PROGRESS
    });

    const response = await fetch(config.data_url);

    if (!response.ok)
        throw new Error(`Failed to load ${data_url}: ${response.status}`);

    const json = await response.json();
    const data = json.data;

    const root = packageHierarchy(data)
        .sum(function(d) { return d.size; })
        .sort(function(a, b) { 
            const nameA = a.data.file || a.data.key || "";
            const nameB = b.data.file || b.data.key || "";
            return d3.ascending(nameA, nameB); 
        });

    let nextNodeId = 0;
    const nodeMap = new Map();

    root.descendants().forEach(node => {
        node.__id = nextNodeId++;
        nodeMap.set(node.__id, node);
    });

    const Renderer = getRendererClass(config.context_type);

    const renderer = new Renderer(canvas, [ config.width, config.height ], dpr)
        .setSegments(config.segments)
        .setLineWidth(config.line_width)
        .setColors([ config.start_color, config.end_color ])
        .setScale(config.scale)
        .setMinSize(dynamic.min_size)
        .setRadius(config.inner_radius);

    renderer.init();

    const collector = Renderer.collector(renderer, renderer.ratio);

    const { links, line, bufferSize, maxPathLength, folders } = await update({ renderer, collector, tree: root, config, dynamic });

    const maxBufferSize = Math.min(bufferSize, renderer.maxVertices) + (maxPathLength * 8);
    renderer.createBuffers(maxBufferSize);

    return { root, renderer, links, collector, line, folders, nodeMap, root };
}
