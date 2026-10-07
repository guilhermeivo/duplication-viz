export default async function render({
    renderer, links, collector, line, selected, config, dynamic
}) {
    if (dynamic.is_zoomed)
        renderer.resize();

    renderer.clear();
    collector.beginPath();

    const inside = selected ? new Set(selected) : null;

    const touches = d => inside.has(d.path[0]) || inside.has(d.path[d.path.length - 1]);

    const k = inside ? config.dim_alpha : 1.0;

    links.forEach(d => {
        if (inside && touches(d))
            return;

        renderer.draw(line, d, {
            size: d.size,
            alphaMultiplier: k,
            maxSize: dynamic.max_duplicated_lines
        });
    });

    collector.closePath();
    renderer.render(dynamic.max_duplicated_lines, k);

    if (inside) {
        links.forEach(d => {
            if (!touches(d)) return;

            renderer.draw(line, d, {
                size: d.size,
                alphaMultiplier: 1.0,
                maxSize: dynamic.max_duplicated_line
            });
        });

        collector.closePath();
        renderer.render(dynamic.max_duplicated_lines, 1.0);
    }
}