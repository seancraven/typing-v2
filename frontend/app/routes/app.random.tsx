import { LoaderFunctionArgs, redirect } from "react-router";

export async function loader() {
  const resp = await fetch(`${process.env.BE_URL}/random`);
  const topic = await resp.json();

  return redirect(`/app/progress/${topic.topic_id}/0`);
}
