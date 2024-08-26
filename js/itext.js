var TextEntry = /** @class */ (function () {
    function TextEntry(html) {
        var _this = this;
        this.html = html;
        this.start_state = function () {
            var _a;
            _a = replaceCharWithSpan(_this.html.innerHTML, 0, _this.html.innerHTML[0], "text-blue-300"), _this.html.innerHTML = _a[0], _this.span_start = _a[1], _this.span_end = _a[2];
        };
        /**
         * update_state
         */
        this.update_state = function (ev) {
            var _a, _b;
            console.log("key hit: " + ev.key);
            var text = _this.html.innerHTML;
            _a = replaceSpanWithSpan(text, _this.span_start, _this.span_end, ev.key, "text-red-500"), _this.html.innerHTML = _a[0], _this.span_start = _a[1], _this.span_end = _a[2];
            _b = replaceCharWithSpan(_this.html.innerHTML, _this.span_end, _this.html.innerHTML[_this.span_end], "text-blue-300"), _this.html.innerHTML = _b[0], _this.span_start = _b[1], _this.span_end = _b[2];
        };
        this.n = 0;
        this.span_start = 0;
        this.span_end = 0;
        this.html = html;
    }
    return TextEntry;
}());
function replaceChar(string_, index, char_to_replace) {
    var updatedString = string_.substring(0, index) +
        char_to_replace +
        string_.substring(index + 1);
    return updatedString;
}
function replaceCharWithSpan(string_, index, char_to_replace, color) {
    console.log("start: " + string_.substring(0, index));
    console.log("end: " + string_.substring(index + 1, index + 30));
    var replacement_string = "<span class = " + color + ">" + char_to_replace + "</span>";
    var new_n = index + replacement_string.length;
    var updated_string = string_.substring(0, index) +
        replacement_string +
        string_.substring(index + 1);
    return [updated_string, index, new_n];
}
function replaceSpanWithSpan(string_, index_start, index_end, char_to_replace, color) {
    var replacement_string = "<span class = " + color + ">" + char_to_replace + "</span>";
    var new_n = index_start + replacement_string.length;
    var updated_string = string_.substring(0, index_start) +
        replacement_string +
        string_.substring(index_end);
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
