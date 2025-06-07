import { LoaderFunctionArgs, redirect } from "react-router";
import { getSession, getUserIdChecked } from "~/sessions";

export async function loader({ request }: LoaderFunctionArgs) {
  const session = await getSession(request.headers.get("Cookie"));
  getUserIdChecked(session);
  const resp = await fetch(`${process.env.BE_URL}/random`);
  const topic = await resp.json();

  return redirect(`/app/progress/${topic.topic_id}/0#progress`);
}
