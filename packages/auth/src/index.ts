export type Identity = {
  accountId: string;
  displayName: string;
  provider: "dev" | "chatgpt";
};

export type AuthProvider = {
  getSession(): Promise<Identity | null>;
  signIn(): Promise<Identity>;
  signOut(): Promise<void>;
};

export class DevelopmentAuthProvider implements AuthProvider {
  private identity: Identity | null = {
    accountId: "dev-account-001",
    displayName: "Arena Tester",
    provider: "dev",
  };

  async getSession(): Promise<Identity | null> {
    return this.identity;
  }

  async signIn(): Promise<Identity> {
    this.identity ??= {
      accountId: "dev-account-001",
      displayName: "Arena Tester",
      provider: "dev",
    };
    return this.identity;
  }

  async signOut(): Promise<void> {
    this.identity = null;
  }
}

export function createChatGptAuthAdapter(): AuthProvider {
  return {
    async getSession() {
      return null;
    },
    async signIn() {
      throw new Error("Sign in with ChatGPT is deployment-surface dependent.");
    },
    async signOut() {
      return undefined;
    },
  };
}
