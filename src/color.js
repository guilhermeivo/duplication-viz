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

const objectToRgba = ({ r, g, b, alpha }) => {
    return `rgba(${255 * r * alpha}, ${255 * g * alpha}, ${255 * b * alpha}, ${alpha})`
}

export { colorScaleFunc, objectToRgba };