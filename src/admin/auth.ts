import { request } from "./api";
import { githubAdmin } from "./github-config";
export type Session = { provider: "server" | "github"; user: { email: string } | null };
export const getSession = async (): Promise<Session> =>
  githubAdmin ? (await import("./github")).githubSession() : request<Session>("/api/auth/session");
export async function signIn(provider: Session["provider"], email: string, password: string) {
  if (provider === "github") return (await import("./github")).unlockGitHub(password);
  await request("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  return getSession();
}
export async function signOut(provider: Session["provider"]) {
  if (provider === "github") (await import("./github")).lockGitHub();
  else await request("/api/auth/logout", { method: "POST" });
}
