import { ActionFunctionArgs, LoaderFunctionArgs, redirect } from "react-router";
import { useLoaderData } from "react-router";
import { User } from "~/api_type";
import LoginWidget from "~/components/login_widget";
import { commitSession, getSession } from "~/sessions";

export async function loader({ request }: LoaderFunctionArgs) {
  const session = await getSession(request.headers.get("Cookie"));
  const isLoggedIn = session.has("userId");
  if (isLoggedIn) {
    return redirect("/app/random");
  }
  return isLoggedIn;
}
export async function action({ request }: ActionFunctionArgs) {
  const data = await request.formData();
  const username = data.get("username");
  if (!username) {
    throw new Error("Login failure no username.");
  }
  const password = data.get("password");
  if (!password) {
    throw new Error("No password");
  }
  const user: User = {
    username: username.toString(),
    password: password.toString(),
    email: "",
  };
  const resp = await fetch(`${process.env.BE_URL}/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(user),
  });
  console.log(resp.status);
  const session = await getSession(request.headers.get("Cookie"));
  // Handle responses.
  switch (resp.status) {
    case 400: {
      session.flash("error", "Invalid username");
      return { msg: "Incorrect username.", success: false };
    }
    case 401: {
      session.flash("error", "Invalid password");
      return { msg: "Incorrect password.", success: false };
    }
    case 500: {
      return { msg: "Unexpected error.", success: false };
    }
    case 200: {
      //
      const id: string = (await resp.json()).id;
      if (!id) {
        throw new Error("No userid returned from login endpoint.");
      }
      //
      session.set("userId", id);
      const cookies = {
        headers: {
          "Set-Cookie": await commitSession(session),
        },
      };
      if (session.has("topic") && session.has("item")) {
        const topic = session.get("topic");
        const item = session.get("item");
        return redirect(`/app/${topic}/${item}`, cookies);
      }
      return redirect(`/app/random`, cookies);
    }
    default: {
      return { msg: "Unexpected error.", success: false };
    }
  }
}

export default function Login() {
  const loggedIn = useLoaderData<typeof loader>();
  if (loggedIn) {
    return null;
  }
  return (
    <div className="mt-20">
      <LoginWidget isLogin={true} />
    </div>
  );
}
