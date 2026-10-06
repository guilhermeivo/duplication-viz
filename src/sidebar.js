import { store } from "./store.js"
import { colorScaleFunc, objectToRgba } from "./color.js"

(() => {
    const sliderDuplicatedLines = document.querySelector("#slider-duplicated-lines");
    const sliderBetaBundling = document.querySelector("#slider-beta-bundling");

    function updateMinSize(minSize) {
        const valueDuplicatedLines = document.querySelector("#value-duplicated-lines");
        valueDuplicatedLines.textContent = minSize;

        sliderDuplicatedLines.value = minSize;
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
            legend.appendChild(element);
        }
    }

    function drawFolderHierarchy(folderHierarchy) {
        const valueFolderHierarchy = document.querySelector("#folder-hierarchy");
        valueFolderHierarchy.textContent = folderHierarchy.join(" / ") + " /";
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
    });

    updateMinSize(store.get("min_size"));
    updateRadialBeta(store.get("radial_beta"));
    updateMaxDuplicatedLines(store.get("max_duplicated_lines"));

    drawLegendDuplicatedLines();
    drawFolderHierarchy(store.get("folder_hierarchy"));
})();
