// Shared enums and DTOs used by both apps/api and apps/admin-web.
// Keep this package free of runtime dependencies (types only).

export type UserRole = "SUPER_ADMIN" | "WEBSITE_ADMIN";

export type WebsitePlatform =
  | "WORDPRESS"
  | "LARAVEL"
  | "PHP"
  | "REACT"
  | "NODE"
  | "NEXTJS"
  | "SHOPIFY"
  | "CUSTOM"
  | "OTHER";

export type WebsiteStatus = "DRAFT" | "TESTING" | "LIVE";

export type AiProvider = "OPENAI" | "GEMINI";

export type DocumentStatus = "PENDING" | "PROCESSING" | "INDEXED" | "FAILED";

export type UrlStatus = "PENDING" | "PROCESSING" | "INDEXED" | "FAILED";

export type ChatRole = "USER" | "ASSISTANT";

export interface AuthenticatedUser {
  id: string;
  email: string;
  role: UserRole;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  user: AuthenticatedUser;
}

export interface WebsiteDto {
  id: string;
  name: string;
  domain: string;
  platform: WebsitePlatform;
  status: WebsiteStatus;
  apiKey: string;
  createdAt: string;
}

export interface CreateWebsiteRequest {
  name: string;
  domain: string;
  platform: WebsitePlatform;
}

export interface UpdateWebsiteRequest {
  name: string;
  domain: string;
  platform: WebsitePlatform;
  status: WebsiteStatus;
}

export interface WebsiteAdminDto {
  userId: string;
  email: string;
  role: UserRole;
}

export interface AssignWebsiteAdminRequest {
  email: string;
  password: string;
}

export interface AiProviderConfigDto {
  websiteId: string;
  provider: AiProvider;
  modelName: string;
  allowGeneralKnowledge: boolean;
  isActive: boolean;
  hasApiKey: boolean;
}

export interface UpdateAiProviderConfigRequest {
  provider: AiProvider;
  modelName: string;
  apiKey?: string;
  allowGeneralKnowledge: boolean;
  isActive: boolean;
}

export interface DocumentDto {
  id: string;
  websiteId: string;
  filename: string;
  fileType: string;
  status: DocumentStatus;
  createdAt: string;
}

export interface UrlSourceDto {
  id: string;
  websiteId: string;
  url: string;
  status: UrlStatus;
  lastCrawledAt: string | null;
  createdAt: string;
}

export interface AddUrlRequest {
  url: string;
}

export interface ChatMessageDto {
  role: ChatRole;
  content: string;
  createdAt: string;
}

export interface ChatRequest {
  sessionId?: string;
  message: string;
}

export interface ChatResponse {
  sessionId: string;
  message: ChatMessageDto;
  suggestions: string[];
}

export type WidgetLauncherStyle = "BUBBLE" | "FULLSCREEN";

export interface WidgetSettingsDto {
  websiteId: string;
  launcherStyle: WidgetLauncherStyle;
  greetingText: string;
  inputPlaceholder: string;
  brandColor: string;
  logoUrl: string | null;
}

export interface UpdateWidgetSettingsRequest {
  launcherStyle: WidgetLauncherStyle;
  greetingText: string;
  inputPlaceholder: string;
  brandColor: string;
}

export interface UsageSummaryDto {
  websiteId: string;
  totalChatSessions: number;
  totalMessages: number;
  documentsIndexed: number;
  urlsIndexed: number;
}
