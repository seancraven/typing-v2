import { Link } from "@remix-run/react";
import { useState } from "react";
export function NavBar(props: { setIsLoggedIn: (arg0: boolean) => void }) {
  return (
    <nav className="border-gray-200 bg-primary-800">
      <div className="max-w-screen-xl flex flex-wrap items-center justify-between mx-auto p-4">
        <a className="flex items-center space-x-3 rtl:space-x-reverse" href="/">
          <img src="/image.webp" className="h-8" alt="Flowbite Logo" />
          <span className="self-center text-2xl font-semibold whitespace-nowrap dark:text-white">
            ChadType
          </span>
        </a>
        <div className="flex items-center md:order-2 space-x-3 md:space-x-0 rtl:space-x-reverse relative">
          {<UserButton setIsLoggedIn={props.setIsLoggedIn} />}
        </div>
        <div
          className="items-center justify-between hidden w-full md:flex md:w-auto md:order-1"
          id="navbar-user"
        ></div>
      </div>
    </nav>
  );
}

function NavDropDown(props: {
  setIsLoggedIn: (arg0: boolean) => void;
  setIsVisible: (arg0: boolean) => void;
}) {
  return (
    <div
      className="absolute right-2 top-full text-base list-none bg-white divide-y divide-gray-100 rounded-lg shadow dark:bg-gray-700 dark:divide-gray-600"
      id="user-dropdown"
      onMouseLeave={() => props.setIsVisible(false)}
    >
      <div className="px-4 py-3">
        <span className="block text-sm text-gray-900 dark:text-white">
          Bonnie Green
        </span>
        <span className="block text-sm text-gray-500 truncate dark:text-gray-400">
          name@flowbite.com
        </span>
      </div>
      <ul className="py-2" aria-labelledby="user-menu-button">
        <li>
          <Link
            to="/dashboard"
            className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 dark:text-gray-200 dark:hover:text-white"
          >
            Dashboard
          </Link>
        </li>
        <li>
          <Link
            to="/settings"
            className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 dark:text-gray-200 dark:hover:text-white"
          >
            Settings
          </Link>
        </li>
        <li>
          <Link
            to="/earnings"
            className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 dark:text-gray-200 dark:hover:text-white"
          >
            Earnings
          </Link>
        </li>
        <li>
          <button
            onClick={() => props.setIsLoggedIn(false)}
            className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 dark:text-gray-200 dark:hover:text-white"
          >
            Sign out
          </button>
        </li>
      </ul>
    </div>
  );
}
function UserButton(props: { setIsLoggedIn: (arg0: boolean) => void }) {
  const [isVisible, setIsVisible] = useState(false);
  const toggleVisibility = () => {
    setIsVisible(!isVisible);
  };
  return (
    <div onMouseEnter={() => setIsVisible(true)}>
      <button
        type="button"
        className="flex text-sm bg-primary-800 rounded-full md:me-0 focus:ring-4 focus:ring-gray-300 dark:focus:ring-gray-600"
        id="user-menu-button"
        aria-expanded={isVisible}
        data-dropdown-toggle="user-dropdown"
        data-dropdown-placement="bottom"
      >
        <div>
          <span className="sr-only">Open user menu</span>
          <img className="w-9 h-9 rounded-full" src="/image.webp" />
          {isVisible && (
            <NavDropDown
              setIsLoggedIn={props.setIsLoggedIn}
              setIsVisible={toggleVisibility}
            />
          )}
        </div>
      </button>
    </div>
  );
}
