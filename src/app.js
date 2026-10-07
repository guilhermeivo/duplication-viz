import { status, StatusType } from "#src/ui/status.js"

import { ProtocolTasks, ProtocolEvents } from "#worker/protocol.js";

import { store, storeDynamic } from "#src/store.js"

import RendererWorker from "#worker/renderer.worker.js?worker";

export default function main(canvas) {
    let folders = [];

    // const url = new URL("./worker/renderer.worker.js", import.meta.url);
    // const worker = new Worker(
    //     url, { type: "module" }
    // );
    const worker = new RendererWorker();

    worker.onmessage = (event) => {
        const r = event.data;

        switch (r.type) {
            case ProtocolEvents.READY:
                status.loadingEnd();
                status.disable();
                paintOverlay();
                break;

            case ProtocolEvents.DYNAMIC_UPDATED:
                storeDynamic.set(r.dynamic);
                break;

            case ProtocolEvents.OVERLAY_UPDATE:
                folders = r.folders;
                break;

            case ProtocolEvents.PROGRESS:
                status.loading();
                break;

            case ProtocolEvents.ERROR:
                status.set(r.message, { type: StatusType.ERROR });
                status.loadingEnd();
                break;
        }
    };

    const offscreenCanvas = canvas.transferControlToOffscreen();

    worker.postMessage({
        type: ProtocolTasks.INITIALIZE,

        canvas: offscreenCanvas,
        dpr: window.devicePixelRatio || 1,

        config: store.get(),
        dynamic: storeDynamic.get(),
    }, [offscreenCanvas]);

    function paint(props = {}) {
        const { selected, isZoomed = false } = props;

        storeDynamic.set({ is_zoomed: isZoomed });

        worker.postMessage({
            type: ProtocolTasks.RENDER,
            config: store.get(),
            dynamic: storeDynamic.get(),
            selected,
            zoomed: overlay.zoomed ? overlay.zoomed.id : null
        });
    }

    function paintOverlay() {
        if (!store.get("show_folders") || !storeDynamic.get("half_extent") || !folders.length)
            return;

        const overlay = document.querySelector("#overlay");
        overlay.create({
            canvas,
            onPaint: async (props) => {
                if (props.isZoomed && overlay.zoomed != null) {
                    const f = [...storeDynamic.get("folder_hierarchy")];
                    f.push(
                        ...overlay.zoomed.file
                            .replace(f.slice(1).join("/"), "")
                            .replace(/^\//, "")
                            .split("/")
                    );
                    storeDynamic.set({ folder_hierarchy: f });
                }
                paint(props);
                paintOverlay();
            }
        });
        overlay.clean();
        overlay.draw({
            folders,
            halfExtent: storeDynamic.get("half_extent"),
        });
    }

    let lastSubscribe = false;
    storeDynamic.subscribe(async (s, prev) => {
        if (
            s.min_size !== prev.min_size ||
            s.radial_beta !== prev.radial_beta
        ) {
            lastSubscribe = true;
        }

        if (storeDynamic.get("in_interaction"))
            return;
        
        if (!lastSubscribe)
            return;
        lastSubscribe = false;

        paint();
        paintOverlay();
    });

    return true;
}