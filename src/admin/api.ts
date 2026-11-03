import type { CatalogData } from "../../shared/catalog.ts";
import { ApiError } from "./errors";
import { githubAdmin, githubRepository, githubBranch } from "./github-config";
import { assetUrl } from "../lib/assetUrl";
export { ApiError } from "./errors";
export async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(import.meta.env.BASE_URL + path.replace(/^\//, ""), {
    ...init,
    signal: init.signal ?? AbortSignal.timeout(20000),
    credentials: "same-origin",
    cache: "no-store",
    headers: { Accept: "application/json", ...init.headers },
  });
  if (!response.headers.get("content-type")?.includes("application/json"))
    throw new ApiError("Сервер управления недоступен. Попробуйте позже.", 503);
  const data = await response.json();
  if (!response.ok)
    throw new ApiError(data.error || "Не удалось выполнить запрос", response.status);
  return data as T;
}
export const loadCatalog = async () =>
  githubAdmin
    ? (await import("./github")).loadGitHubCatalog()
    : request<CatalogData>("/api/admin/catalog");
export const saveCatalog = async (data: CatalogData) =>
  githubAdmin
    ? (await import("./github")).saveGitHubCatalog(data)
    : request<CatalogData>("/api/admin/catalog", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
// Phone photos are far larger than the storefront needs; shrink them before they reach customers.
export async function shrinkPhoto(file: File, maxSide = 1600, skipBelow = 700_000) {
  if (file.size <= skipBelow) return file;
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();
    const blob = await new Promise<Blob | null>((done) => canvas.toBlob(done, "image/jpeg", 0.85));
    return blob && blob.size < file.size
      ? new File([blob], "photo.jpg", { type: blob.type })
      : file;
  } catch {
    return file; // Not decodable here: the upload validation reports the real problem.
  }
}
export const uploadPhoto = async (original: File) => {
  const file = await shrinkPhoto(original);
  return githubAdmin
    ? (await import("./github")).uploadGitHubPhoto(file)
    : request<{ url: string }>("/api/admin/upload", {
        method: "POST",
        headers: { "Content-Type": file.type },
        body: file,
      });
};
// The public catalog file only changes after the Pages workflow succeeds, so it proves the deploy.
export async function waitForPublication(
  revision: number,
  signal: AbortSignal,
  { interval = 15000, timeout = 10 * 60 * 1000 } = {},
) {
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline && !signal.aborted) {
    await new Promise((done) => setTimeout(done, interval));
    try {
      const response = await fetch(import.meta.env.BASE_URL + "content/catalog.json", {
        cache: "no-store",
        signal,
      });
      if (response.ok && (await response.json()).revision >= revision) return true;
    } catch {}
  }
  return false;
}
export const adminImageUrl = (path: string) =>
  githubAdmin && path.startsWith("/images/uploads/")
    ? "https://raw.githubusercontent.com/" +
      githubRepository +
      "/" +
      githubBranch +
      "/public" +
      path
    : assetUrl(path);
export const catalogChanged = () => window.dispatchEvent(new Event("whitehouse:catalog-changed"));
