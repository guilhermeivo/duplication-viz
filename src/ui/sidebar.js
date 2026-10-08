import { store, storeDynamic } from"#src/store.js"
import { colorScaleFunc, objectToRgba } from "#src/color.js"
import { sizeToBin } from "#src/data.js"

(() => {
    const stepsHistogram = storeDynamic.get("steps_histogram");

    const sliderDuplicatedLines = document.querySelector("#slider-duplicated-lines");
    const sliderBetaBundling = document.querySelector("#slider-beta-bundling");
    const sliderLineWidth = document.querySelector("#slider-line-width");

    function updateMinSize(minSize) {
        const valueDuplicatedLines =
            document.querySelector("#value-duplicated-lines");

        const maxSize = storeDynamic.get("max_duplicated_lines");
        const steps = stepsHistogram;
        const size = Number(minSize);

        const bin = sizeToBin(size, maxSize, steps);

        valueDuplicatedLines.textContent = Math.round(size);

        sliderDuplicatedLines.value = size;

        for (let i = 0; i < steps; i++) {
            const element = document.querySelector(
                `[data-histogram-duplicated-lines="${i}"]`
            );

            if (!element)
                continue;

            element.classList.toggle("active", i <= bin);
        }
    }

    function updateRadialBeta(betaBundling) {
        const valueBetaBundling = document.querySelector("#value-beta-bundling");
        valueBetaBundling.textContent = betaBundling.toFixed(2);

        sliderBetaBundling.value = betaBundling * 100;
    }

    function updateMaxDuplicatedLines(maxDuplicatedLines) {
        if (maxDuplicatedLines == undefined)
            return;

        const valueMaxDuplicatedLines = document.querySelector("#value-max-duplicated-lines");
        valueMaxDuplicatedLines.textContent = maxDuplicatedLines;
        sliderDuplicatedLines.setAttribute("max", maxDuplicatedLines);

        const valueLegendMaxDuplicatedLines = document.querySelector("#value-legend-max-duplicated-lines");
        valueLegendMaxDuplicatedLines.textContent = maxDuplicatedLines;

        sliderDuplicatedLines.setAttribute(
            "step",
            Math.floor((maxDuplicatedLines - storeDynamic.get("min_duplicated_lines")) / stepsHistogram) - 1
        )

        drawLegendDuplicatedLines();
    }

    function updateLineWidth(lineWidth) {
        if (lineWidth == undefined)
            return;

        const valueLineWidth = document.querySelector("#value-line-width");
        valueLineWidth.textContent = lineWidth;
    }

    function drawLegendDuplicatedLines() {
        if (storeDynamic.get("min_duplicated_lines") == undefined)
            return;
        if (storeDynamic.get("max_duplicated_lines") == undefined)
            return;

        const legend = document.querySelector("#legend");
        legend.innerHTML = "";

        const colorScale = colorScaleFunc(
            [0, 1],
            [store.get("start_color"), store.get("end_color")]
        );

        for (let i = 0; i < 1; i += 0.25) {
            const element = document.createElement("i");
            element.style.background = objectToRgba(colorScale(i));
            element.style.flex = 1;
            element.style.opacity = 1.0;
            legend.appendChild(element);
        }
    }

    function drawFolderHierarchy(folderHierarchy) {
        const valueFolderHierarchy = document.querySelector("#folder-hierarchy");
        valueFolderHierarchy.textContent = folderHierarchy.join(" / ") + " /";
    }

    function drawHistogramDuplicateLines() {
        const max = storeDynamic.get("max_duplicated_lines");
        const duplicatedLinesHistogram = storeDynamic.get("duplicated_lines_histogram");

        const histogramDuplicatedLines = document.querySelector("#histogram-duplicated-lines");

        for (let i = 0; i < stepsHistogram; i += 1) {
            const element = document.querySelector(`[data-histogram-duplicated-lines="${i}"]`);
            if (!element) {
                const element = document.createElement("i");
                element.style.flex = 1;
                element.dataset.histogramDuplicatedLines = `${i}`
                histogramDuplicatedLines.appendChild(element);
            }
            if (duplicatedLinesHistogram)  {
                const value = duplicatedLinesHistogram[i];
                element.style.height = `${max ? (Math.log10(value + 1) / Math.log10(max + 1)) * 100 : 0}%`;
            }
        }
    }

    sliderDuplicatedLines.addEventListener("mousedown", () =>
        storeDynamic.set({ in_interaction: true })
    )

    sliderDuplicatedLines.addEventListener("input", event =>
        storeDynamic.set({ min_size: event.target.value })
    );

    sliderDuplicatedLines.addEventListener("mouseup", () =>
        storeDynamic.set({ in_interaction: false })
    );

    sliderBetaBundling.addEventListener("mousedown", () =>
        storeDynamic.set({ in_interaction: true })
    );

    sliderBetaBundling.addEventListener("input", event =>
        storeDynamic.set({ radial_beta: Math.min(Math.max((event.target.value / 100), 0.0), 1.0) })
    );

    sliderBetaBundling.addEventListener("mouseup", () =>
        storeDynamic.set({ in_interaction: false })
    );

    sliderLineWidth.addEventListener("mousedown", () =>
        storeDynamic.set({ in_interaction: true })
    );

    sliderLineWidth.addEventListener("input", event =>
        storeDynamic.set({ line_width: event.target.value / 100 })
    );

    sliderLineWidth.addEventListener("mouseup", () =>
        storeDynamic.set({ in_interaction: false })
    );

    storeDynamic.subscribe((s, prev) => {
        if (s.min_size !== prev.min_size) updateMinSize(s.min_size);
        if (s.radial_beta !== prev.radial_beta) updateRadialBeta(s.radial_beta);
        if (s.max_duplicated_lines !== prev.max_duplicated_lines) updateMaxDuplicatedLines(s.max_duplicated_lines);
        if (s.line_width !== prev.line_width) updateLineWidth(s.line_width);
        if (s.folder_hierarchy.length !== prev.folder_hierarchy.length) drawFolderHierarchy(s.folder_hierarchy);
        if (s.duplicated_lines_histogram !== prev.duplicated_lines_histogram) drawHistogramDuplicateLines();
    });

    updateMinSize(storeDynamic.get("min_size"));
    updateRadialBeta(storeDynamic.get("radial_beta"));
    updateMaxDuplicatedLines(storeDynamic.get("max_duplicated_lines"));
    updateLineWidth(storeDynamic.get("line_width"));

    drawLegendDuplicatedLines();
    drawFolderHierarchy(storeDynamic.get("folder_hierarchy"));
    drawHistogramDuplicateLines();
})();
