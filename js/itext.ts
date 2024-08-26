class TextEntry {
  private n: number;
  private current_char: string;
  private span_start: number;
  private span_end: number;
  private seen_start_ends: [number, number][];
  constructor(public html: HTMLElement) {
    this.n = 0;
    this.span_start = 0;
    this.span_end = 0;
    this.html = html;
    this.seen_start_ends = new Array();
  }
  start_state = () => {
    this.current_char = this.html.innerHTML[0];
    let [new_txt, new_start, new_end] = replaceCharWithSpan(
      this.html.innerHTML,
      0,
      this.html.innerHTML[0],
      "text-grey-300 bg-sky-200",
    );

    this.html.innerHTML = new_txt;
    this.span_end = new_end;
    this.span_start = new_start;
    console.assert(
      this.html.innerHTML[this.span_end] == ">",
      "Break in start",
      new_txt[new_end],
    );
  };
  /**
   * update_state
   */
  update_state = (ev: KeyboardEvent) => {
    ev.preventDefault();
    let color: string;
    if (ev.key == this.current_char) {
      color = "text-green-200";
    } else {
      color = "text-red-500";
    }
    console.assert(
      this.html.innerHTML[this.span_end] == ">",
      "Break in start",
      this.html.innerHTML[this.span_end],
    );

    let [new_txt, new_start, new_end] = replaceSpanWithSpan(
      this.html.innerHTML,
      this.span_start,
      this.span_end,
      ev.key,
      color,
    );
    console.assert(
      new_txt[new_end] == ">",
      "Break after replace span with span",
    );
    [new_txt, new_start, new_end] = replaceCharWithSpan(
      new_txt,
      new_end + 1,
      new_txt[new_end + 1],
      "text-grey-300 bg-sky-200",
    );
    this.html.innerHTML = new_txt;
    this.span_start = new_start;
    this.span_end = new_end;

    console.assert(
      this.html.innerHTML[this.span_end] == ">",
      "Break after replace char with span",
    );
  };
}

function replaceCharWithSpan(
  string_: string,
  index: number,
  char_to_replace: string,
  color: string,
): [string, number, number] {
  var replacement_string =
    '<span class = "' + color + '">' + char_to_replace + "</span>";
  var new_n = index + replacement_string.length - 1;
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
    '<span class = "' + color + '">' + char_to_replace + "</span>";
  var new_n = index_start + replacement_string.length - 1;
  var updated_string =
    string_.substring(0, index_start) +
    replacement_string +
    string_.substring(index_end - 1);

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
