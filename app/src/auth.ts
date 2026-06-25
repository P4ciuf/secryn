import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { UserService } from "./services/user";
import { loginDataSchema } from "./schemas/user";

/**
 * NextAuth.js v5 configuration with JWT-based session strategy and
 * credentials provider.
 *
 * The credentials provider validates email/password against the database
 * via {@link UserService}. On successful authentication, the JWT callback
 * enriches the token with the full user payload (id, email, username)
 * so that downstream route handlers and the middleware can resolve the
 * caller's identity without a database round-trip.
 *
 * The session cookie is named ``jwt`` (not the default
 * ``next-auth.session-token``) for compatibility with the custom cookie
 * utility in {@link @/utils/cookie}.
 */
export const { handlers, signIn, signOut, auth } = NextAuth({
  session: {
    strategy: "jwt",
  },
  providers: [
    Credentials({
      credentials: {
        email: {
          label: "Email",
          type: "email",
          placeholder: "guest@gmail.com",
        },
        password: {
          label: "Password",
          type: "password",
          placeholder: "******",
        },
      },
      async authorize(credentials) {
        const { email, password } = await loginDataSchema.parseAsync(credentials);

        const userService = await UserService.Instance(null);
        const user = await userService.getUserOrThrow({ email });

        if (!(await userService.validatePassword(user.id as string, password))) {
          throw new Error("Invalid credentials");
        }

        return {
          id: user.id as string,
          email: user.email,
          name: user.username,
        };
      },
    }),
  ],

  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id as string;
        token.email = user.email;
        token.name = user.name;
        token.user = {
          id: user.id as string,
          email: user.email as string,
          username: user.name as string,
        };
      }

      return token;
    },

    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.email = token.email as string;
        session.user.name = token.name as string;
      }

      return session;
    },
  },

  cookies: {
    sessionToken: {
      name: "jwt",
    },
  },
});
