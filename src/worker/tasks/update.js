import * as d3 from "d3";

import { packageImports } from "#src/data.js"

const DEG = Math.PI / 180;

export const formatMethods = {
    RADIAL: (context, config) => {
        const beta = config.radial_beta;
        return d3.lineRadial()
            .curve(d3.curveBundle.beta(beta))
            .radius(d => d.y)
            .angle(d => d.x / 180 * Math.PI)
            .context(context)
    },
    SQUARE: (context, config) => {
        const squareRadius = config.square_radius;
        function roundedSquareRadius(angle, size, radius) {
            const cos = Math.cos(angle);
            const sin = Math.sin(angle);

            const ax = Math.abs(cos);
            const ay = Math.abs(sin);

            radius = Math.max(0, Math.min(radius, size));

            if (radius === 0) {
                return size / Math.max(ax, ay);
            }

            const corner = size - radius;

            if (ax >= ay) {
                const t = size / ax;

                if (t * ay <= corner) {
                    return t;
                }
            } else {
                const t = size / ay;

                if (t * ax <= corner) {
                    return t;
                }
            }

            const a = corner;

            // (t*cos-a)^2 + (t*sin-a)^2 = radius^2

            const b = -2 * a * (ax + ay);

            const c =
                2 * a * a -
                radius * radius;

            const discriminant =
                b * b - 4 * c;

            return (-b + Math.sqrt(discriminant)) / 2;
        }

        function polarToRoundedSquare(x, y) {
            const angle = x / 180 * Math.PI;

            const cos = Math.cos(angle);
            const sin = Math.sin(angle);

            const halfSquare = config.inner_radius;

            const boundary = roundedSquareRadius(
                angle,
                halfSquare,
                squareRadius
            );

            const scale = boundary / halfSquare;

            return {
                x: y * cos * scale,
                y: y * sin * scale
            };
        }


        return d3.line()
            .curve(d3.curveBundle.beta(0.85))
            .x(d => polarToRoundedSquare(d.x, d.y).x)
            .y(d => polarToRoundedSquare(d.x, d.y).y)
            .context(context);
    }
}

export function collectFolders(tree, config) {
    const folders = [];
    let depth = 0;

    tree.descendants().forEach(d => {
        if (!d.children || d.depth === 0) return;
        if (config.depth > 0 && (d.depth - depth) > config.depth) return;

        const leaves = d.leaves();
        const minX = d3.min(leaves, l => l.x);
        const maxX = d3.max(leaves, l => l.x);

        if (minX < 1 && maxX > 359) {
            depth += 1;
            return;
        }

        const radius = config.inner_radius + ((d.depth - depth) * 16);
        const arcLength = (maxX - minX) * DEG * radius;

        if (arcLength < config.min_arc_length) return;

        folders.push({
            id: d.__id,
            minX,
            maxX,
            radius,
            arcLength,
            leafCount: leaves.length,
            key: d.data.key,
            file: d.data.file
        });
    });

    return folders;
}

const calcLinks = ({ cluster, tree, dynamic }) => {
    cluster(tree);

    return packageImports(tree.leaves(), dynamic.steps_histogram);
}

export default async function update({
    renderer, collector, tree, config, dynamic
}) {
    if (!Object.keys(formatMethods).includes(config.method.toUpperCase()))
        throw new Error("Unidentified geometry rendering method");
    
    // update beta bundling
    let line = formatMethods[config.method.toUpperCase()](collector, {
        radial_beta: dynamic.radial_beta,
        square_radius: config.square_radius,
        inner_radius: config.inner_radius
    });
    
    // update min-lines
    renderer.setMinSize(dynamic.min_size);
    
    const cluster = d3.cluster()
        .size([360, config.inner_radius]);

    let {
        duplicated: links,
        bufferSize,
        maxPathLength,
        histogram: duplicated_lines_histogram,
        maxSize: max_duplicated_lines
    } = calcLinks({ cluster, tree, dynamic });

    const folders = collectFolders(tree, config);

    dynamic.max_duplicated_lines = max_duplicated_lines;
    dynamic.duplicated_lines_histogram = duplicated_lines_histogram;
    dynamic.half_extent = renderer.halfExtent;

    return { links, line, bufferSize, maxPathLength, folders }
}