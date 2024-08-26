var start_time = new Date().getTime();
console.log("Timer is a go!");
setInterval(() => {
  var cur_time = new Date().getTime();
  var delta = cur_time - start_time;
  var minutes = Math.floor((delta % (1000 * 60 * 60)) / (1000 * 60));
  var seconds = Math.floor((delta % (1000 * 60)) / 1000);
  var doc = document.getElementById("timer");
  if (!!doc) {
    doc.innerHTML = "Elapsed Time: " + minutes + ":" + seconds;
  } else {
    console.log("Oh no I cant find element: timer");
  }
}, 10);
