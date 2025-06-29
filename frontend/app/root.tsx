import {
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  useNavigate,
  useParams,
  useFetcher,
  Link,
  useLocation,
} from "react-router";
import type { LinksFunction } from "react-router";
import { ThemeToggle } from "~/components/ThemeToggle";
import { useEffect } from "react";
import stylesheet from "~/tailwind.css?url";
import { loader as apiLoder } from "~/routes/api.user";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./components/ui/dropdown-menu";

export const links: LinksFunction = () => [
  { rel: "stylesheet", href: stylesheet },
];

// test
export function Layout({ children }: { children: React.ReactNode }) {
  const loc = useLocation();
  const fixedHeight = loc.pathname.includes("/app/progress");
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <Links />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  const theme = localStorage.getItem('theme') || 'system';
                  const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
                  const effectiveTheme = theme === 'system' ? systemTheme : theme;
                  document.documentElement.classList.toggle('dark', effectiveTheme === 'dark');
                } catch (e) {
                  document.documentElement.classList.add('dark');
                }
              })();
            `,
          }}
        />
      </head>
      <body>
        <ScrollRestoration />
        <Scripts />
        <div
          className={`min-w-screen min-h-screen w-full ${fixedHeight ? "h-screen overflow-hidden" : "h-full"} bg-background`}
        >
          <nav className="z-50 border-gray-200 bg-primary">
            <div className="mx-auto flex max-w-screen-xl flex-wrap items-center justify-between p-4">
              <Link
                className="flex items-center space-x-3 rtl:space-x-reverse"
                to="/app/random"
              >
                <img src="/image.webp" className="h-8" alt="Flowbite Logo" />
                <span className="self-center whitespace-nowrap text-2xl font-semibold text-white">
                  ProgramType
                </span>
              </Link>
              <div className="relative flex items-center space-x-3 md:order-2 md:space-x-0 rtl:space-x-reverse">
                <ThemeToggle />
                <NavDropDown />
              </div>
              <div
                className="hidden w-full items-center justify-between md:order-1 md:flex md:w-auto"
                id="navbar-user"
              ></div>
            </div>
          </nav>
          {children}
        </div>
      </body>
    </html>
  );
}

export default function App() {
  return <Outlet />;
}

function NavDropDown() {
  const fetcher = useFetcher<typeof apiLoder>();
  useEffect(() => {
    fetcher.load("/api/user");
  }, []);
  const navigate = useNavigate();
  return (
    <div className="z-50">
      <DropdownMenu>
        <DropdownMenuTrigger>
          <div>
            <span className="sr-only">Open user menu</span>
            <img
              className={`h-9 w-9 rounded-full ${fetcher.data?.userId ? "" : "hidden"}`}
              src="/image.webp"
              alt="your face"
            />
          </div>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuLabel>{fetcher.data?.userName}</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => navigate("/app/home")}>
            Home
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => navigate("/logout")}>
            Log Out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
export function ErrorBoundary() {
  return (
    <div className="container mx-auto h-full w-full items-center justify-center">
      <h1 className="m-auto flex h-full items-center justify-center p-5 text-5xl text-red-700">
        Internal Error
      </h1>
      <Link to="/">Go Home</Link>
    </div>
  );
}
