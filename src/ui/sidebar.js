import { store } from "../store.js"
import { colorScaleFunc, objectToRgba } from "../color.js"
import { sizeToBin } from "../data.js"

(() => {
    const stepsHistogram = store.get("steps_histogram");

    const sliderDuplicatedLines = document.querySelector("#slider-duplicated-lines");
    const sliderBetaBundling = document.querySelector("#slider-beta-bundling");

    function updateMinSize(minSize) {
        const valueDuplicatedLines =
            document.querySelector("#value-duplicated-lines");

        const maxSize = store.get("max_duplicated_lines");
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
            Math.floor((maxDuplicatedLines - store.get("min_duplicated_lines")) / stepsHistogram) - 1
        )

        drawLegendDuplicatedLines();
    }

    function drawLegendDuplicatedLines() {
        if (store.get("min_duplicated_lines") == undefined)
            return;
        if (store.get("max_duplicated_lines") == undefined)
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
        const max = store.get("max_duplicated_lines");
        const duplicatedLinesHistogram = store.get("duplicated_lines_histogram");

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
        store.set({ in_interaction: true })
    )

    sliderDuplicatedLines.addEventListener("input", event =>
        store.set({ min_size: event.target.value })
    );

    sliderDuplicatedLines.addEventListener("mouseup", () =>
        store.set({ in_interaction: false })
    )

    sliderBetaBundling.addEventListener("mousedown", () =>
        store.set({ in_interaction: true })
    )

    sliderBetaBundling.addEventListener("input", event =>
        store.set({ radial_beta: Math.min(Math.max((event.target.value / 100), 0.0), 1.0) })
    );

    sliderBetaBundling.addEventListener("mouseup", () =>
        store.set({ in_interaction: false })
    )

    store.subscribe((s, prev) => {
        if (s.min_size !== prev.min_size) updateMinSize(s.min_size);
        if (s.radial_beta !== prev.radial_beta) updateRadialBeta(s.radial_beta);
        if (s.max_duplicated_lines !== prev.max_duplicated_lines) updateMaxDuplicatedLines(s.max_duplicated_lines);
        if (s.folder_hierarchy.length !== prev.folder_hierarchy.length) drawFolderHierarchy(s.folder_hierarchy);
        if (s.duplicated_lines_histogram !== prev.duplicated_lines_histogram) drawHistogramDuplicateLines();
    });

    updateMinSize(store.get("min_size"));
    updateRadialBeta(store.get("radial_beta"));
    updateMaxDuplicatedLines(store.get("max_duplicated_lines"));

    drawLegendDuplicatedLines();
    drawFolderHierarchy(store.get("folder_hierarchy"));
    drawHistogramDuplicateLines();
})();
