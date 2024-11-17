import { Link, useNavigate } from "@remix-run/react";
import { useState } from "react";
export function NavBar() {
  return (
    <nav className="border-gray-200 bg-primary-800">
      <div className="mx-auto flex max-w-screen-xl flex-wrap items-center justify-between p-4">
        <a className="flex items-center space-x-3 rtl:space-x-reverse" href="/">
          <img src="/image.webp" className="h-8" alt="Flowbite Logo" />
          <span className="self-center whitespace-nowrap text-2xl font-semibold dark:text-white">
            ChadType
          </span>
        </a>
        <div className="relative flex items-center space-x-3 md:order-2 md:space-x-0 rtl:space-x-reverse">
          {<UserButton />}
        </div>
        <div
          className="hidden w-full items-center justify-between md:order-1 md:flex md:w-auto"
          id="navbar-user"
        ></div>
      </div>
    </nav>
  );
}

function UserButton() {
  const [isVisible, setIsVisible] = useState(false);
  return (
    <div className="z-50" onMouseEnter={() => setIsVisible(true)}>
      <button
        type="button"
        className="flex rounded-full bg-primary-800 text-sm focus:ring-4 focus:ring-gray-300 md:me-0 dark:focus:ring-gray-600"
        id="user-menu-button"
        aria-expanded={isVisible}
        data-dropdown-toggle="user-dropdown"
        data-dropdown-placement="bottom"
      >
        <div>
          <span className="sr-only">Open user menu</span>
          <img
            className="h-9 w-9 rounded-full"
            src="/image.webp"
            alt="your face"
          />
          {isVisible && <NavDropDown setIsVisible={setIsVisible} />}
        </div>
      </button>
    </div>
  );
}
function NavDropDown(props: { setIsVisible: (arg0: boolean) => void }) {
  const nav = useNavigate();
  return (
    <div
      className="absolute right-2 top-full list-none divide-y divide-gray-100 rounded-lg bg-white text-base shadow dark:divide-gray-600 dark:bg-gray-700"
      id="user-dropdown"
      onMouseLeave={() => props.setIsVisible(false)}
    >
      <div className="px-4 py-3">
        <span className="block text-sm text-gray-900 dark:text-white">
          Bonnie Green
        </span>
        <span className="block truncate text-sm text-gray-500 dark:text-gray-400">
          name@flowbite.com
        </span>
      </div>
      <ul className="py-2" aria-labelledby="user-menu-button">
        <li>
          <Link
            to="/dashboard"
            className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-600 dark:hover:text-white"
          >
            Dashboard
          </Link>
        </li>
        <li>
          <Link
            to="/settings"
            className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-600 dark:hover:text-white"
          >
            Settings
          </Link>
        </li>
        <li>
          <Link
            to="/earnings"
            className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-600 dark:hover:text-white"
          >
            Earnings
          </Link>
        </li>
        <li>
          <Link
            to="/logout"
            className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-600 dark:hover:text-white"
          >
            Sign out
          </Link>
        </li>
      </ul>
    </div>
  );
}
