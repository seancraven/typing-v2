import { LoaderFunctionArgs, redirect } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import { getSession, getUserIdChecked } from "~/sessions";

export async function loader({ request }: LoaderFunctionArgs) {
  const session = await getSession(request.headers.get("Cookie"));
  const userId = getUserIdChecked(session);
  return userId;
}

export default function Stats() {
  const userId = useLoaderData<typeof loader>();
  return <div> {userId}</div>;
}
