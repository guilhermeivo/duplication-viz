export function createStore(initial) {
    let state = initial;
    const listeners = new Set();

    return {
        get: (k) => {
            if (arguments.length == 1 && k != undefined) {
                if (!Object.keys(state).includes(k))
                    return undefined;

                return state[k];
            }

            return state;
        },

        set(patch) {
            const next = { ...state, ...patch };

            const haveChanges = Object.keys(patch)
                .every(
                    k => Object.is(state[k], next[k]) && state[k] === patch[k]
                );

            if (haveChanges)
                return;

            const prev = state;
            state = next;
            
            listeners.forEach(fn => fn(state, prev));
        },
        
        subscribe(fn) {
            listeners.add(fn);
            return () => listeners.delete(fn); 
        }
    };
}

export const store = createStore({
    // sidebar
    in_interaction: false,
    folder_hierarchy: [ "kernel" ],

    // app
    radial_beta: 0.9,
    min_size: 0,

    min_duplicated_lines: 0,
    max_duplicated_lines: undefined,

    scale: 2,
    show_folders: false,
    method: "radial",
    square_radius: 0,

    start_color: { r: 0.03, g: 0.18, b: 0.87, alpha: 0.01 },
    end_color: { r: 0.03, g: 0.18, b: 0.42, alpha: 0.50 },
    
    depth: 0,
    arc_width: 1.5,
    min_arc_length: 2,
    dim_alpha: 0.0,

    context_type: "2d"
});