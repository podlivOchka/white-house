export const assetUrl = (path: string) => /^https:\/\//i.test(path)?path:import.meta.env.BASE_URL + path.replace(/^\//, "");
