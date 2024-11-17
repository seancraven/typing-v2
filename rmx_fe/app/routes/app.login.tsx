import {
  ActionFunctionArgs,
  LoaderFunctionArgs,
  redirect,
} from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import { User } from "~/api_type";
import LoginWidget from "~/components/login_widget";
import { commitSession, getSession } from "~/sessions";

export async function loader({ request }: LoaderFunctionArgs) {
  const session = await getSession(request.headers.get("Cookie"));

  return session.has("userId");
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
  const session = await getSession(request.headers.get("Cookie"));
  switch (resp.status) {
    case 400: {
      session.flash("error", "Invalid username");
      return { msg: "Incorrect username." };
      break;
    }
    case 401: {
      session.flash("error", "Invalid password");
      return { msg: "Incorrect password." };
      break;
    }
    case 500: {
      return { msg: "Unexpected error." };
      break;
    }
    case 200: {
      const id: string = (await resp.json()).id;
      if (!id) {
        throw new Error("No userid returned from login endpoint.");
      }
      session.set("userId", id);
      if (session.has("project") && session.has("item")) {
        const project = session.get("project");
        const item = session.get("item");
        return redirect(`/app/${project}/${item}`, {
          headers: {
            "Set-Cookie": await commitSession(session),
          },
        });
      }
      return redirect(`/app/random/0`);
      break;
    }
    default: {
      return { msg: "Unexpected error." };
      break;
    }
  }
}

export default function Login() {
  const loggedIn = useLoaderData<typeof loader>();

  return !loggedIn ? <LoginWidget isLogin={true} /> : null;
}
