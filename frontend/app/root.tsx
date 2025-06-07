import {
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  useRouteError,
} from "react-router";
import type { LinksFunction } from "react-router";

import stylesheet from "~/tailwind.css?url";
import { NavBar } from "./components/nav";

export const links: LinksFunction = () => [
  { rel: "stylesheet", href: stylesheet },
];

// test
export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <Links />
      </head>
      <body>
        <ScrollRestoration />
        <Scripts />
        {children}
      </body>
    </html>
  );
}

export default function App() {
  return (
    <div className="w-screen">
      <NavBar />
      <Outlet />
    </div>
  );
}
