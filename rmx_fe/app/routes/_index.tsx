import type { LoaderFunctionArgs, MetaFunction } from "@remix-run/node";
import { Outlet, redirect, useParams } from "@remix-run/react";
import { getSession, getUserIdChecked } from "~/sessions";

export const meta: MetaFunction = () => {
  return [
    { title: "New Remix App" },
    { name: "description", content: "Welcome to Remix!" },
  ];
};

export async function loader({ request }: LoaderFunctionArgs) {
  const session = await getSession(request.headers.get("Cookie"));
  getUserIdChecked(session);

  return redirect("/app/login");
}
export default function Index() {
  return (
    <div>
      <Outlet />
    </div>
  );
}

export function CatchBoundary() {
  const caught = useParams();
  return (
    <div>
      <h1>Caught</h1>
      <p>Status: {caught.status}</p>
      <pre>
        <code>{JSON.stringify(caught.data, null, 2)}</code>
      </pre>
    </div>
  );
}
