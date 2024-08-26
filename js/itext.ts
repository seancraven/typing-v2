class TextEntry {
  private n: number;
  private hidden_char: string;
  private span_start: number;
  private span_end: number;
  private span_start_end: [[number, number]];
  constructor(public html: HTMLElement) {
    this.n = 0;
    this.span_start = 0;
    this.span_end = 0;
    this.html = html;
  }
  start_state = () => {
    [this.html.innerHTML, this.span_start, this.span_end] = replaceCharWithSpan(
      this.html.innerHTML,
      0,
      this.html.innerHTML[0],
      "text-blue-300",
    );
  };
  /**
   * update_state
   */
  update_state = (ev: KeyboardEvent) => {
    console.log("key hit: " + ev.key);
    let text = this.html.innerHTML;
    [this.html.innerHTML, this.span_start, this.span_end] = replaceSpanWithSpan(
      text,
      this.span_start,
      this.span_end,
      ev.key,
      "text-red-500",
    );
    [this.html.innerHTML, this.span_start, this.span_end] = replaceCharWithSpan(
      this.html.innerHTML,
      this.span_end,
      this.html.innerHTML[this.span_end],
      "text-blue-300",
    );
  };
}
function replaceChar(string_: string, index: number, char_to_replace: string) {
  let updatedString =
    string_.substring(0, index) +
    char_to_replace +
    string_.substring(index + 1);
  return updatedString;
}
function replaceCharWithSpan(
  string_: string,
  index: number,
  char_to_replace: string,
  color: string,
): [string, number, number] {
  console.log("start: " + string_.substring(0, index));
  console.log("end: " + string_.substring(index + 1, index + 30));
  var replacement_string =
    "<span class = " + color + ">" + char_to_replace + "</span>";
  var new_n = index + replacement_string.length;
  var updated_string =
    string_.substring(0, index) +
    replacement_string +
    string_.substring(index + 1);
  return [updated_string, index, new_n];
}
function replaceSpanWithSpan(
  string_: string,
  index_start: number,
  index_end: number,
  char_to_replace: string,
  color: string,
): [string, number, number] {
  var replacement_string =
    "<span class = " + color + ">" + char_to_replace + "</span>";
  var new_n = index_start + replacement_string.length;
  var updated_string =
    string_.substring(0, index_start) +
    replacement_string +
    string_.substring(index_end);
  return [updated_string, index_start, new_n];
}
var p = document.getElementById("input_text");
if (!p) {
  console.log("Doesn't exist");
  throw new Error("fucked");
} else {
  var doc = p;
}
console.log("Found input text");
var n = 0;
var text_entry = new TextEntry(p);
text_entry.start_state();

document.addEventListener("keypress", text_entry.update_state);
