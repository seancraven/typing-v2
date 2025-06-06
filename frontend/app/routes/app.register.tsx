import { ActionFunctionArgs } from "react-router";
import { User } from "~/api_type";
import LoginWidget from "~/components/login_widget";

export async function action({ request }: ActionFunctionArgs) {
  const data = await request.formData();
  const username = data.get("username");
  const password = data.get("password");
  const email = data.get("email");
  if (!username) {
    throw new Error("Username shouldn't be nil.");
  }
  if (!password) {
    throw new Error("Password shouldn't be nil.");
  }
  if (!email) {
    throw new Error("Email shouldn't be nil.");
  }
  const user: User = {
    username: username.toString(),
    password: password.toString(),
    email: email.toString(),
  };
  const resp = await fetch(`${process.env.BE_URL}/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(user),
  });
  if (resp.status != 200) {
    return { msg: await resp.text(), success: false };
  }
  return { msg: "Registration successful!", success: true };
}

export default function Register() {
  return (
    <div className="mt-20">
      <LoginWidget isLogin={false} />
    </div>
  );
}
