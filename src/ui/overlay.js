import * as d3 from "d3";

import { store } from "@src/store.js"

const DEG = Math.PI / 180;

class FolderOverlay extends HTMLElement {
    tooltip = null;
    element = null;
    selected = null;
    zoomed = null;

    created = false;

    constructor() {
        super();

        this.CLICK_DELAY = 250;

        this.showTooltip = this.showTooltip.bind(this);
        this.moveTooltip = this.moveTooltip.bind(this);
        this.hideTooltip = this.hideTooltip.bind(this);

        this.onSelectOverlay = this.onSelectOverlay.bind(this);
        this.onZoomOverlay = this.onZoomOverlay.bind(this);
    }

    showTooltip(event, f) {
        this.tooltip
            .style("display", "block")
            .html(`<strong>${f.key}</strong><br>${f.leafCount} arquivos`);

        this.moveTooltip(event);
    }

    moveTooltip(event) {
        this.tooltip
            .style("left", (event.clientX + 14) + "px")
            .style("top", (event.clientY + 14) + "px");
    }

    hideTooltip() {
        this.tooltip.style("display", "none");
    }

    onSelectOverlay(id, callback) {
        this.selected = (this.selected === id) ? null : id;

        this.items
            .classed("selected", f => f.id === this.selected);

        callback && callback({ selected: this.selected, isZoomed: false });
    }

    onZoomOverlay(f, callback) {
        this.zoomed = (this.zoomed === f) ? null : f;
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
        if (this.created)
            return;

        const container = canvas.parentNode;
        this.container = container;

        this.tooltip = d3.select(this.container).append("div").attr("class", "tooltip");

        this.clickTimer = null;

        this.onClick = (event, f) => {
            this.hideTooltip();

            if (this.clickTimer != null)
                return;

            clearTimeout(this.clickTimer);
            this.clickTimer = setTimeout(() => {
                this.onSelectOverlay(f.id, onPaint);
                this.clickTimer = null;
            }, this.CLICK_DELAY);
        }
        this.onDblClick = (event, f) => {
            clearTimeout(this.clickTimer);
            this.hideTooltip();
            this.onZoomOverlay(f, onPaint);
            this.clickTimer = null;
        }

        this.created = true;
    }

    draw({ folders, halfExtent }) {
        const size = canvas.clientWidth;
        const pxToUnit = (2 * halfExtent) / size;

        this.element = d3.select(this.container).append("svg")
            .attr("class", "overlay")
            .attr("width", size)
            .attr("height", size)
            .attr("viewBox", `${-halfExtent} ${-halfExtent} ${2 * halfExtent} ${2 * halfExtent}`);

        const arcWidth = store.get("arc_width") * pxToUnit;
        const hitWidth = 12 * pxToUnit;
        const fontSize = 9 * pxToUnit;

        const arc = d3.arc();

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
            const key = f.key || "";

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
            .text(f => f.key);
    }
}

customElements.define('folder-overlay', FolderOverlay);