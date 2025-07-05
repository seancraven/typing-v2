import {
  ActionFunctionArgs,
  Form,
  Link,
  useActionData,
  useNavigate,
} from "react-router";
import { User } from "~/typeApi";

import { cn } from "~/lib/utils";
import { Button } from "~/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
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
  const actionData = useActionData<typeof action>();
  const navigate = useNavigate();
  return (
    <div className="mt-20">
      <section className="z-30 w-full backdrop-blur-lg backdrop-filter">
        <div className="mx-auto flex flex-col items-center justify-center px-6 py-8 md:h-full lg:py-0">
          <div className="space-y-4 p-6 sm:p-8 md:space-y-6">
            <div>
              <div className={cn("flex flex-col gap-6")}>
                <Card>
                  {actionData?.success ? (
                    <CardHeader>
                      <CardTitle className="text-2xl">Success!</CardTitle>
                      <CardDescription className="w-80">
                        You have successfully registered.
                      </CardDescription>
                      <Button onClick={() => navigate("/login")}>Login</Button>
                    </CardHeader>
                  ) : (
                    <Form className="space-y-4 md:space-y-6" method="post">
                      <CardHeader>
                        <CardTitle className="text-2xl">Sign Up</CardTitle>
                        <CardDescription className="w-80">
                          Enter your username, email and password to sign up.
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="flex flex-col gap-6">
                          <div className="grid gap-2">
                            <Label htmlFor="username">Username</Label>
                            <Input
                              id="username"
                              type="username"
                              name="username"
                              placeholder="chad"
                              required
                            />
                          </div>
                          <div className="grid gap-2">
                            <div className="flex items-center">
                              <Label htmlFor="email">Email</Label>
                            </div>
                            <Input
                              id="email"
                              type="email"
                              name="email"
                              placeholder="chad@program.com"
                              required
                            />
                          </div>
                          <div className="grid gap-2">
                            <div className="flex items-center">
                              <Label htmlFor="password">Password</Label>
                            </div>
                            <Input
                              id="password"
                              type="password"
                              name="password"
                              placeholder="password"
                              required
                            />
                          </div>
                          <Button className="w-full">Register</Button>
                        </div>
                        <div className="mt-4 text-center text-sm">
                          Alreaady have an account?{" "}
                          <Link
                            to="/login"
                            className="underline underline-offset-4"
                          >
                            Login
                          </Link>
                          <div
                            className={`h-8 items-center justify-center pt-2 ${actionData?.success ? "text-green-500" : "text-red-500"}`}
                          >
                            {actionData && actionData.msg}
                          </div>
                        </div>
                      </CardContent>
                    </Form>
                  )}
                </Card>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
