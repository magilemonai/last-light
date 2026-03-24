// ═══════════════════════════════════════════════════════════════
// LAST LIGHT — Input System
// ═══════════════════════════════════════════════════════════════

let clickHandler = null;
let W = window.innerWidth;
let H = window.innerHeight;

export const input = {
    mx: W / 2,
    my: H / 4,
    mouseDown: false,
    keys: {},
    touched: false,
    touchCount: 0,

    init(canvas) {
        canvas.addEventListener('mousemove', e => { this.mx = e.clientX; this.my = e.clientY; });
        canvas.addEventListener('mousedown', e => { this.mouseDown = true; this._fireClick(); });
        canvas.addEventListener('mouseup', e => { this.mouseDown = false; });

        window.addEventListener('keydown', e => {
            this.keys[e.code] = true;
            if (e.code === 'Enter' || e.code === 'Space') this._fireClick();
        });
        window.addEventListener('keyup', e => { this.keys[e.code] = false; });

        canvas.addEventListener('touchstart', e => {
            e.preventDefault();
            this.touched = true;
            this.touchCount = e.touches.length;
            const t = e.touches[0];
            this.mx = t.clientX; this.my = t.clientY;
            this.mouseDown = true;
            this._fireClick();
        }, { passive: false });

        canvas.addEventListener('touchmove', e => {
            e.preventDefault();
            const t = e.touches[0];
            this.mx = t.clientX; this.my = t.clientY;
        }, { passive: false });

        canvas.addEventListener('touchend', e => {
            e.preventDefault();
            this.mouseDown = false;
            this.touchCount = e.touches.length;
        }, { passive: false });

        window.addEventListener('blur', () => { this.keys = {}; this.mouseDown = false; });
    },

    onClick(fn) {
        clickHandler = fn;
    },

    _fireClick() {
        if (clickHandler) clickHandler();
    },

    updateDimensions(w, h) {
        W = w; H = h;
    },

    get overdrive() {
        return this.keys['Space'] || this.touchCount >= 2;
    },
    get fogHornKey() { return this.keys['KeyF']; },
    get spyglassKey() { return this.keys['KeyG']; },
    get pauseKey() { return this.keys['Escape']; },
};
