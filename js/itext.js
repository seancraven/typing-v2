var TextEntry = /** @class */ (function () {
    function TextEntry(html) {
        var _this = this;
        this.html = html;
        this.start_state = function () {
            _this.current_char = _this.html.innerHTML[0];
            var _a = replaceCharWithSpan(_this.html.innerHTML, 0, _this.html.innerHTML[0], "text-grey-300 bg-sky-200"), new_txt = _a[0], new_start = _a[1], new_end = _a[2];
            _this.html.innerHTML = new_txt;
            _this.span_end = new_end;
            _this.span_start = new_start;
            console.assert(_this.html.innerHTML[_this.span_end] == ">", "Break in start", new_txt[new_end]);
        };
        /**
         * update_state
         */
        this.update_state = function (ev) {
            var _a;
            ev.preventDefault();
            var color;
            if (ev.key == _this.current_char) {
                color = "text-green-200";
            }
            else {
                color = "text-red-500";
            }
            console.assert(_this.html.innerHTML[_this.span_end] == ">", "Break in start", _this.html.innerHTML[_this.span_end]);
            var _b = replaceSpanWithSpan(_this.html.innerHTML, _this.span_start, _this.span_end, ev.key, color), new_txt = _b[0], new_start = _b[1], new_end = _b[2];
            console.assert(new_txt[new_end] == ">", "Break after replace span with span");
            _a = replaceCharWithSpan(new_txt, new_end + 1, new_txt[new_end + 1], "text-grey-300 bg-sky-200"), new_txt = _a[0], new_start = _a[1], new_end = _a[2];
            _this.html.innerHTML = new_txt;
            _this.span_start = new_start;
            _this.span_end = new_end;
            console.assert(_this.html.innerHTML[_this.span_end] == ">", "Break after replace char with span");
        };
        this.n = 0;
        this.span_start = 0;
        this.span_end = 0;
        this.html = html;
        this.seen_start_ends = new Array();
    }
    return TextEntry;
}());
function replaceCharWithSpan(string_, index, char_to_replace, color) {
    var replacement_string = '<span class = "' + color + '">' + char_to_replace + "</span>";
    var new_n = index + replacement_string.length - 1;
    var updated_string = string_.substring(0, index) +
        replacement_string +
        string_.substring(index + 1);
    return [updated_string, index, new_n];
}
function replaceSpanWithSpan(string_, index_start, index_end, char_to_replace, color) {
    var replacement_string = '<span class = "' + color + '">' + char_to_replace + "</span>";
    var new_n = index_start + replacement_string.length - 1;
    var updated_string = string_.substring(0, index_start) +
        replacement_string +
        string_.substring(index_end - 1);
    return [updated_string, index_start, new_n];
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
text_entry.start_state();
document.addEventListener("keypress", text_entry.update_state);
