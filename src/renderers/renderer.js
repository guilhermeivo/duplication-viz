import CanvasRenderer from "./canvas2d.js"
import WebGL2Renderer from "./webgl2.js"

const getRendererClass = (contextType) => {
    switch (contextType) {
        case "2d":
            return CanvasRenderer;
        case "webgl2":
            return WebGL2Renderer;
        default:
            return CanvasRenderer;
    }
}

export default getRendererClass;
