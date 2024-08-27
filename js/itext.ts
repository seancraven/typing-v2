const no_col = "bg-white text-gray-900";
const right_col = "text-green-200";
const wrong_col = "text-red-200";
const next_col = "bg-sky-200 text-gray-900";
class TextEntry {
  private n: number;
  constructor(public html: HTMLElement) {
    this.n = 0;
    this.html = html;
    this.spanify();
    colorSpan(this.html, this.html.children[0], next_col);
  }

  /**
   * update_state
   */
  update_state = (ev: KeyboardEvent) => {
    ev.preventDefault();
    this.update_forward(ev);
  };
  update_forward = (ev: KeyboardEvent) => {
    let color: string;
    let current_char = this.html.children[this.n].innerHTML;
    if (ev.key == current_char) {
      color = right_col;
    } else {
      color = wrong_col;
    }
    colorSpan(this.html, this.html.children[this.n], color);
    this.n++;
    if (this.n == this.html.children.length) {
      document.removeEventListener("keydown", this.update_state);
      return;
    }
    colorSpan(this.html, this.html.children[this.n], next_col);
  };
  update_backward = (ev: KeyboardEvent) => {
    if (ev.key != "Backspace") {
      return;
    }
    if (this.n == 0) {
      return;
    }
    colorSpan(this.html, this.html.children[this.n], no_col);
    this.html.children[this.n];
    console.log(this.n);
    this.n--;
    colorSpan(this.html, this.html.children[this.n], next_col);
  };
  spanify = () => {
    var new_text = new Array();
    var char: string;
    for (let i = 0; i < this.html.innerHTML.length; i++) {
      char = this.html.innerHTML[i];
      new_text.push(`<span class=${no_col}>` + char + "</span>");
    }
    this.html.innerHTML = new_text.join("");
  };
}

function colorSpan(parent: Element, span: Element, color: string) {
  let char = span.innerHTML;

  let new_span = document.createElement("span");
  new_span.className = color;
  new_span.innerHTML = char;
  parent.replaceChild(new_span, span);
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
document.addEventListener("keypress", text_entry.update_state);
document.addEventListener("keydown", text_entry.update_backward);
