import { useFetcher, Link, useNavigate, useLoaderData } from "react-router";
import { action } from "~/routes/app.login";
import { useEffect } from "react";
import { loader } from "~/routes/api.username";
type Fields = {
  header_text: string;
  destination: string;
  alternate: string;
  alternate_text: string;
  button_text: string;
  success_redirect: string;
};
function getLoginFields(): Fields {
  return {
    header_text: "Sign in to your account",
    destination: "/app/login",
    alternate: "/app/register",
    alternate_text: "Sign up",
    button_text: "Sign in",
    success_redirect: "/app/progress",
  };
}
function getRegisterFields(): Fields {
  return {
    header_text: "Sign up for ChadType",
    destination: "/app/register",
    alternate: "/app/login",
    alternate_text: "Sign in",
    button_text: "Sign up",
    success_redirect: "/app/login",
  };
}

export default function LoginWidget({ isLogin }: { isLogin: boolean }) {
  const fetcher = useFetcher<typeof action>();
  const fields = isLogin ? getLoginFields() : getRegisterFields();
  return (
    <section className="z-30 w-full backdrop-blur-lg backdrop-filter">
      <div className="mx-auto flex flex-col items-center justify-center px-6 py-8 md:h-full lg:py-0">
        <div className="w-full rounded-lg bg-white shadow sm:max-w-md md:mt-0 xl:p-0 dark:border dark:border-gray-700 dark:bg-gray-800">
          <div className="space-y-4 p-6 sm:p-8 md:space-y-6">
            <h1 className="text-xl font-bold leading-tight tracking-tight text-gray-900 md:text-2xl dark:text-white">
              {fields.header_text}
            </h1>
            <fetcher.Form
              className="space-y-4 md:space-y-6"
              action={fields.destination}
              method="post"
            >
              {fetcher.state === "submitting" ? (
                <SubmittingState />
              ) : fetcher.state === "idle" && fetcher.data?.success ? (
                <SuccessResponse
                  msg={fetcher.data.msg}
                  success_redirect={fields.success_redirect}
                />
              ) : (
                <DefaultState
                  fields={fields}
                  isLogin={isLogin}
                  error={fetcher.data?.msg}
                />
              )}
            </fetcher.Form>
          </div>
        </div>
      </div>
    </section>
  );
}

function SubmittingState() {
  return (
    <div className="flex items-center justify-center py-4">
      <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary-600"></div>
      <p className="ml-2">Processing...</p>
    </div>
  );
}

function SuccessResponse({
  msg,
  success_redirect,
}: {
  msg: string;
  success_redirect: string;
}) {
  const navigate = useNavigate();
  useEffect(() => {
    setTimeout(() => navigate(success_redirect), 500);
  });
  return <div className="rounded bg-green-100 p-4 text-green-800">{msg}</div>;
}

function DefaultState({
  isLogin,
  fields,
  error,
}: {
  isLogin: boolean;
  fields: Fields;
  error?: string;
}) {
  const username = useLoaderData<typeof loader>();
  console.log(`${error}`);
  console.log("Found username", username);
  return (
    <>
      {!isLogin ? (
        <div>
          <label
            htmlFor="email"
            className="mb-2 block text-sm font-medium text-gray-900 dark:text-white"
          >
            Your email
          </label>
          <input
            type="email"
            name="email"
            id="email"
            className="block w-full rounded-lg border border-gray-300 bg-gray-50 p-2.5 text-gray-900 focus:border-primary-600 focus:ring-primary-600 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 dark:focus:border-blue-500 dark:focus:ring-blue-500"
            placeholder="chad@type.com"
            required
          />
        </div>
      ) : null}
      <div>
        <label
          htmlFor="username"
          className="mb-2 block text-sm font-medium text-gray-900 dark:text-white"
        >
          Your username
        </label>
        <input
          type="text"
          name="username"
          id="username"
          className="block w-full rounded-lg border border-gray-300 bg-gray-50 p-2.5 text-gray-900 focus:border-primary-600 focus:ring-primary-600 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 dark:focus:border-blue-500 dark:focus:ring-blue-500"
          placeholder="Chad"
          required
          defaultValue={username ? username : ""}
        />
      </div>
      <div>
        <label
          htmlFor="password"
          className="mb-2 block text-sm font-medium text-gray-900 dark:text-white"
        >
          Password
        </label>
        <input
          type="password"
          name="password"
          id="password"
          placeholder="••••••••"
          className="block w-full rounded-lg border border-gray-300 bg-gray-50 p-2.5 text-gray-900 focus:border-primary-600 focus:ring-primary-600 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 dark:focus:border-blue-500 dark:focus:ring-blue-500"
          required
        />
      </div>
      <div className="flex items-center justify-between">
        <div className="flex items-start">
          <div className="flex h-5 items-center">
            <input
              id="remember"
              aria-describedby="remember"
              type="checkbox"
              className="focus:ring-3 h-4 w-4 rounded border border-gray-300 bg-gray-50 focus:ring-primary-300 dark:border-gray-600 dark:bg-gray-700 dark:ring-offset-gray-800 dark:focus:ring-primary-600"
            />
          </div>
          <div className="ml-3 text-sm">
            <label
              htmlFor="remember"
              className="text-gray-500 dark:text-gray-300"
            >
              Remember me
            </label>
          </div>
        </div>
        {isLogin ? (
          <Link
            to="/reset"
            className="text-sm font-medium text-primary-600 hover:underline dark:text-primary-500"
          >
            Forgot password?
          </Link>
        ) : null}
      </div>
      <button
        type="submit"
        className="w-full rounded-lg bg-primary-600 px-5 py-2.5 text-center text-sm font-medium text-white hover:bg-primary-700 focus:outline-none focus:ring-4 focus:ring-primary-300 dark:bg-primary-600 dark:hover:bg-primary-700 dark:focus:ring-primary-800"
      >
        Submit
      </button>
      {error && <p> {error}</p>}
      <p className="text-sm font-light text-gray-500 dark:text-gray-400">
        Don&apos;t have an account yet?{" "}
        <Link
          to={fields.alternate}
          className="font-medium text-primary-600 hover:underline dark:text-primary-500"
        >
          {fields.alternate_text}
        </Link>
      </p>
    </>
  );
}
