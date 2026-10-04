const colorScaleFunc = (domain, range) => {
    const deltaDomain = domain[1] - domain[0];
    const deltaRed = range[1].r - range[0].r;
    const deltaGreen = range[1].g - range[0].g;
    const deltaBlue = range[1].b - range[0].b;
    const deltaAlpha = range[1].alpha - range[0].alpha;

    // colorScale()
    return (value) => {
        const t = (value - domain[0]) / deltaDomain;

        return {
            r: range[0].r + t * deltaRed,
            g: range[0].g + t * deltaGreen,
            b: range[0].b + t * deltaBlue,
            alpha: range[0].alpha + t * deltaAlpha
        }
    }
}

export default class CanvasRenderer {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext("2d");

        if (!this.ctx) {
            throw new Error("Unable to initialize Canvas 2D. Your browser or machine may not support it.");
        }
    }

    init(config) {
        this.config = config;

        this.ctx.scale(config.SCALE, config.SCALE);
        this.ctx.translate(config.WIDTH / 2, config.HEIGHT / 2);
    }

    static collector(renderer, config) {
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
        const colorScale = colorScaleFunc([0, options.maxSize], [this.config.START_COLOR, this.config.END_COLOR]);

        this.ctx.beginPath();

        line(d.path);

        const color = colorScale(options.size);
        // options.alphaMultiplier
        this.ctx.strokeStyle = `rgba(${255 * color.r * color.alpha}, ${255 * color.g * color.alpha}, ${255 * color.b * color.alpha}, ${color.alpha})`;

        this.ctx.lineWidth = this.config.LINE_WIDTH || 0.1;

        this.ctx.stroke();
    }

    clear() {
        
    }

    render() {

    }
}
