export async function action({ request }) {
  console.log("Hit the loader");
  console.log(request);
  fetch(`${process.env.BE_URL}/json`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ your: "mum" }),
  });
}
