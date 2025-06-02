import type { LoaderFunctionArgs, MetaFunction } from "react-router";
import { Outlet, redirect, useParams } from "react-router";
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
    <div className="p-30 justfy-center bg-grey-900 flex py-10">
      <div className="container mx-auto flex h-screen min-h-[100px] w-screen justify-center p-4 py-10 lg:w-5/12">
        <Outlet />
      </div>
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
