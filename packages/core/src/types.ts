export interface ActSDKConfig {
  apiKey: string;
  projectId: string;
  allowedRoutes?: string[];
  restrictedRoutes?: string[];
  /**
   * Appended to the default internal system instructions.
   * Use this to extend behavior without replacing base instructions.
   */
  systemPrompt?: string;
}

export interface ResolvedActSDKConfig extends ActSDKConfig {
  endpoint: string;
}

export interface Route {
  path: string;
  description?: string;
  keywords?: string[];
  contextRequired?: string[];
}

export interface NavigationResult {
  action: 'navigate' | 'message';
  route?: string;
  message?: string;
  explanation?: string;
}
