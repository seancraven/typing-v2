var no_col = "bg-white text-gray-900";
var right_col = "text-green-200";
var wrong_col = "text-red-200";
var next_col = "bg-sky-200 text-gray-900";
var TextEntry = /** @class */ (function () {
    function TextEntry(html) {
        var _this = this;
        this.html = html;
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
            if (_this.n == _this.html.children.length) {
                document.removeEventListener("keydown", _this.update_state);
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
        this.spanify();
        colorSpan(this.html, this.html.children[0], next_col);
    }
    return TextEntry;
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
var text_entry = new TextEntry(p);
document.addEventListener("keypress", text_entry.update_state);
document.addEventListener("keydown", text_entry.update_backward);
