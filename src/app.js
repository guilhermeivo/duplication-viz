import { status, StatusType } from "./status.js"
import { packageHierarchy, packageImports } from "./data.js"
import getRendererClass from "./renderers/renderer.js"

import { store } from "./store.js"

export const formatMethods = {
    RADIAL: (context) => {
        const beta = store.get("radial_beta");
        return d3.lineRadial()
            .curve(d3.curveBundle.beta(beta))
            .radius(d => d.y)
            .angle(d => d.x / 180 * Math.PI)
            .context(context)
    },
    SQUARE: (context) => {
        const squareRadius = store.get("square_radius");
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

            const halfSquare = store.get("inner_radius");

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

const calcLinks = ({ tree }) => {
    const cluster = d3.cluster()
        .size([360, store.get("inner_radius")]);

    const maxDuplicatedLines = Math.max(...tree.leaves().map(l => l.data.size || 0));

    cluster(tree);
    const { duplicated: links, bufferSize, maxPathLength } = packageImports(tree.leaves());

    return { links, bufferSize, maxDuplicatedLines, maxPathLength };
}

export function renderVisualization(canvas, data) {
    const label = "Render Visualization";
    console.time(label);

    const Renderer = getRendererClass(store.get("context_type"));

    status.set(`Reading ${data.length} records...`);

    const root = packageHierarchy(data)
        .sum(function(d) { return d.size; })
        .sort(function(a, b) { 
            const nameA = a.data.file || a.data.key || "";
            const nameB = b.data.file || b.data.key || "";
            return d3.ascending(nameA, nameB); 
        });

    let { links, maxDuplicatedLines, bufferSize, maxPathLength } = calcLinks({ tree: root });

    if (!Object.keys(formatMethods).includes(store.get("method").toUpperCase())) {
        status.set("Unidentified geometry rendering method", { type: StatusType.ERROR });
        return false;
    }

    const renderer = new Renderer(canvas)
        .setSegments(store.get("segments"))
        .setLineWidth(store.get("line_width"))
        .setColors([ store.get("start_color"), store.get("end_color") ])
        .setScale(store.get("scale"))
        .setRadius(store.get("inner_radius"));
    renderer.init(store);

    const collector = Renderer.collector(renderer, renderer.ratio);
    const line = formatMethods[store.get("method").toUpperCase()](collector);

    const maxBufferSize = Math.min(bufferSize, renderer.maxVertices) + (maxPathLength * 8);
    renderer.createBuffers(maxBufferSize);

    if (store.get("show_folders") && renderer.halfExtent) {
        let overlay = document.querySelector("#overlay");
        overlay.create({
            canvas,
            onPaint: async (props) => {
                console.time(label);

                status.loading();

                await new Promise(r => setTimeout(r, 100));

                ({ links, maxDuplicatedLines } = calcLinks({ tree: overlay.zoomed || root, store }));
                paint(props);
                overlay.clean();
                overlay.draw({
                    root: overlay.zoomed || root,
                    halfExtent: renderer.halfExtent,
                });
                ({ links, maxDuplicatedLines } = calcLinks({ tree: root, store }));

                status.loadingEnd();
            }
        });
        overlay.draw({
            root: overlay.zoomed || root,
            halfExtent: renderer.halfExtent,
        });
    }

    function paint({ selected, isZoomed } = { }) {
        if (isZoomed)
            renderer.resize();

        renderer.clear();
        collector.beginPath();

        const dim = store.get("dim_alpha") ?? 0.0;

        const inside = selected ? new Set(selected.leaves()) : null;

        const touches = d => inside.has(d.path[0]) || inside.has(d.path[d.path.length - 1]);

        const k = inside ? dim : 1.0;

        links.forEach(d => {
            if (inside && touches(d)) return;

            renderer.draw(line, d, {
                size: d.size,
                alphaMultiplier: k,
                maxSize: maxDuplicatedLines
            });
        });

        if (inside) {
            links.forEach(d => {
                if (!touches(d)) return;

                renderer.draw(line, d, {
                    size: d.size,
                    alphaMultiplier: k,
                    maxSize: maxDuplicatedLines
                });
            });
        }

        collector.closePath();
        renderer.render(maxDuplicatedLines, k);

        console.timeEnd(label);
    }

    paint();

    status.disable();

    return true;
}