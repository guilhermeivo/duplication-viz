/**
 * Based on Mike Bostock's "Hierarchical Edge Bundling" example:
 * https://gist.github.com/mbostock/1044242
 *
 * Original author: Mike Bostock
 * License: GNU General Public License v3.0 (GPL-3.0)
 *
 * The original SVG/D3 rendering section was completely replaced with a
 * custom WebGL2 renderer to support more efficient rendering of large
 * numbers of bundled edges.
 *
 * This file contains modifications and adaptations of the original code
 * for use with file-based hierarchies and duplicated/imported relationships.
 *
 * Modifications include:
 * - Adaptation of the hierarchy from package names to file paths.
 * - Adaptation of packageImports() to handle duplicated relationships.
 * - Preservation of relationship size information.
 * - Integration with the application's own data model.
 */

const packageHierarchy = (classes) => {
    const map = {};

    function find(file, data) {
        var node = map[file], i;
        if (!node) {
            node = map[file] = data || {file: file, children: []};
            if (file.length) {
                i = file.lastIndexOf("/");
                node.parent = find(i >= 0 ? file.substring(0, i) : "");
                node.parent.children.push(node);
                node.key = file.substring(i + 1);
            }
        }
        return node;
    }

    classes.forEach(function(d) {
        find(d.file, d);
    });

    return d3.hierarchy(map[""]);
}

const packageImports = (nodes, steps) => {
    const map = {};
    const duplicated = [];

    const maxSize = Math.max(...nodes.map(l => l.data.size || 0));

    let amountCurves = 0;
    let maxPathLength = 0;

    nodes.forEach(function(d) {
        map[d.data.file] = d;
    });

    nodes.forEach(function(d) {
        const imports = d.data.duplicated;
        if (!imports)
            return;

        const size = d.data.size || 0;

        imports.forEach(function(i) {
            if (map[i]) {
                const path = d.path(map[i]);
                duplicated.push({
                    path, size
                });
                amountCurves += path.length;
                maxPathLength = Math.max(maxPathLength, path.length);
            }
        });
    });

    const histogram = new Uint32Array(steps);
    nodes.forEach(d => {
        const imports = d.data.duplicated;

        if (!imports)
            return;

        const size = d.data.size || 0;

        const bin = sizeToBin(size, maxSize, steps)

        histogram[bin]++;
    });


    return { duplicated, bufferSize: amountCurves * 8, maxPathLength, histogram, maxSize };
}

function sizeToBin(size, maxSize, steps) {
    if (maxSize <= 0 || size <= 0)
        return -1;

    return Math.min(
        steps - 1,
        Math.floor((size / maxSize) * steps)
    );
}
function binToSize(bin, maxSize, steps) {
    if (maxSize <= 0)
        return 0;

    return ((bin + 0.5) / steps) * maxSize;
}


export { packageHierarchy, packageImports, sizeToBin, binToSize };