import { ProtocolTasks, ProtocolEvents } from "#worker/protocol.js";

import initialize from "#worker/tasks/initialize.js"
import update from "#worker/tasks/update.js"
import render from "#worker/tasks/render.js"

let renderer = null;
let links = null;
let collector = null;
let line = null;
let nodeMap = null;
let root = null;

const label = "Render Visualization";

self.onmessage = async (event) => {
    const message = event.data;

    try {
        const selected = (message.selected == null) ? null : nodeMap.get(message.selected);
        const zoomed = (message.zoomed == null) ? null : nodeMap.get(message.zoomed);

        switch (message.type) {
            case ProtocolTasks.INITIALIZE:
                console.time(label);

                const resInit = await initialize(message);
                ({ renderer, links, collector, line, nodeMap, root } = resInit);

                await render({ renderer, links, collector, line, ...message });

                console.timeEnd(label)

                self.postMessage({
                    type: ProtocolEvents.OVERLAY_UPDATE,
                    folders: resInit.folders
                });

                self.postMessage({
                    type: ProtocolEvents.DYNAMIC_UPDATED,
                    dynamic: message.dynamic
                });

                self.postMessage({
                    type: ProtocolEvents.READY
                });

                break;
            case ProtocolTasks.RENDER:
                console.time(label);

                const resRender = await update({ renderer, collector, tree: zoomed ?? root, ...message });
                ({ links, line } = resRender);

                await render({ renderer, links, collector, line, ...message, selected });

                console.timeEnd(label);

                self.postMessage({
                    type: ProtocolEvents.OVERLAY_UPDATE,
                    folders: resRender.folders
                });

                self.postMessage({
                    type: ProtocolEvents.DYNAMIC_UPDATED,
                    dynamic: message.dynamic
                });

                self.postMessage({
                    type: ProtocolEvents.READY
                });

                break;
        }
    } catch (error) {
        self.postMessage({
            type: ProtocolEvents.ERROR,
            message: error instanceof Error
                ? error.message
                : String(error)
        });
    }
};