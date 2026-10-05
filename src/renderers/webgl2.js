const MAX_VERTICES = 2 * 1_000_000;

const FOV = (45 * Math.PI) / 180;
const CAMERA_Z = 6.0;

/**
 * Anti-aliasing por cobertura: a linha tem no mínimo 1px + 0.5px de franja,
 * e vDist (distância ao centro, em px) é usada no fragment shader para suavizar
 * a borda.
 */
const vertexShaderSource = `#version 300 es
in vec2 aP0;
in vec2 aP1;
in vec2 aP2;
in vec2 aP3;

uniform mat4 uModelViewMatrix;
uniform mat4 uProjectionMatrix;
uniform int uSegments;
uniform float uWidthPx;
uniform float uWorldPerPx;

uniform vec4 uStartColor;
uniform vec4 uEndColor;
uniform float uMinSize;
uniform float uMaxSize;

uniform float uAlphaMultiplier;

in float aSize;
out vec4 vColor;

out float vDist;

vec2 cubicBezier(float t) {
    float u = 1.0 - t;

    return
        u * u * u * aP0 +
        3.0 * u * u * t * aP1 +
        3.0 * u * t * t * aP2 +
        t * t * t * aP3;
}

void main() {
    int segmentIndex = gl_VertexID / 2;
    float side = ((gl_VertexID & 1) == 0) ? -1.0 : 1.0;

    float t = float(segmentIndex) / float(uSegments);
    float u = 1.0 - t;

    vec2 position = cubicBezier(t);

    vec2 tangent =
        3.0 * u * u * (aP1 - aP0) +
        6.0 * u * t * (aP2 - aP1) +
        3.0 * t * t * (aP3 - aP2);

    if (dot(tangent, tangent) < 1e-12) tangent = aP3 - aP0;
    if (dot(tangent, tangent) < 1e-12) tangent = vec2(1.0, 0.0);

    vec2 normal = normalize(vec2(-tangent.y, tangent.x));

    // AA: franja de 0.5px + vDist enviado ao fragment shader
    float halfPx = max(uWidthPx, 1.0) * 0.5 + 0.5;
    vec2 finalPosition = position + normal * side * halfPx * uWorldPerPx;

    gl_Position = uProjectionMatrix * uModelViewMatrix * vec4(finalPosition, 0.0, 1.0);

    vDist = side * halfPx;

    float ratio = clamp(
        (aSize - uMinSize) / max(uMaxSize - uMinSize, 1e-6),
        0.0,
        1.0
    );

    vec4 color = mix(uStartColor, uEndColor, ratio);
    color.a *= uAlphaMultiplier;

    vColor = color;
}
`;

const fragmentShaderSource = `#version 300 es
precision highp float;

uniform float uWidthPx;

in vec4 vColor;
in float vDist;

out vec4 outColor;

void main(void) {
    float halfGeom = max(uWidthPx, 1.0) * 0.5;
    float cov = clamp(halfGeom + 0.5 - abs(vDist), 0.0, 1.0) * min(uWidthPx, 1.0);

    float a = vColor.a * cov * 0.5;

    vec3 rgb = vColor.rgb * vColor.a;

    outColor = vec4(rgb * a, a);
}
`;

/*
 * BLIT: copia a textura RGBA16F para o canvas.
 *
 * Só é usado se o navegador suportar EXT_color_buffer_float. Sem a extensão,
 * as curvas são desenhadas direto no canvas e estes shaders não rodam.
 *
 * O canvas é de 8 bits e arredonda cada blend. Com milhares de linhas
 * de alpha minúsculo, contribuições menores que 1/255 viram 0 e o desenho fica
 * pálido. Acumulando em float, nada se perde, e a conversão para 8 bits
 * acontece uma vez só, no final. O Canvas 2D não sofre disso porque usa o
 * próprio blend do navegador.
 */
const blitVertexSource = `#version 300 es
void main() {
    vec2 p = vec2(float((gl_VertexID << 1) & 2), float(gl_VertexID & 2));
    gl_Position = vec4(p * 2.0 - 1.0, 0.0, 1.0);
}
`;

const blitFragmentSource = `#version 300 es
precision highp float;

uniform sampler2D uTex;
out vec4 outColor;

void main() {
    outColor = texelFetch(uTex, ivec2(gl_FragCoord.xy), 0);
}
`;

