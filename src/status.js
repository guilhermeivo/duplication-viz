export const StatusType = Object.freeze({
  INFO: 'INFO',
  ERROR: 'ERROR',
});

export const status = {
    element: null,
    body: null,

    init({ element, body } = { }) {
        this.element = element;
        this.body = body;
    },

    set(text, options = {}) {
        if (this.element)
            this.element.classList.remove("error");

        if (this.element) {
            if (options.type == StatusType.ERROR) {
                this.element.classList.add("error");
                text = `Error:\n\n${text}`;
            }
            this.element.textContent = text;
        } else {
            if (options.type == StatusType.INFO) {
                console.log(text);
            } else {
                console.error(text);
            }
        }
    },

    disable() {
        if (this.element)
            this.element.style.opacity = 0.0;
    },

    loading() {
        this.body.style.cursor = "wait";
    },

    loadingEnd() {
        this.body.style.cursor = "auto";
    }
}