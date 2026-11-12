import { API_URL, fetchApi, getApiErrorMessage } from "./api";
export async function request<T>(
  path: string,
  method = "GET",
  body?: unknown,
): Promise<T> {
  const response = await fetchApi(`${API_URL}${path}`, {
    method,
    ...(body === undefined
      ? {}
      : {
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        }),
  });
  if (!response.ok)
    throw new Error(
      await getApiErrorMessage(
        response,
        "Não foi possível realizar a operação.",
      ),
    );
  return (await response.json()).data as T;
}
export async function allPages<T>(path: string): Promise<T[]> {
  const items: T[] = [];
  let page = 1;
  for (;;) {
    const response = await request<{
      items: T[];
      meta: { totalPages: number };
    }>(`${path}?page=${page}&limit=100`);
    items.push(...response.items);
    if (page >= response.meta.totalPages) return items;
    page++;
  }
}
