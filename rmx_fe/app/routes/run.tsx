export async function action({ request }) {
  console.log("Hit the loader");
  console.log(request);
  fetch("http://localhost:8080/json", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ your: "mum" }),
  });
}
