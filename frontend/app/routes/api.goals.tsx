import { LoaderFunctionArgs } from "react-router";
import { getCookieSession } from "~/sessions";

export async function action({ request }: LoaderFunctionArgs) {
  console.debug("goals action called");
  const session = await getCookieSession(request);
  const userId = session.get("userId");
  const formData = await request.formData();
  const accuracy = formData.get("accuracy")?.toString();
  const wpm = formData.get("wpm")?.toString();
  const time_spent_min = formData.get("practice_time_min")?.toString();
  if (!accuracy || !wpm || !time_spent_min) {
    return { error: "Invalid form data" };
  }
  const time_spent = Number(time_spent_min) * 60;

  const json = {
    accuracy: Number(accuracy),
    wpm: Number(wpm),
    time_spent: time_spent,
  };

  const resp = await fetch(`${process.env.BE_URL}/${userId}/goals`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(json),
  });
  console.info(json);
  console.info(resp.status, resp.statusText);

  return null;
}
