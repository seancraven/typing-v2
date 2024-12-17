import {
  createCookieSessionStorage,
  redirect,
  Session,
  SessionStorage,
} from "@remix-run/node"; // or cloudflare/deno

export type SessionData = {
  userId: string;
  topic: string;
  item: string;
};

export type SessionFlashData = {
  error: string;
};

const { getSession, commitSession, destroySession } =
  createCookieSessionStorage<SessionData, SessionFlashData>({
    // a Cookie from `createCookie` or the CookieOptions to create one
    cookie: {
      name: "__session",
      // all of these are optional
      secure: true,
    },
  });

export { getSession, commitSession, destroySession };

// Handle unlogged in fuckers, by routing to login page.
export function getUserIdChecked(
  session: Session<SessionData, SessionFlashData>,
) {
  const userId = session.get("userId");
  if (!userId) {
    throw redirect("/app/login");
  }
  return userId;
}
