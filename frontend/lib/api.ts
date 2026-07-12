"use client";

import { supabase } from "@/lib/supabase";

export const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

const ROLE_KEY = "truthlayer_role";
const PENDING_KEY = "truthlayer_pending_signup";

export function getRole(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(ROLE_KEY);
}

/** Sign out of Supabase and clear cached role. */
export async function clearAuth() {
  localStorage.removeItem(ROLE_KEY);
  localStorage.removeItem(PENDING_KEY);
  try {
    await supabase.auth.signOut();
  } catch {
    /* ignore */
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
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

// ── Auth (delegated to Supabase) ────────────────────────────────────────────

type SignupMeta = { role: string; full_name?: string; organization_name?: string };

/**
 * Apply the role/org chosen at sign-up to the backend profile (which is
 * JIT-created on the first authenticated request). Idempotent.
 */
export function bootstrapProfile(meta: Partial<SignupMeta>) {
  return request<any>("/auth/bootstrap", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(meta),
  });
}

export async function login(email: string, password: string) {
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw new Error(error.message);
  const me = await getMe(); // creates the profile on first call
  localStorage.setItem(ROLE_KEY, me.role);
  return { role: me.role as string };
}

/**
 * Email/password sign-up. If the project requires email confirmation there is
 * no session yet — we return { needsConfirmation: true } so the UI can say so.
 */
export async function register(payload: {
  email: string;
  password: string;
  full_name?: string;
  role: string;
  organization_name?: string;
}) {
  const { data, error } = await supabase.auth.signUp({
    email: payload.email,
    password: payload.password,
    options: {
      data: {
        full_name: payload.full_name,
        role: payload.role,
        organization_name: payload.organization_name,
      },
    },
  });
  if (error) throw new Error(error.message);
  if (!data.session) return { needsConfirmation: true as const };

  const me = await bootstrapProfile({
    role: payload.role,
    full_name: payload.full_name,
    organization_name: payload.organization_name,
  });
  localStorage.setItem(ROLE_KEY, me.role);
  return { role: me.role as string };
}

/**
 * Start the Google OAuth redirect. The chosen role/org (sign-up only) are
 * stashed so /auth/callback can apply them once we return with a session.
 */
export async function signInWithGoogle(meta?: Partial<SignupMeta>) {
  if (meta && meta.role) localStorage.setItem(PENDING_KEY, JSON.stringify(meta));
  const redirectTo = `${window.location.origin}/auth/callback`;
  const { error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo },
  });
  if (error) throw new Error(error.message);
}

/** Called by /auth/callback after Supabase establishes the session. */
export async function completeOAuth(): Promise<{ role: string }> {
  let pending: Partial<SignupMeta> | null = null;
  try {
    const raw = localStorage.getItem(PENDING_KEY);
    if (raw) pending = JSON.parse(raw);
  } catch {
    /* ignore */
  }
  localStorage.removeItem(PENDING_KEY);

  const me = pending?.role ? await bootstrapProfile(pending) : await getMe();
  localStorage.setItem(ROLE_KEY, me.role);
  return { role: me.role as string };
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

export function updateSettings(payload: {
  openrouter_api_key?: string;
  tavily_api_key?: string;
  media_integrity_api_key?: string;
  llm_model?: string | null;
  embeddings_model?: string | null;
  transcription_model?: string | null;
}) {
  return request<any>("/auth/settings", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
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
export function updateProduct(id: string, p: { name: string; description?: string }) {
  return request<any>(`/products/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(p),
  });
}
export function deleteProduct(id: string) {
  return request<any>(`/products/${id}`, { method: "DELETE" });
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
export function deleteProductDocument(productId: string, documentId: string) {
  return request<any>(`/products/${productId}/documents/${documentId}`, { method: "DELETE" });
}
export function addProductKeyword(id: string, keyword: string) {
  return request<any>(`/products/${id}/keywords`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ keyword, keyword_type: "product_hashtag" }),
  });
}
export function productKeywords(id: string) {
  return request<{ keywords: any[]; video_matches: any[] }>(`/products/${id}/keywords`);
}
export function deleteProductKeyword(productId: string, keywordId: string) {
  return request<any>(`/products/${productId}/keywords/${keywordId}`, { method: "DELETE" });
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
export function deleteBrandKeyword(keywordId: string) {
  return request<any>(`/dashboard/brand/keywords/${keywordId}`, { method: "DELETE" });
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

export function deleteVideo(videoId: string) {
  return request<any>(`/videos/${videoId}`, { method: "DELETE" });
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