function initShaderProgram(gl, vsSource, fsSource) {
    const vertexShader = loadShader(gl, gl.VERTEX_SHADER, vsSource);
    const fragmentShader = loadShader(gl, gl.FRAGMENT_SHADER, fsSource);

    if (!vertexShader || !fragmentShader) {
        throw new Error("Failed to create WebGL2 shaders.");
    }

    const shaderProgram = gl.createProgram();
    gl.attachShader(shaderProgram, vertexShader);
    gl.attachShader(shaderProgram, fragmentShader);
    gl.linkProgram(shaderProgram);

    if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
        console.error(`Unable to initialize the shader program: ${gl.getProgramInfoLog(shaderProgram)}`);

        return null;
    }

    return shaderProgram;
}

function loadShader(gl, type, source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);

    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.error(`An error occurred compiling the shaders: ${gl.getShaderInfoLog(shader)}`);
        gl.deleteShader(shader);

        return null;
    }

    return shader;
}

export default class WebGL2Renderer {
    constructor(canvas) {
        this.canvas = canvas;
        this.gl = canvas.getContext("webgl2", {
            antialias: false,
            depth: false,
            alpha: true
        });

        if (!this.gl) {
            throw new Error("Unable to initialize WebGL2. Your browser or machine may not support it.");
        }
    }

    init(config) {
        this.config = config;
        this.config.SEGMENTS = this.config.SEGMENTS || 16;
        this.config.LINE_WIDTH = this.config.LINE_WIDTH || 0.1;

        const gl = this.gl;

        const shaderProgram = initShaderProgram(gl, vertexShaderSource, fragmentShaderSource);
        this.programInfo = {
            program: shaderProgram,
            attribLocations: {
                vertexP0: gl.getAttribLocation(shaderProgram, "aP0"),
                vertexP1: gl.getAttribLocation(shaderProgram, "aP1"),
                vertexP2: gl.getAttribLocation(shaderProgram, "aP2"),
                vertexP3: gl.getAttribLocation(shaderProgram, "aP3"),
                vertexSize: gl.getAttribLocation(shaderProgram, "aSize"),
            },
            uniformLocations: {
                modelViewMatrix: gl.getUniformLocation(shaderProgram, "uModelViewMatrix"),
                projectionMatrix: gl.getUniformLocation(shaderProgram, "uProjectionMatrix"),
                segments: gl.getUniformLocation(shaderProgram, "uSegments"),
                widthPx: gl.getUniformLocation(shaderProgram, "uWidthPx"),
                worldPerPx: gl.getUniformLocation(shaderProgram, "uWorldPerPx"),
                startColor: gl.getUniformLocation(shaderProgram, "uStartColor"),
                endColor: gl.getUniformLocation(shaderProgram, "uEndColor"),
                minSize: gl.getUniformLocation(shaderProgram, "uMinSize"),
                maxSize: gl.getUniformLocation(shaderProgram, "uMaxSize"),
                alphaMultiplier: gl.getUniformLocation(shaderProgram, "uAlphaMultiplier"),
            },
        };

        const blitProgram = initShaderProgram(gl, blitVertexSource, blitFragmentSource);
        this.blitProgramInfo = {
            program: blitProgram,
            attribLocations: { },
            uniformLocations: {
                tex: gl.getUniformLocation(blitProgram, "uTex")
            }
        }

        this.useFloat =
            !!gl.getExtension("EXT_color_buffer_float") ||
            !!gl.getExtension("EXT_color_buffer_half_float");

        this.emptyVao = gl.createVertexArray();

        this.curveBuffer = gl.createBuffer();
        this.sizeBuffer = gl.createBuffer();

        gl.useProgram(this.programInfo.program);
        gl.uniform1i(this.programInfo.uniformLocations.segments, this.config.SEGMENTS);

        const sColor = this.config.START_COLOR;
        gl.uniform4f(this.programInfo.uniformLocations.startColor, sColor.r, sColor.g, sColor.b, sColor.alpha);
        const eColor = this.config.END_COLOR;
        gl.uniform4f(this.programInfo.uniformLocations.endColor, eColor.r, eColor.g, eColor.b, eColor.alpha);
        gl.uniform1f(this.programInfo.uniformLocations.minSize, 0);

        this.resize();

        gl.enable(gl.BLEND);
        gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    }

