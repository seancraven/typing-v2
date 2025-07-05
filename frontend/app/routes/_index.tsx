import { redirect, Link } from "react-router";
export function loader() {
  return redirect("/app/home");
}

export function ErrorBoundary() {
  return (
    <div className="container mx-auto h-screen w-full items-center justify-center">
      <h1 className="m-auto flex h-full items-center justify-center p-5 text-5xl text-red-800">
        Internal Error
      </h1>
      <Link className="m-auto" to="/">
        Go Home
      </Link>
    </div>
  );
}
