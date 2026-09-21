import { Prisma } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Account linking against an in-memory stand-in for the database, which
 * enforces the same unique constraints (User.email, Account provider+sub) so
 * the race and duplicate paths behave as they would against Postgres.
 */

type User = {
  id: string;
  email: string;
  name: string;
  passwordHash: string | null;
  emailVerifiedAt: Date | null;
};
type Account = {
  userId: string;
  provider: string;
  providerAccountId: string;
  email: string | null;
};

const store = vi.hoisted(() => ({
  users: [] as User[],
  accounts: [] as Account[],
  sessions: [] as { userId: string }[],
  tokens: [] as { userId: string }[],
  profiles: [] as { userId: string; fullName: string }[],
  /** Simulate another request creating the same user between our read and write. */
  raceOnCreate: null as null | (() => void),
}));

function unique(target: string) {
  return new Prisma.PrismaClientKnownRequestError("Unique constraint failed", {
    code: "P2002",
    clientVersion: "test",
    meta: { target },
  });
}

function addAccount(a: Account) {
  if (
    store.accounts.some(
      (x) =>
        x.provider === a.provider &&
        x.providerAccountId === a.providerAccountId,
    )
  ) {
    throw unique("provider_providerAccountId");
  }
  store.accounts.push(a);
}

vi.mock("@/server/db", () => ({
  db: {
    account: {
      findUnique: async ({
        where,
      }: {
        where: {
          provider_providerAccountId: {
            provider: string;
            providerAccountId: string;
          };
        };
      }) => {
        const k = where.provider_providerAccountId;
        const a = store.accounts.find(
          (x) =>
            x.provider === k.provider &&
            x.providerAccountId === k.providerAccountId,
        );
        return a ? { userId: a.userId } : null;
      },
      create: async ({ data }: { data: Account }) => addAccount(data),
    },
    user: {
      findUnique: async ({ where }: { where: { email: string } }) => {
        const u = store.users.find((x) => x.email === where.email);
        return u ? { id: u.id, emailVerifiedAt: u.emailVerifiedAt } : null;
      },
      create: async ({
        data,
      }: {
        data: Omit<User, "id"> & {
          profile: { create: { fullName: string } };
          accounts: { create: Omit<Account, "userId"> };
        };
      }) => {
        store.raceOnCreate?.();
        store.raceOnCreate = null;
        if (store.users.some((x) => x.email === data.email))
          throw unique("email");
        const id = `user-${store.users.length + 1}`;
        store.users.push({
          id,
          email: data.email,
          name: data.name,
          passwordHash: data.passwordHash,
          emailVerifiedAt: data.emailVerifiedAt,
        });
        store.profiles.push({
          userId: id,
          fullName: data.profile.create.fullName,
        });
        addAccount({ userId: id, ...data.accounts.create });
        return { id };
      },
      update: async ({
        where,
        data,
      }: {
        where: { id: string };
        data: Partial<User>;
      }) => {
        Object.assign(
          store.users.find((x) => x.id === where.id)!,
          data,
        );
      },
    },
    session: {
      deleteMany: async ({ where }: { where: { userId: string } }) => {
        store.sessions = store.sessions.filter(
          (s) => s.userId !== where.userId,
        );
      },
    },
    verificationToken: {
      deleteMany: async ({ where }: { where: { userId: string } }) => {
        store.tokens = store.tokens.filter((s) => s.userId !== where.userId);
      },
    },
    $transaction: async (ops: Promise<unknown>[]) => Promise.all(ops),
  },
}));

const { resolveGoogleUser, GoogleAccountError } =
  await import("@/server/auth/google-account");

const identity = {
  sub: "google-sub-1",
  email: "person@example.com",
  emailVerified: true,
  name: "Pat Person",
};

function seedUser(over: Partial<User> = {}): User {
  const u: User = {
    id: `user-${store.users.length + 1}`,
    email: "person@example.com",
    name: "Existing",
    passwordHash: "bcrypt-hash",
    emailVerifiedAt: new Date("2026-01-01"),
    ...over,
  };
  store.users.push(u);
  return u;
}

beforeEach(() => {
  store.users = [];
  store.accounts = [];
  store.sessions = [];
  store.tokens = [];
  store.profiles = [];
  store.raceOnCreate = null;
});