    createTarget(w, h) {
        const gl = this.gl;

        if (!this.useFloat) return;

        if (this.tex) gl.deleteTexture(this.tex);
        if (!this.fbo) this.fbo = gl.createFramebuffer();

        this.tex = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, this.tex);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA16F, w, h, 0, gl.RGBA, gl.HALF_FLOAT, null);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

        gl.bindFramebuffer(gl.FRAMEBUFFER, this.fbo);
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this.tex, 0);

        if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE) {
            console.warn("RGBA16F framebuffer not supported, falling back to 8-bit.");
            this.useFloat = false;
        }

        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    }

    createBuffers(bufferSize) {
        this.bufferCurves = new Float32Array(bufferSize);
        this.bufferCurvesIndex = 0;

        this.bufferSizes = new Float32Array(bufferSize / 8);
        this.bufferSizesIndex = 0;
    }

    resize() {
        const gl = this.gl;

        const dpr = window.devicePixelRatio || 1;

        const w = Math.round(this.canvas.clientWidth * dpr * this.config.SCALE);
        const h = Math.round(this.canvas.clientHeight * dpr * this.config.SCALE);

        this.canvas.style.width = this.canvas.clientWidth + "px";
        this.canvas.style.height = this.canvas.clientHeight + "px";

        this.canvas.width = w;
        this.canvas.height = h;
        this.width = w;
        this.height = h;

        this.createTarget(w, h);

        gl.viewport(0, 0, w, h);
        gl.useProgram(this.programInfo.program);

        const worldPerPx = (2 * CAMERA_Z * Math.tan(FOV / 2)) / h;
        const ratio = this.config.SCALE / this.config.INNER_RADIUS;
        const widthPx = (this.config.LINE_WIDTH * ratio) / worldPerPx;

        console.debug(`[WebGL2] line width = ${widthPx.toFixed(3)} px`);

        gl.uniform1f(this.programInfo.uniformLocations.worldPerPx, worldPerPx);
        gl.uniform1f(this.programInfo.uniformLocations.widthPx, widthPx);

        this.camera();

        this.clear();
    }

    get halfExtent() {
        const halfVisibleWorld = CAMERA_Z * Math.tan(FOV / 2);

        return halfVisibleWorld * this.config.INNER_RADIUS / this.config.SCALE;
    }

    get maxVertices() {
        return MAX_VERTICES;
    }

    clear() {
        const gl = this.gl;

        gl.clearColor(0.0, 0.0, 0.0, 0.0);

        if (this.useFloat) {
            gl.bindFramebuffer(gl.FRAMEBUFFER, this.fbo);
            gl.clear(gl.COLOR_BUFFER_BIT);
        }

        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        gl.clear(gl.COLOR_BUFFER_BIT);
    }

    static collector(renderer, config) {
        const ratio = config.SCALE / config.INNER_RADIUS;
        let current = null;

        const pushCubic = (p0, p1, p2, p3) => {
            renderer.bufferCurves[renderer.bufferCurvesIndex] = p0.x;
            renderer.bufferCurves[renderer.bufferCurvesIndex + 1] = p0.y;
            renderer.bufferCurves[renderer.bufferCurvesIndex + 2] = p1.x;
            renderer.bufferCurves[renderer.bufferCurvesIndex + 3] = p1.y;
            renderer.bufferCurves[renderer.bufferCurvesIndex + 4] = p2.x;
            renderer.bufferCurves[renderer.bufferCurvesIndex + 5] = p2.y;
            renderer.bufferCurves[renderer.bufferCurvesIndex + 6] = p3.x;
            renderer.bufferCurves[renderer.bufferCurvesIndex + 7] = p3.y;
            renderer.bufferCurvesIndex += 8;
        };

        return {
            beginPath: () => {
                renderer.bufferCurvesIndex = 0;
                renderer.bufferSizesIndex = 0;

                current = null;
            },

            moveTo: (x, y) => {
                current = {
                    x: x * ratio,
                    y: y * ratio
                }
            },

            lineTo: (x, y) => {
                current = {
                    x: x * ratio,
                    y: y * ratio
                }
            },

            bezierCurveTo: (x1, y1, x2, y2, x, y) => {
                const p3 = {
                    x: x * ratio,
                    y: y * ratio
                };

                if (current == null) {
                    current = p3;
                    return;
                }

                const p0 = current;

                const p1 = {
                    x: x1 * ratio,
                    y: y1 * ratio
                };

                const p2 = {
                    x: x2 * ratio,
                    y: y2 * ratio
                };

                pushCubic(p0, p1, p2, p3);

                current = p3;
            },

            closePath() { }
        };
    }

    draw(line, d, options) {
        const before = this.bufferCurvesIndex;
        line(d.path);
        const added = (this.bufferCurvesIndex - before) / 8;

        for (let i = 0; i < added; i++) {
            this.bufferSizes[this.bufferSizesIndex] = options.size || 0
            this.bufferSizesIndex += 1;
        }

        if (this.bufferCurvesIndex > MAX_VERTICES) {
            WebGL2Renderer.collector(this, this.config).closePath();
            this.render(options.maxSize, options.alphaMultiplier);

            WebGL2Renderer.collector(this, this.config).beginPath();
        }
    }

    camera() {
        const gl = this.gl;

        const aspect = this.canvas.width / this.canvas.height;
        const zNear = 0.1;
        const zFar = 200.0;
        const projectionMatrix = mat4.create();

        mat4.perspective(projectionMatrix, FOV, aspect, zNear, zFar);

        const modelViewMatrix = mat4.create();

        mat4.translate(
            modelViewMatrix,
            modelViewMatrix,
            [-0.0, 0.0, -CAMERA_Z],
        );

        mat4.scale(modelViewMatrix, modelViewMatrix, [1, -1, 1]);

        // set matrix uniform
        gl.uniformMatrix4fv(
            this.programInfo.uniformLocations.projectionMatrix,
            false,
            projectionMatrix,
        );
        gl.uniformMatrix4fv(
            this.programInfo.uniformLocations.modelViewMatrix,
            false,
            modelViewMatrix,
        );
    }

    /**
     * Copia a textura de RGBA16F para o canvas usando os shaders de BLIT.
     */
    present() {
        const gl = this.gl;

        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        gl.viewport(0, 0, this.width, this.height);
        gl.disable(gl.BLEND);

        gl.useProgram(this.blitProgramInfo.program);
        gl.bindVertexArray(this.emptyVao);
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, this.tex);
        gl.uniform1i(this.blitProgramInfo.tex, 0);
        gl.drawArrays(gl.TRIANGLES, 0, 3);

        gl.bindVertexArray(null);
        gl.enable(gl.BLEND);
        gl.useProgram(this.programInfo.program);
    }

    render(maxSize, alphaMultiplier = 1.0) {
        const gl = this.gl;
        const curveCount = this.bufferCurvesIndex / 8;

        if (curveCount === 0)
            return;

        gl.uniform1f(this.programInfo.uniformLocations.alphaMultiplier, alphaMultiplier);
        gl.uniform1f(this.programInfo.uniformLocations.maxSize, maxSize);

        /**
         * Escolhe onde desenhar as curvas:
         * 
         * - this.fbo: textura RGBA16F fora da tela, onde o blend acumula em
         * float sem perder alpha pequeno (usado quando EXT_color_buffer_float
         * existe).
         * - null: o próprio canvas de 8 bits (fallback, sem a extensão).
         */
        gl.bindFramebuffer(gl.FRAMEBUFFER, this.useFloat ? this.fbo : null);
        gl.viewport(0, 0, this.width, this.height);
        gl.useProgram(this.programInfo.program);
        gl.enable(gl.BLEND);
        gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);

        // curves
        gl.bindBuffer(gl.ARRAY_BUFFER, this.curveBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, this.bufferCurves.subarray(0, this.bufferCurvesIndex), gl.DYNAMIC_DRAW);

        const stride = 8 * Float32Array.BYTES_PER_ELEMENT;
        const {
            vertexP0, vertexP1, vertexP2, vertexP3, vertexSize
        } = this.programInfo.attribLocations;

        [vertexP0, vertexP1, vertexP2, vertexP3].forEach((location, i) => {
            gl.enableVertexAttribArray(location);
            gl.vertexAttribPointer(
                location,
                2, gl.FLOAT, false, stride, i * 2 * Float32Array.BYTES_PER_ELEMENT
            );
            gl.vertexAttribDivisor(location, 1);
        });

        // sizes/colors
        gl.bindBuffer(gl.ARRAY_BUFFER, this.sizeBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, this.bufferSizes.subarray(0, this.bufferSizesIndex), gl.DYNAMIC_DRAW);

        gl.enableVertexAttribArray(vertexSize);
        gl.vertexAttribPointer(vertexSize, 1, gl.FLOAT, false, 0, 0);
        gl.vertexAttribDivisor(vertexSize, 1);

        gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, (this.config.SEGMENTS + 1) * 2, curveCount);

        if (this.useFloat)
            this.present();
    }
}
