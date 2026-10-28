import {
  AiProviderConfigDto,
  ChatRequest,
  ChatResponse,
  CreateWebsiteRequest,
  DocumentDto,
  LoginRequest,
  LoginResponse,
  UpdateAiProviderConfigRequest,
  AddUrlRequest,
  UpdateWebsiteRequest,
  UrlSourceDto,
  UsageSummaryDto,
  WebsiteAdminDto,
  WebsiteDto,
  WidgetSettingsDto,
  UpdateWidgetSettingsRequest,
} from "@crm-chatbot/shared-types";
import { apiFetch } from "./client";

export const authApi = {
  login: (body: LoginRequest) =>
    apiFetch<LoginResponse>("/auth/login", { method: "POST", body: JSON.stringify(body) }),
};

export const websitesApi = {
  list: () => apiFetch<WebsiteDto[]>("/websites"),
  get: (id: string) => apiFetch<WebsiteDto>(`/websites/${id}`),
  create: (body: CreateWebsiteRequest) =>
    apiFetch<WebsiteDto>("/websites", { method: "POST", body: JSON.stringify(body) }),
  update: (id: string, body: UpdateWebsiteRequest) =>
    apiFetch<WebsiteDto>(`/websites/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
  remove: (id: string) => apiFetch<void>(`/websites/${id}`, { method: "DELETE" }),
  listAdmins: (websiteId: string) => apiFetch<WebsiteAdminDto[]>(`/websites/${websiteId}/admins`),
  assignAdmin: (websiteId: string, email: string, password: string) =>
    apiFetch<WebsiteAdminDto>(`/websites/${websiteId}/admins`, {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),
  removeAdmin: (websiteId: string, userId: string) =>
    apiFetch<void>(`/websites/${websiteId}/admins/${userId}`, { method: "DELETE" }),
};

export const aiConfigApi = {
  get: (websiteId: string) => apiFetch<AiProviderConfigDto>(`/websites/${websiteId}/ai-config`),
  update: (websiteId: string, body: UpdateAiProviderConfigRequest) =>
    apiFetch<AiProviderConfigDto>(`/websites/${websiteId}/ai-config`, {
      method: "PUT",
      body: JSON.stringify(body),
    }),
};

export const documentsApi = {
  list: (websiteId: string) => apiFetch<DocumentDto[]>(`/websites/${websiteId}/documents`),
  upload: (websiteId: string, file: File) => {
    const form = new FormData();
    form.append("file", file);
    return apiFetch<DocumentDto>(`/websites/${websiteId}/documents`, {
      method: "POST",
      body: form,
    });
  },
  remove: (websiteId: string, documentId: string) =>
    apiFetch<void>(`/websites/${websiteId}/documents/${documentId}`, { method: "DELETE" }),
};

export const urlsApi = {
  list: (websiteId: string) => apiFetch<UrlSourceDto[]>(`/websites/${websiteId}/urls`),
  add: (websiteId: string, body: AddUrlRequest) =>
    apiFetch<UrlSourceDto>(`/websites/${websiteId}/urls`, {
      method: "POST",
      body: JSON.stringify(body),
    }),
  refresh: (websiteId: string, urlId: string) =>
    apiFetch<UrlSourceDto>(`/websites/${websiteId}/urls/${urlId}/refresh`, { method: "POST" }),
  remove: (websiteId: string, urlId: string) =>
    apiFetch<void>(`/websites/${websiteId}/urls/${urlId}`, { method: "DELETE" }),
};

export const chatApi = {
  send: (websiteId: string, body: ChatRequest) =>
    apiFetch<ChatResponse>(`/websites/${websiteId}/chat`, {
      method: "POST",
      body: JSON.stringify(body),
    }),
};

export const widgetSettingsApi = {
  get: (websiteId: string) => apiFetch<WidgetSettingsDto>(`/websites/${websiteId}/widget-settings`),
  update: (websiteId: string, body: UpdateWidgetSettingsRequest) =>
    apiFetch<WidgetSettingsDto>(`/websites/${websiteId}/widget-settings`, {
      method: "PUT",
      body: JSON.stringify(body),
    }),
  uploadLogo: (websiteId: string, file: File) => {
    const form = new FormData();
    form.append("logo", file);
    return apiFetch<WidgetSettingsDto>(`/websites/${websiteId}/widget-settings/logo`, {
      method: "POST",
      body: form,
    });
  },
  removeLogo: (websiteId: string) =>
    apiFetch<WidgetSettingsDto>(`/websites/${websiteId}/widget-settings/logo`, { method: "DELETE" }),
};

export const usageApi = {
  get: (websiteId: string) => apiFetch<UsageSummaryDto>(`/websites/${websiteId}/usage`),
};
