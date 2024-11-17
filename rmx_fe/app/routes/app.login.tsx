import { ActionFunctionArgs, redirect } from "@remix-run/node";
import { User } from "~/api_type";
import LoginWidget from "~/components/login_widget";
import { commitSession, getSession } from "~/sessions";

export async function loader() {
  return null;
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
      session.set("userId", id);
      console.log(await commitSession(session));
      return redirect("/app/", {
        headers: {
          "Set-Cookie": await commitSession(session),
        },
      });
      break;
    }
    default: {
      return { msg: "Unexpected error." };
      break;
    }
  }
}

export default function Login() {
  return <LoginWidget isLogin={true} />;
}
