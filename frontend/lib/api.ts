"use client";

export const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

const TOKEN_KEY = "truthlayer_token";
const ROLE_KEY = "truthlayer_role";
const ORG_KEY = "truthlayer_org";

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function getRole(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(ROLE_KEY);
}

export function setAuth(token: string, role: string, org: string | null) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(ROLE_KEY, role);
  if (org) localStorage.setItem(ORG_KEY, org);
}

export function clearAuth() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(ROLE_KEY);
  localStorage.removeItem(ORG_KEY);
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string>),
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${API_URL}${path}`, { ...options, headers });
  if (!res.ok) {
    const detail = await res.json().catch(() => ({}));
    throw new Error(detail.detail || `Request failed (${res.status})`);
  }
  if (res.headers.get("content-type")?.includes("application/json")) {
    return res.json();
  }
  return res as unknown as T;
}

// ── Auth ──────────────────────────────────────────────────────────────────

export async function login(email: string, password: string) {
  const body = new URLSearchParams({ username: email, password });
  const res = await fetch(`${API_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!res.ok) {
    const d = await res.json().catch(() => ({}));
    throw new Error(d.detail || "Login failed");
  }
  const data = await res.json();
  setAuth(data.access_token, data.role, data.organization_id);
  return data;
}

export async function googleLogin(
  credential: string,
  opts?: { role?: string; organization_name?: string }
) {
  const data = await request<any>("/auth/google", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ credential, ...opts }),
  });
  setAuth(data.access_token, data.role, data.organization_id);
  return data;
}

export async function register(payload: {
  email: string;
  password: string;
  full_name?: string;
  role: string;
  organization_name?: string;
}) {
  const data = await request<any>("/auth/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  setAuth(data.access_token, data.role, data.organization_id);
  return data;
}

export function routeForRole(role: string) {
  if (role === "business") return "/dashboard/brand";
  if (role === "creator") return "/dashboard/creator";
  return "/dashboard/verifier";
}

export function getRights() {
  return request<any>("/auth/rights");
}

export function getMe() {
  return request<any>("/auth/me");
}

export function updateSettings(openrouter_api_key: string) {
  return request<any>("/auth/settings", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ openrouter_api_key }),
  });
}

export function getUsage() {
  return request<{
    total_tokens: number;
    total_cost_usd: number;
    total_calls: number;
    by_model: Array<{
      model: string;
      call_type: string;
      prompt_tokens: number;
      completion_tokens: number;
      total_tokens: number;
      cost_usd: number;
      calls: number;
    }>;
    daily: Array<{
      day: string;
      total_tokens: number;
      cost_usd: number;
      calls: number;
    }>;
  }>("/auth/usage");
}

// ── Products (business) ───────────────────────────────────────────────────────

export function listProducts() {
  return request<any[]>("/products");
}
export function createProduct(p: { name: string; description?: string; aliases?: string[] }) {
  return request<any>("/products", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(p),
  });
}
export function getProduct(id: string) {
  return request<any>(`/products/${id}`);
}
export function productOverview(id: string) {
  return request<any>(`/products/${id}/overview`);
}
export function productVideos(id: string) {
  return request<any>(`/products/${id}/videos`);
}
export function productDocuments(id: string) {
  return request<any[]>(`/products/${id}/documents`);
}
export async function uploadProductDocument(id: string, file: File, documentType: string) {
  const fd = new FormData();
  fd.append("file", file);
  fd.append("document_type", documentType);
  return request<any>(`/products/${id}/documents`, { method: "POST", body: fd });
}
export function addProductKeyword(id: string, keyword: string) {
  return request<any>(`/products/${id}/keywords`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ keyword, keyword_type: "product_hashtag" }),
  });
}
export function productKeywords(id: string) {
  return request<any[]>(`/products/${id}/keywords`);
}
export function productContradictions(id: string) {
  return request<any>(`/products/${id}/contradictions`);
}
export function recomputeProductNarratives(id: string) {
  return request<any>(`/products/${id}/narratives/recompute`, { method: "POST" });
}
export function reviewClaim(claimId: string, status: "approved" | "rejected") {
  return request<any>(`/products/claims/${claimId}/review`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status }),
  });
}

// ── Brand ─────────────────────────────────────────────────────────────────────

export function brandDashboard() {
  return request<any>("/dashboard/brand");
}
export function addBrandKeyword(keyword: string) {
  return request<any>("/dashboard/brand/keywords", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ keyword, keyword_type: "brand" }),
  });
}

// ── Videos / analysis ───────────────────────────────────────────────────────

export function submitUrl(url: string, productId?: string) {
  return request<any>("/videos/url", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url, product_id: productId || null }),
  });
}

export async function uploadVideo(file: File, productId?: string) {
  const fd = new FormData();
  fd.append("file", file);
  if (productId) fd.append("product_id", productId);
  return request<any>("/videos/upload", { method: "POST", body: fd });
}

export function getAnalysis(videoId: string) {
  return request<any>(`/analysis/${videoId}`);
}

export function startAnalysis(videoId: string) {
  return request<any>("/analysis/start", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ video_id: videoId }),
  });
}

// ── Dashboards ──────────────────────────────────────────────────────────────

export function getDashboard(kind: "creator" | "verifier") {
  return request<any>(`/dashboard/${kind}`);
}

export function reportPdfUrl(videoId: string) {
  return `${API_URL}/reports/${videoId}/pdf`;
}

/** Resolve a stored media path (/media/...) to an absolute URL. */
export function mediaUrl(path?: string | null) {
  if (!path) return null;
  return path.startsWith("http") ? path : `${API_URL}${path}`;
}

export async function uploadProductImage(id: string, file: File) {
  const fd = new FormData();
  fd.append("file", file);
  return request<any>(`/products/${id}/image`, { method: "POST", body: fd });
}
