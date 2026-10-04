const DEG = Math.PI / 180;

function collectFolders(root, config) {
    const folders = [];
    let depth = 0;

    root.descendants().forEach(d => {
        if (!d.children || d.depth === 0) return;
        if (config.DEPTH > 0 && (d.depth - depth) > config.DEPTH) return;

        const leaves = d.leaves();
        const minX = d3.min(leaves, l => l.x);
        const maxX = d3.max(leaves, l => l.x);

        if (minX < 1 && maxX > 359) {
            depth += 1;
            return;
        }

        const radius = config.INNER_RADIUS + ((d.depth - depth) * 16);
        const arcLength = (maxX - minX) * DEG * radius;

        if (arcLength < (config.MIN_ARC_LENGTH ?? 2)) return;

        folders.push({ node: d, minX, maxX, radius, arcLength, leafCount: leaves.length });
    });

    return folders;
}

class FolderOverlay extends HTMLElement {
    tooltip = null;
    element = null;
    selected = null;
    zoomed = null;

    constructor() {
        super();

        this.CLICK_DELAY = 250;

        this.showTooltip = this.showTooltip.bind(this);
        this.moveTooltip = this.moveTooltip.bind(this);
        this.hideTooltip = this.hideTooltip.bind(this);

        this.onSelectOverlay = this.onSelectOverlay.bind(this);
        this.onZoomOverlay = this.onZoomOverlay.bind(this);
    }

    showTooltip(f) {
        this.tooltip
            .style("display", "block")
            .html(`<strong>${f.node.data.key}</strong><br>${f.leafCount} arquivos`);
        this.moveTooltip();
    }

    moveTooltip() {
        const e = d3.event;

        this.tooltip
            .style("left", (e.clientX + 14) + "px")
            .style("top", (e.clientY + 14) + "px");
    }

    hideTooltip() {
        this.tooltip.style("display", "none");
    }

    onSelectOverlay(node, callback) {
        this.selected = (this.selected === node) ? null : node;

        this.items
            .classed("selected", f => f.node === node);

        callback && callback({ selected: this.selected, isZoomed: false });
    }

    onZoomOverlay(node, callback) {
        this.zoomed = (this.zoomed === node) ? null : node;
        this.selected = null;

        callback && callback({ selected: this.selected, isZoomed: true });
    }

    clean() {
        if (this.items)
            this.items.remove();
        if (this.element)
            this.element.remove();
    }

    create({ canvas, onPaint }) {
        const container = canvas.parentNode;
        this.container = container;

        this.tooltip = d3.select(this.container).append("div").attr("class", "tooltip");

        this.clickTimer = null;

        this.onClick = f => {
            this.hideTooltip();

            if (this.clickTimer != null)
                return;

            clearTimeout(this.clickTimer);
            this.clickTimer = setTimeout(() => {
                this.onSelectOverlay(f.node, onPaint);
                this.clickTimer = null;
            }, this.CLICK_DELAY);
        }
        this.onDblClick = f => {
            clearTimeout(this.clickTimer);
            this.hideTooltip();
            this.onZoomOverlay(f.node, onPaint);
            this.clickTimer = null;
        }
    }

    draw({ root, config, halfExtent }) {
        const size = canvas.clientWidth;
        const pxToUnit = (2 * halfExtent) / size;

        this.element = d3.select(this.container).append("svg")
            .attr("class", "overlay")
            .attr("width", size)
            .attr("height", size)
            .attr("viewBox", `${-halfExtent} ${-halfExtent} ${2 * halfExtent} ${2 * halfExtent}`);

        const arcWidth = (config.ARC_WIDTH ?? 1.5) * pxToUnit;
        const hitWidth = 12 * pxToUnit;
        const fontSize = 9 * pxToUnit;

        const arc = d3.arc();
        const folders = collectFolders(root, config);

        this.items = this.element.append("g")
            .selectAll("g.folder")
            .data(folders)
            .enter()
            .append("g")
            .attr("class", "folder");

        this.items.append("path")
            .attr("class", "arc")
            .attr("d", f => arc({
                innerRadius: f.radius - arcWidth / 2,
                outerRadius: f.radius + arcWidth / 2,
                startAngle: f.minX * DEG,
                endAngle: f.maxX * DEG
            }));

        this.items.append("path")
            .attr("class", "hit")
            .attr("d", f => arc({
                innerRadius: f.radius - hitWidth / 2,
                outerRadius: f.radius + hitWidth / 2,
                startAngle: f.minX * DEG,
                endAngle: f.maxX * DEG
            }))
            .on("mouseenter", this.showTooltip)
            .on("mousemove", this.moveTooltip)
            .on("mouseleave", this.hideTooltip)
            .on("click", this.onClick)
            .on("dblclick", this.onDblClick);

        this.items.filter(f => {
            const key = f.node.data.key || "";

            return (key.length * 5) / f.arcLength < 1 && f.arcLength > 15;
        })
            .append("text")
            .attr("class", "label")
            .attr("text-anchor", "middle")
            .style("font-size", fontSize + "px")
            .attr("transform", f => {
                const mid = (f.minX + f.maxX) / 2 - 90;
                const midRad = mid * DEG;
                const flip = (midRad > -Math.PI / 2 && midRad < Math.PI / 2) ? 90 : -90;

                return `rotate(${mid}) translate(${f.radius + 8 * pxToUnit}, 0) rotate(${flip})`;
            })
            .text(f => f.node.data.key);
    }
}

customElements.define('folder-overlay', FolderOverlay);