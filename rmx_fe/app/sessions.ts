import { createCookieSessionStorage } from "@remix-run/node"; // or cloudflare/deno

export type SessionData = {
  userId: string;
  project: string;
  item: string;
};

type SessionFlashData = {
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