describe("resolveGoogleUser", () => {
  it("signs in the user an already-linked Google account belongs to", async () => {
    const u = seedUser({ email: "old-address@example.com" });
    store.accounts.push({
      userId: u.id,
      provider: "google",
      providerAccountId: identity.sub,
      email: "old",
    });

    // Matched on `sub`: even with a different email on the Google side.
    await expect(
      resolveGoogleUser({ ...identity, email: "new@example.com" }),
    ).resolves.toEqual({
      userId: u.id,
      outcome: "signed-in",
    });
    expect(store.users).toHaveLength(1);
  });

  it("links Google to a verified existing account and keeps its password", async () => {
    const u = seedUser();
    store.sessions.push({ userId: u.id });

    await expect(resolveGoogleUser(identity)).resolves.toEqual({
      userId: u.id,
      outcome: "linked",
    });

    expect(store.users).toHaveLength(1); // no duplicate account
    expect(store.accounts).toEqual([
      {
        userId: u.id,
        provider: "google",
        providerAccountId: identity.sub,
        email: identity.email,
      },
    ]);
    expect(store.users[0].passwordHash).toBe("bcrypt-hash");
    expect(store.sessions).toHaveLength(1); // existing sessions untouched
  });

  it("links to an unverified existing account but removes its untrusted password and sessions", async () => {
    const u = seedUser({ emailVerifiedAt: null });
    store.sessions.push({ userId: u.id });
    store.tokens.push({ userId: u.id });

    await expect(resolveGoogleUser(identity)).resolves.toEqual({
      userId: u.id,
      outcome: "linked",
    });

    expect(store.users[0].passwordHash).toBeNull();
    expect(store.users[0].emailVerifiedAt).toBeInstanceOf(Date);
    expect(store.sessions).toHaveLength(0);
    expect(store.tokens).toHaveLength(0);
    expect(store.accounts).toHaveLength(1);
  });

  it("creates a verified, passwordless user with a profile when nobody has the email", async () => {
    const result = await resolveGoogleUser(identity);

    expect(result.outcome).toBe("created");
    expect(store.users).toEqual([
      expect.objectContaining({
        email: identity.email,
        name: "Pat Person",
        passwordHash: null,
        emailVerifiedAt: expect.any(Date),
      }),
    ]);
    expect(store.profiles).toEqual([
      { userId: result.userId, fullName: "Pat Person" },
    ]);
    expect(store.accounts[0]).toMatchObject({
      userId: result.userId,
      providerAccountId: identity.sub,
    });
  });

  it("falls back to the email's local part when Google sends no name", async () => {
    await resolveGoogleUser({ ...identity, name: null });
    expect(store.users[0].name).toBe("person");
  });

  it("refuses an unverified Google email: no link, no new account", async () => {
    seedUser();
    await expect(
      resolveGoogleUser({ ...identity, emailVerified: false }),
    ).rejects.toBeInstanceOf(GoogleAccountError);
    await expect(
      resolveGoogleUser({
        ...identity,
        email: "nobody@example.com",
        emailVerified: false,
      }),
    ).rejects.toBeInstanceOf(GoogleAccountError);
    expect(store.accounts).toHaveLength(0);
    expect(store.users).toHaveLength(1);
  });

  it("still signs in an already-linked account whose Google email is now unverified", async () => {
    const u = seedUser();
    store.accounts.push({
      userId: u.id,
      provider: "google",
      providerAccountId: identity.sub,
      email: null,
    });
    await expect(
      resolveGoogleUser({ ...identity, emailVerified: false }),
    ).resolves.toMatchObject({ userId: u.id });
  });

  it("resolves a concurrent first sign-in to the one account that won", async () => {
    // Another callback for the same person creates the user first.
    store.raceOnCreate = () => {
      store.users.push({
        id: "winner",
        email: identity.email,
        name: "x",
        passwordHash: null,
        emailVerifiedAt: new Date(),
      });
      store.accounts.push({
        userId: "winner",
        provider: "google",
        providerAccountId: identity.sub,
        email: identity.email,
      });
    };

    await expect(resolveGoogleUser(identity)).resolves.toEqual({
      userId: "winner",
      outcome: "signed-in",
    });
    expect(store.users).toHaveLength(1);
  });
});
