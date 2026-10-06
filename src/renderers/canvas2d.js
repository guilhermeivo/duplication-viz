import { colorScaleFunc, objectToRgba } from "../color.js"

export default class CanvasRenderer {
    #lineWidth = 0.1;
    #scale = 1;
    #start_color = undefined;
    #end_color = undefined;

    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext("2d");

        if (!this.ctx) {
            throw new Error("Unable to initialize Canvas 2D. Your browser or machine may not support it.");
        }
    }

    // builder

    setLineWidth(value) {
        if (this.#lineWidth == value)
            return this;

        this.#lineWidth = value;

        return this;
    }

    setScale(value) {
        if (this.#scale == value)
            return this;

        this.#scale = value;

        return this;
    }

    setColors(values) {
        if (this.#start_color == values[0] && this.#end_color == values[1])
            return this;

        this.#start_color = values[0];
        this.#end_color = values[1];

        return this;
    }

    //

    init() {
        this.resize();
    }

    resize() {
        this.ctx.scale(this.#scale, this.#scale);
        this.ctx.translate(this.canvas.clientWidth / 2, this.canvas.clientHeight / 2);
    }

    static collector(renderer, ratio) {
        return {
            beginPath: () => { },

            moveTo: (x, y) => {
                renderer.ctx.moveTo(x, y);
            },

            lineTo: (x, y) => {
                renderer.ctx.lineTo(x, y);
            },

            bezierCurveTo: (x1, y1, x2, y2, x, y) => {
                renderer.ctx.bezierCurveTo(x1, y1, x2, y2, x, y);
            },

            closePath() { }
        };
    }

    draw(line, d, options) {
        const colorScale = colorScaleFunc([0, options.maxSize], [this.#start_color, this.#end_color]);

        this.ctx.beginPath();

        line(d.path);

        // options.alphaMultiplier
        this.ctx.strokeStyle = objectToRgba(colorScale(options.size));

        this.ctx.lineWidth = this.#lineWidth;

        this.ctx.stroke();
    }

    clear() {
        
    }

    render() {

    }
}
