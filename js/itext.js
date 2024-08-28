var no_col = "text-gray-200";
var right_col = "text-gray-400";
var wrong_col = "bg-red-800 text-gray-200 rounded";
var next_col = "bg-violet-800 text-gray-200 rounded";
var TextEntry = /** @class */ (function () {
    function TextEntry(html, timer) {
        var _this = this;
        this.html = html;
        this.timer = timer;
        /**
         * update_state
         */
        this.update_state = function (ev) {
            ev.preventDefault();
            _this.update_forward(ev);
        };
        this.update_forward = function (ev) {
            var color;
            var current_char = _this.html.children[_this.n].innerHTML;
            if (ev.key == current_char) {
                color = right_col;
            }
            else {
                color = wrong_col;
            }
            colorSpan(_this.html, _this.html.children[_this.n], color);
            _this.n++;
            if (_this.n >= _this.html.children.length) {
                document.removeEventListener("keydown", _this.update_state);
                _this.timer.stop();
                return;
            }
            colorSpan(_this.html, _this.html.children[_this.n], next_col);
        };
        this.update_backward = function (ev) {
            if (ev.key != "Backspace") {
                return;
            }
            if (_this.n == 0) {
                return;
            }
            colorSpan(_this.html, _this.html.children[_this.n], no_col);
            _this.html.children[_this.n];
            console.log(_this.n);
            _this.n--;
            colorSpan(_this.html, _this.html.children[_this.n], next_col);
        };
        this.spanify = function () {
            var new_text = new Array();
            var char;
            for (var i = 0; i < _this.html.innerHTML.length; i++) {
                char = _this.html.innerHTML[i];
                new_text.push("<span class=".concat(no_col, ">") + char + "</span>");
            }
            _this.html.innerHTML = new_text.join("");
        };
        this.n = 0;
        this.html = html;
        this.timer = timer;
        this.spanify();
        colorSpan(this.html, this.html.children[0], next_col);
    }
    return TextEntry;
}());
var Timer = /** @class */ (function () {
    function Timer() {
        var _this = this;
        this.tick = function () {
            _this.cur_time = new Date().getTime();
            _this.delta = _this.cur_time - _this.start_time;
            var minutes = Math.floor((_this.delta % (1000 * 60 * 60)) / (1000 * 60));
            var seconds = Math.floor((_this.delta % (1000 * 60)) / 1000);
            var doc = document.getElementById("timer");
            if (!!doc) {
                doc.innerHTML = "Elapsed Time: " + minutes + ":" + seconds;
            }
            else {
                console.log("Oh no I cant find element: timer");
            }
        };
        this.timer = function (ev) {
            _this.start_time = new Date().getTime();
            _this.interval_id = setInterval(_this.tick);
        };
        this.stop = function () {
            clearInterval(_this.interval_id);
            return _this.delta;
        };
    }
    return Timer;
}());
function colorSpan(parent, span, color) {
    var char = span.innerHTML;
    var new_span = document.createElement("span");
    new_span.className = color;
    new_span.innerHTML = char;
    parent.replaceChild(new_span, span);
}
var p = document.getElementById("input_text");
if (!p) {
    console.log("Doesn't exist");
    throw new Error("fucked");
}
else {
    var doc = p;
}
console.log("Found input text");
var n = 0;
var timer = new Timer();
var text_entry = new TextEntry(p, timer);
document.addEventListener("keypress", text_entry.timer.timer, { once: true });
document.addEventListener("keypress", text_entry.update_state);
document.addEventListener("keydown", text_entry.update_backward);
