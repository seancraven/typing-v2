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
import {
  Form,
  Link,
  useActionData,
  ActionFunctionArgs,
  LoaderFunctionArgs,
  redirect,
} from "react-router";
import { User } from "~/typeApi";
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
  console.debug("Form Data", data);

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
      session.set("userName", username.toString());
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
      return redirect(`/app/home`, cookies);
    }
    default: {
      return { msg: "Unexpected error.", success: false };
    }
  }
}

export default function Login() {
  const actionData = useActionData<typeof action>();
  return (
    <div className="mt-20">
      <section className="z-30 w-full backdrop-blur-lg backdrop-filter">
        <div className="mx-auto flex flex-col items-center justify-center px-6 py-8 md:h-full lg:py-0">
          <div className="space-y-4 p-6 sm:p-8 md:space-y-6">
            <Form className="space-y-4 md:space-y-6" method="post">
              <div>
                <div className={cn("flex flex-col gap-6")}>
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-2xl">Login</CardTitle>
                      <CardDescription className="w-80">
                        Enter your username and password to login.
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
                            <Label htmlFor="password">Password</Label>
                            {/* <Link
                                to="#"
                                className="ml-auto inline-block text-sm underline-offset-4 hover:underline"
                              >
                                Forgot your password?
                              </Link> */}
                          </div>
                          <Input
                            id="password"
                            type="password"
                            name="password"
                            placeholder="password"
                            required
                          />
                        </div>
                        <Button className="w-full">Login</Button>
                      </div>
                      <div className="mt-4 text-center text-sm">
                        Don&apos;t have an account?{" "}
                        <Link
                          to="/register"
                          className="underline underline-offset-4"
                        >
                          Sign up
                        </Link>
                        <div className="h-8 items-center justify-center pt-2 text-red-500">
                          {actionData && actionData.msg}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </Form>
          </div>
        </div>
      </section>
    </div>
  );
}
