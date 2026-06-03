import axios, {
  AxiosError,
  AxiosHeaders,
  AxiosResponse,
  InternalAxiosRequestConfig,
} from "axios";
import type {
  CapabilitiesBundleContract,
  ChapterContentContract,
  ChapterWithPages,
  ComicDetailContract,
  ComicListSceneBundleContract,
  ComicPagedListContract,
  CommentFeedContract,
  CommentRepliesContract,
  FilterBundleContract,
  ListFavoriteFoldersResult,
  PluginInfo,
  ReadSnapshotContract,
  RecommendItem,
  SearchResultContract,
  ToggleFavoriteResult,
} from "../types/type";
import {
  NOT_FOUND_IMAGE_URL,
  PLACEHOLDER_IMAGE_PATH,
  PLUGIN_ID,
  SettingsBundleContract,
  createActionItem,
  createBasicMetadata,
  createImage,
  createMetadataActionList,
  toStringMap,
} from "./common";
import { buildPluginInfo } from "./get-info";
import { flutterTools, pluginConfig } from "./tools";

type BasePayload = {
  extern?: Record<string, unknown>;
};

type SearchPayload = BasePayload & {
  keyword?: string;
  page?: number;
};

type ComicDetailPayload = BasePayload & {
  comicId?: string;
};

type ChapterPayload = BasePayload & {
  comicId?: string;
  chapterId?: string;
};

type ReadSnapshotPayload = BasePayload & {
  comicId?: string;
  chapterId?: string;
};

type FetchImagePayload = BasePayload & {
  url?: string;
  timeoutMs?: number;
  taskGroupKey?: string;
};

type SaveSettingsPayload = {
  values?: Record<string, unknown>;
  value?: unknown;
} & Record<string, unknown>;

type LoginPayload = {
  account?: string;
  password?: string;
  persistCredentials?: boolean;
  notifyResult?: boolean;
};

type KomiicComic = {
  id?: string;
  title?: string;
  imageUrl?: string;
  dateUpdated?: string;
  monthViews?: number;
  views?: number;
  favoriteCount?: number;
  lastChapterUpdate?: string;
  status?: string;
  authors?: Array<{ id?: string; name?: string }>;
  categories?: Array<{ id?: string; name?: string }>;
};

type KomiicChapter = {
  id?: string;
  serial?: string;
  type?: string;
  dateUpdated?: string;
};

type KomiicImage = {
  id?: string;
  kid?: string;
  height?: number;
  width?: number;
};

type KomiicFolder = {
  id?: string;
  key?: string;
  name?: string;
  comicCount?: number;
  dateUpdated?: string;
};

type KomiicComment = {
  id?: string;
  comicId?: string;
  account?: {
    id?: string;
    nickname?: string;
    profileImageUrl?: string;
  };
  message?: string;
  replyTo?: {
    id?: string;
  } | null;
  dateUpdated?: string;
  dateCreated?: string;
};

type GraphQlResponse<T> = {
  data?: T;
  errors?: Array<{
    message?: string;
  }>;
};

type GraphQlRequest = {
  operationName: string;
  variables: Record<string, unknown>;
  query: string;
};
type GraphQlCallOptions = {
  skipAuth?: boolean;
};

type RetriableAxiosRequestConfig = InternalAxiosRequestConfig & {
  __komiicRetryAuth?: boolean;
};
type ChapterDoc = {
  id: string;
  name: string;
  path: string;
  url: string;
  extern: Record<string, unknown>;
};
type ChapterBundleShape = {
  epId?: string;
  epName?: string;
  length?: number;
  epPages?: string;
  docs?: ChapterDoc[];
  series?: Array<{
    id: string;
    name: string;
    order: number;
    extern: Record<string, unknown>;
  }>;
};
type ToggleFavoritePayload = {
  comicId?: string;
  currentFavorite?: boolean;
  extern?: Record<string, unknown>;
};
type FavoriteFolderPayload = {
  comicId?: string;
  folderId?: string;
  folderName?: string;
  extern?: Record<string, unknown>;
};
type CloudFavoritePayload = {
  page?: number;
  folderId?: string;
  order?: string;
  extern?: Record<string, unknown>;
};
type CommentFeedPayload = {
  comicId?: string;
  page?: number;
  extern?: Record<string, unknown>;
};
type CommentRepliesPayload = {
  comicId?: string;
  commentId?: string;
  page?: number;
  extern?: Record<string, unknown>;
};

const API_BASE = "https://komiic.com";
const GRAPHQL_ENDPOINT = `${API_BASE}/api/query`;
const AUTH_ACCOUNT_CONFIG_KEY = "auth.account";
const AUTH_PASSWORD_CONFIG_KEY = "auth.password";
const AUTH_TOKEN_CONFIG_KEY = "auth.token";
const RECOMMEND_ENABLED_CONFIG_KEY = "feature.recommend.enabled";
const REQUEST_TIMEOUT_MS = 30000;
const SEARCH_PAGE_SIZE = 20;
const CATEGORY_PAGE_SIZE = 30;
const CHAPTER_PAGE_SIZE = 100;
const DEFAULT_USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

const CATEGORY_OPTIONS = [
  { label: "全部", value: "0" },
  { label: "愛情", value: "1" },
  { label: "後宮", value: "2" },
  { label: "神鬼", value: "3" },
  { label: "校園", value: "4" },
  { label: "搞笑", value: "5" },
  { label: "生活", value: "6" },
  { label: "懸疑", value: "7" },
  { label: "冒險", value: "8" },
  { label: "恐怖", value: "9" },
  { label: "職場", value: "10" },
  { label: "魔幻", value: "11" },
  { label: "魔法", value: "12" },
  { label: "格鬥", value: "13" },
  { label: "宅男", value: "14" },
  { label: "勵志", value: "15" },
  { label: "耽美", value: "16" },
  { label: "科幻", value: "17" },
  { label: "百合", value: "18" },
  { label: "治癒", value: "19" },
  { label: "萌系", value: "20" },
  { label: "熱血", value: "21" },
  { label: "競技", value: "22" },
  { label: "推理", value: "23" },
  { label: "雜誌", value: "24" },
  { label: "偵探", value: "25" },
  { label: "偽娘", value: "26" },
  { label: "美食", value: "27" },
  { label: "四格", value: "28" },
  { label: "社會", value: "31" },
  { label: "歷史", value: "32" },
  { label: "戰爭", value: "33" },
  { label: "舞蹈", value: "34" },
  { label: "武俠", value: "35" },
  { label: "機戰", value: "36" },
  { label: "音樂", value: "37" },
  { label: "體育", value: "40" },
  { label: "黑道", value: "42" },
] as const;

const RANKING_OPTIONS = [
  { label: "月榜", value: "MONTH_VIEWS" },
  { label: "綜合", value: "VIEWS" },
] as const;

const CATEGORY_SORT_OPTIONS = [
  { label: "更新", value: "DATE_UPDATED" },
  { label: "觀看數", value: "VIEWS" },
  { label: "喜愛數", value: "FAVORITE_COUNT" },
] as const;

const CATEGORY_STATUS_OPTIONS = [
  { label: "全部", value: "" },
  { label: "連載中", value: "ONGOING" },
  { label: "完結", value: "END" },
] as const;
const DEFAULT_FAVORITE_FOLDER_ID = "__default__";

let authTokenCache: string | null = null;
let authTokenInitPromise: Promise<string> | null = null;
let loginInFlight: Promise<string> | null = null;

function openSearchAction(
  keyword: string,
  extern: Record<string, unknown> = {},
) {
  return {
    type: "openSearch",
    payload: {
      source: PLUGIN_ID,
      keyword,
      extern,
    },
  };
}

function createPagingInfo(page: number, pages: number, total: number) {
  const safePages = Math.max(1, Number.isFinite(pages) ? pages : 1);
  return {
    page,
    pages: safePages,
    total,
    hasReachedMax: page >= safePages,
  };
}

function toNumber(value: unknown, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function splitByCommonSeparators(value: unknown) {
  return String(value ?? "")
    .split(/[\/,，]/g)
    .map((item) => item.trim())
    .filter(Boolean);
}

function formatDateTime(value: unknown) {
  const text = String(value ?? "").trim();
  if (!text) return "";
  const parsed = new Date(text);
  if (Number.isNaN(parsed.getTime())) {
    return text;
  }
  const year = parsed.getFullYear();
  const month = String(parsed.getMonth() + 1).padStart(2, "0");
  const day = String(parsed.getDate()).padStart(2, "0");
  const hour = String(parsed.getHours()).padStart(2, "0");
  const minute = String(parsed.getMinutes()).padStart(2, "0");
  return `${year}-${month}-${day} ${hour}:${minute}`;
}

function formatDateOnly(value: unknown) {
  const text = String(value ?? "").trim();
  if (!text) return "";
  const parsed = new Date(text);
  if (Number.isNaN(parsed.getTime())) {
    return text;
  }
  const year = parsed.getFullYear();
  const month = String(parsed.getMonth() + 1).padStart(2, "0");
  const day = String(parsed.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getRelativeUpdateText(value: unknown) {
  const text = String(value ?? "").trim();
  if (!text) return "";
  const time = new Date(text).getTime();
  if (!Number.isFinite(time)) return text;
  const diff = Date.now() - time;
  const hourMs = 1000 * 60 * 60;
  const dayMs = hourMs * 24;
  if (diff < hourMs) {
    return "剛剛更新";
  }
  if (diff < dayMs) {
    return `${Math.max(1, Math.floor(diff / hourMs))}小時前更新`;
  }
  return `${Math.max(1, Math.floor(diff / dayMs))}天前更新`;
}

function sanitizeFileName(name: string) {
  const sanitized = name.replace(/[\\/:*?"<>|]/g, "_").trim();
  return sanitized || "image.jpg";
}

function extractRemoteErrorMessage(data: unknown) {
  const map = toStringMap(data);
  const errors = Array.isArray(map.errors) ? map.errors : [];
  const firstError = errors.length > 0 ? toStringMap(errors[0]) : {};
  const candidates = [
    map.message,
    map.error,
    map.errmsg,
    map.msg,
    firstError.message,
  ];
  for (const candidate of candidates) {
    const text = String(candidate ?? "").trim();
    if (text) {
      return text;
    }
  }
  return "";
}

function extractImageName(imageUrl: string, index: number) {
  const fallback = `page-${String(index + 1).padStart(3, "0")}.jpg`;
  try {
    const parsed = new URL(imageUrl);
    const segment = parsed.pathname.split("/").filter(Boolean).pop();
    return segment ? sanitizeFileName(decodeURIComponent(segment)) : fallback;
  } catch {
    return fallback;
  }
}

function decodeConfigString(raw: unknown, fallback = ""): string {
  if (raw === undefined || raw === null) {
    return fallback;
  }
  if (typeof raw === "object") {
    const map = raw as Record<string, unknown>;
    if (map.ok === true && "value" in map) {
      return decodeConfigString(map.value, fallback);
    }
    return fallback;
  }
  const text = String(raw);
  if (!text.trim()) {
    return fallback;
  }
  try {
    const parsed = JSON.parse(text.trim());
    if (
      parsed &&
      typeof parsed === "object" &&
      (parsed as Record<string, unknown>).ok === true &&
      "value" in (parsed as Record<string, unknown>)
    ) {
      return decodeConfigString(
        (parsed as Record<string, unknown>).value,
        fallback,
      );
    }
    if (
      typeof parsed === "string" ||
      typeof parsed === "number" ||
      typeof parsed === "boolean"
    ) {
      return String(parsed);
    }
  } catch {
    // keep raw text
  }
  return text;
}

async function saveConfigString(key: string, value: string) {
  await pluginConfig.save(key, decodeConfigString(value, ""));
}

async function loadConfigString(key: string, fallback = "") {
  const raw = await pluginConfig.load(key, fallback);
  const normalized = decodeConfigString(raw, fallback);
  const current =
    typeof raw === "string" ? raw : raw == null ? "" : String(raw);
  if (current !== normalized) {
    try {
      await saveConfigString(key, normalized);
    } catch {
      // ignore normalize write failure
    }
  }
  return normalized;
}

async function loadAuthAccount() {
  return (await loadConfigString(AUTH_ACCOUNT_CONFIG_KEY, "")).trim();
}

async function loadAuthPassword() {
  return await loadConfigString(AUTH_PASSWORD_CONFIG_KEY, "");
}

async function loadRecommendEnabled() {
  const value = (await loadConfigString(RECOMMEND_ENABLED_CONFIG_KEY, "false"))
    .trim()
    .toLowerCase();
  return value === "true" || value === "1" || value === "yes";
}

async function loadAuthToken() {
  if (authTokenCache !== null) {
    return authTokenCache;
  }
  if (authTokenInitPromise) {
    return authTokenInitPromise;
  }
  authTokenInitPromise = (async () => {
    const token = (await loadConfigString(AUTH_TOKEN_CONFIG_KEY, "")).trim();
    authTokenCache = token;
    return token;
  })();
  try {
    return await authTokenInitPromise;
  } finally {
    authTokenInitPromise = null;
  }
}

async function saveAuthToken(token: string) {
  const normalized = String(token ?? "").trim();
  authTokenCache = normalized;
  await saveConfigString(AUTH_TOKEN_CONFIG_KEY, normalized);
}

function createGraphQlQuery<T>(
  operationName: string,
  variables: Record<string, unknown>,
  query: string,
): GraphQlRequest {
  return {
    operationName,
    variables,
    query,
  };
}

function createClient() {
  const client = axios.create({
    baseURL: API_BASE,
    timeout: REQUEST_TIMEOUT_MS,
    headers: {
      Referer: `${API_BASE}/`,
      "User-Agent": DEFAULT_USER_AGENT,
      "Content-Type": "application/json",
    },
  });

  client.interceptors.request.use(
    async (config: InternalAxiosRequestConfig) => {
      const url = String(config.url ?? "");
      const token = await loadAuthToken();
      const headers = AxiosHeaders.from(config.headers ?? {});
      const skipAuth =
        config.headers?.["x-komiic-skip-auth"] === "1" ||
        headers.get("x-komiic-skip-auth") === "1";
      headers.delete("x-komiic-skip-auth");
      if (!skipAuth && token) {
        headers.set("Authorization", `Bearer ${token}`);
      } else {
        headers.delete("Authorization");
      }
      if (!headers.get("Referer")) {
        headers.set("Referer", `${API_BASE}/`);
      }
      if (!headers.get("User-Agent")) {
        headers.set("User-Agent", DEFAULT_USER_AGENT);
      }
      if (url.startsWith("/api/image/")) {
        headers.set(
          "Accept",
          "image/avif,image/webp,image/apng,image/*,*/*;q=0.8",
        );
      }
      config.headers = headers;
      return config;
    },
  );

  client.interceptors.response.use(
    async (response: AxiosResponse<GraphQlResponse<unknown>>) => {
      const data = response.data as GraphQlResponse<unknown> | undefined;
      const message = String(data?.errors?.[0]?.message ?? "").toLowerCase();
      const originalConfig = response.config as RetriableAxiosRequestConfig;
      if (
        response.config.url?.includes("/api/query") &&
        !originalConfig.__komiicRetryAuth &&
        message.includes("token is expired")
      ) {
        if (!(await canAutoLogin())) {
          return response;
        }
        let token = "";
        try {
          token = await loginWithStoredCredentials();
        } catch {
          await saveAuthToken("");
          throw new Error(data?.errors?.[0]?.message || "登录已过期");
        }
        if (!token) {
          throw new Error(data?.errors?.[0]?.message || "登录已过期");
        }
        originalConfig.__komiicRetryAuth = true;
        const nextHeaders = AxiosHeaders.from(originalConfig.headers ?? {});
        nextHeaders.set("Authorization", `Bearer ${token}`);
        originalConfig.headers = nextHeaders;
        return client.request(originalConfig);
      }
      return response;
    },
    async (error: AxiosError<GraphQlResponse<unknown>>) => {
      const response = error?.response;
      const originalConfig = (error?.config ??
        {}) as RetriableAxiosRequestConfig;
      const message = String(
        response?.data?.errors?.[0]?.message ?? error?.message ?? "",
      ).toLowerCase();
      if (
        response?.config?.url?.includes("/api/query") &&
        !originalConfig.__komiicRetryAuth &&
        message.includes("token is expired")
      ) {
        if (!(await canAutoLogin())) {
          throw error;
        }
        let token = "";
        try {
          token = await loginWithStoredCredentials();
        } catch {
          await saveAuthToken("");
          throw error;
        }
        originalConfig.__komiicRetryAuth = true;
        const nextHeaders = AxiosHeaders.from(originalConfig.headers ?? {});
        nextHeaders.set("Authorization", `Bearer ${token}`);
        originalConfig.headers = nextHeaders;
        return client.request(originalConfig);
      }
      throw error;
    },
  );

  return client;
}

const http = createClient();

async function loginWithPassword(payload: LoginPayload = {}) {
  const account = String(payload.account ?? "").trim();
  const password = String(payload.password ?? "");
  if (!account || !password.trim()) {
    if (payload.notifyResult) {
      await flutterTools.showToast({
        message: "Komiic 登录失败：账号或密码不能为空",
        level: "error",
      });
    }
    throw new Error("账号或密码不能为空，请先在设置中填写");
  }
  if (loginInFlight) {
    return loginInFlight;
  }
  loginInFlight = (async () => {
    try {
      const response = await http.post<{ token?: string }>(
        "/api/login",
        {
          email: account,
          password,
        },
        {
          timeout: REQUEST_TIMEOUT_MS,
          validateStatus: () => true,
          headers: {
            "Content-Type": "application/json",
            "x-komiic-skip-auth": "1",
          },
        },
      );
      const token = String(response.data?.token ?? "").trim();
      if (!token) {
        const remoteMessage =
          extractRemoteErrorMessage(response.data) ||
          `登录失败(${response.status})`;
        console.error("Komiic 登录失败: remote response", {
          status: response.status,
          data: response.data,
        });
        throw new Error(remoteMessage);
      }
      if (payload.persistCredentials !== false) {
        await Promise.all([
          saveConfigString(AUTH_ACCOUNT_CONFIG_KEY, account),
          saveConfigString(AUTH_PASSWORD_CONFIG_KEY, password),
        ]);
      }
      await saveAuthToken(token);
      if (payload.notifyResult) {
        await flutterTools.showToast({
          message: "Komiic 登录成功",
          level: "success",
        });
      }
      return token;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error ?? "登录失败");
      if (payload.notifyResult) {
        await flutterTools.showToast({
          message: `Komiic 登录失败：${errorMessage}`,
          level: "error",
        });
      }
      throw error;
    }
  })();

  try {
    return await loginInFlight;
  } finally {
    loginInFlight = null;
  }
}

async function loginWithStoredCredentials() {
  const [account, password] = await Promise.all([
    loadAuthAccount(),
    loadAuthPassword(),
  ]);
  if (!account || !String(password).trim()) {
    throw new Error("未配置账号密码，无法自动登录");
  }
  return await loginWithPassword({
    account,
    password,
    persistCredentials: true,
  });
}

async function canAutoLogin() {
  const [account, password] = await Promise.all([
    loadAuthAccount(),
    loadAuthPassword(),
  ]);
  return Boolean(account && String(password).trim());
}

async function ensureAuthenticated() {
  const [account, password, token] = await Promise.all([
    loadAuthAccount(),
    loadAuthPassword(),
    loadAuthToken(),
  ]);
  if (!account || !String(password).trim()) {
    throw new Error("请先填写账号密码");
  }
  if (!token) {
    throw new Error("请先登录账号");
  }
  return token;
}

async function queryGraphQl<T>(
  request: GraphQlRequest,
  options: GraphQlCallOptions = {},
) {
  const response = await http.post<
    GraphQlResponse<T>,
    AxiosResponse<GraphQlResponse<T>>,
    GraphQlRequest
  >("/api/query", request, {
    headers: options.skipAuth ? { "x-komiic-skip-auth": "1" } : undefined,
  });
  if (response.status !== 200) {
    throw new Error(`Invalid Status Code ${response.status}`);
  }
  const json = response.data;
  if (json.errors?.length) {
    throw new Error(json.errors[0]?.message || "请求失败");
  }
  if (!json.data) {
    throw new Error("接口未返回数据");
  }
  return json.data;
}

function mapComicToGrid(comic: KomiicComic) {
  const comicId = String(comic.id ?? "").trim();
  const title = String(comic.title ?? "").trim() || comicId;
  const authorNames = Array.isArray(comic.authors)
    ? comic.authors
        .map((item) => String(item?.name ?? "").trim())
        .filter(Boolean)
    : [];
  const categoryNames = Array.isArray(comic.categories)
    ? comic.categories
        .map((item) => String(item?.name ?? "").trim())
        .filter(Boolean)
    : [];
  const statusText = String(comic.status ?? "").trim();
  const updatedAt = formatDateTime(comic.dateUpdated);
  const relativeUpdate = getRelativeUpdateText(comic.dateUpdated);
  const subtitle = authorNames.join(" / ");
  const coverPath = `comic/${comicId}/cover.jpg`;
  return {
    source: PLUGIN_ID,
    id: comicId,
    title,
    subtitle,
    finished: statusText === "END",
    likesCount: toNumber(comic.favoriteCount, 0),
    viewsCount: toNumber(comic.views, 0),
    updatedAt,
    cover: {
      id: comicId,
      url: String(comic.imageUrl ?? "").trim() || NOT_FOUND_IMAGE_URL,
      path: coverPath,
      name: `${comicId}.jpg`,
      extern: {},
    },
    metadata: [
      createBasicMetadata("author", "作者", authorNames),
      createBasicMetadata("categories", "分类", categoryNames),
      createBasicMetadata("status", "状态", statusText ? [statusText] : []),
      createBasicMetadata(
        "update",
        "更新",
        relativeUpdate ? [relativeUpdate] : [],
      ),
      createBasicMetadata("works", "作品", []),
      createBasicMetadata("actors", "角色", []),
    ],
    raw: comic,
    extern: {
      comicId,
      author: subtitle,
      tags: categoryNames,
      updateTime: formatDateOnly(comic.dateUpdated),
      description: relativeUpdate,
    },
  };
}

function mapComicToRecommend(
  comic: Pick<KomiicComic, "id" | "title" | "imageUrl">,
): RecommendItem {
  const comicId = String(comic.id ?? "").trim();
  const title = String(comic.title ?? "").trim() || comicId;
  const coverUrl = String(comic.imageUrl ?? "").trim();
  return {
    source: PLUGIN_ID,
    id: comicId,
    title,
    subtitle: "",
    finished: false,
    likesCount: 0,
    viewsCount: 0,
    updatedAt: "",
    cover: createImage({
      id: comicId,
      url: coverUrl || NOT_FOUND_IMAGE_URL,
      name: `${comicId}.jpg`,
      path: `comic/${comicId}/cover.jpg`,
      extern: {},
    }),
    metadata: [],
    raw: {
      id: comicId,
      title,
      imageUrl: coverUrl,
    },
    extern: {
      comicId,
    },
  };
}

function mapComment(item: KomiicComment) {
  const id = String(item.id ?? "").trim();
  const avatarUrl = String(item.account?.profileImageUrl ?? "").trim();
  return {
    id,
    author: {
      name: String(item.account?.nickname ?? "").trim() || "Komiic 用户",
      avatar: {
        url: avatarUrl || NOT_FOUND_IMAGE_URL,
        path: avatarUrl ? `comment/${id}/avatar.jpg` : PLACEHOLDER_IMAGE_PATH,
      },
    },
    content: String(item.message ?? ""),
    createdAt: formatDateTime(item.dateUpdated ?? item.dateCreated),
    replyCount: 0,
    replies: [],
    extern: {
      comicId: String(item.comicId ?? "").trim(),
      commentId: id,
      replyToId: String(item.replyTo?.id ?? "").trim(),
    },
  };
}

function mapSnapshotAction(item: unknown) {
  const row = toStringMap(item);
  return {
    name: String(row.name ?? ""),
    onTap: toStringMap(row.onTap),
    extern: toStringMap(row.extern),
  };
}

function mapSnapshotMetadata(item: unknown) {
  const row = toStringMap(item);
  const value = Array.isArray(row.value) ? row.value : [];
  return {
    type: String(row.type ?? ""),
    name: String(row.name ?? ""),
    value: value.map((entry) => mapSnapshotAction(entry)),
  };
}

function normalizeChapterRefs(items: unknown[]) {
  return items
    .map((item) => toStringMap(item))
    .map((item) => ({
      id: String(item.id ?? "").trim(),
      requestId: String(item.requestId ?? item.id ?? "").trim(),
      logicalKey: String(item.logicalKey ?? item.id ?? "").trim(),
      storageChapterId: String(item.storageChapterId ?? item.id ?? "").trim(),
      name: String(item.name ?? "").trim(),
      order: toNumber(item.order, 0),
      extern: toStringMap(item.extern),
    }))
    .filter((item) => item.id);
}

function pickTargetChapter(
  chapters: Array<{
    id: string;
    requestId: string;
    logicalKey: string;
    storageChapterId: string;
    name: string;
    order: number;
    extern: Record<string, unknown>;
  }>,
  payload: ReadSnapshotPayload | ChapterPayload,
) {
  const extern = toStringMap(payload.extern);
  const chapterId = String(payload.chapterId ?? extern.chapterId ?? "").trim();
  const order = toNumber(extern.order ?? extern.sort, 0);
  return (
    chapters.find(
      (item) => item.id === chapterId || item.requestId === chapterId,
    ) ??
    chapters.find((item) => order > 0 && item.order === order) ??
    chapters[0]
  );
}

async function fetchRecentUpdate(page: number) {
  const data = await queryGraphQl<{ recentUpdate: KomiicComic[] }>(
    createGraphQlQuery(
      "recentUpdate",
      {
        pagination: {
          limit: SEARCH_PAGE_SIZE,
          offset: (page - 1) * SEARCH_PAGE_SIZE,
          orderBy: "DATE_UPDATED",
          status: "",
          asc: true,
        },
      },
      `query recentUpdate($pagination: Pagination!) {
        recentUpdate(pagination: $pagination) {
          id
          title
          status
          imageUrl
          authors { id name }
          categories { id name }
          dateUpdated
          monthViews
          views
          favoriteCount
          lastChapterUpdate
        }
      }`,
    ),
    { skipAuth: true },
  );
  return Array.isArray(data.recentUpdate) ? data.recentUpdate : [];
}

async function searchComicsByKeyword(keyword: string) {
  const data = await queryGraphQl<{
    searchComicsAndAuthors: {
      comics?: KomiicComic[];
      authors?: Array<{ id?: string; name?: string; comicCount?: number }>;
    };
  }>(
    createGraphQlQuery(
      "searchComicAndAuthorQuery",
      {
        keyword,
      },
      `query searchComicAndAuthorQuery($keyword: String!) {
        searchComicsAndAuthors(keyword: $keyword) {
          comics {
            id
            title
            status
            imageUrl
            authors { id name }
            categories { id name }
            dateUpdated
            monthViews
            views
            favoriteCount
            lastChapterUpdate
          }
          authors {
            id
            name
            comicCount
          }
        }
      }`,
    ),
    { skipAuth: true },
  );
  return toStringMap(data.searchComicsAndAuthors);
}

async function fetchComicByIds(ids: string[]) {
  const uniqueIds = Array.from(
    new Set(ids.map((item) => String(item ?? "").trim()).filter(Boolean)),
  );
  if (!uniqueIds.length) {
    return [];
  }
  const data = await queryGraphQl<{ comicByIds: KomiicComic[] }>(
    createGraphQlQuery(
      "comicByIds",
      {
        comicIds: uniqueIds,
      },
      `query comicByIds($comicIds: [ID]!) {
        comicByIds(comicIds: $comicIds) {
          id
          title
          status
          imageUrl
          authors { id name }
          categories { id name }
          dateUpdated
          monthViews
          views
          favoriteCount
          lastChapterUpdate
        }
      }`,
    ),
    { skipAuth: true },
  );
  return Array.isArray(data.comicByIds) ? data.comicByIds : [];
}

async function fetchComicBasicsByIds(ids: string[]) {
  const uniqueIds = Array.from(
    new Set(ids.map((item) => String(item ?? "").trim()).filter(Boolean)),
  );
  if (!uniqueIds.length) {
    return [];
  }
  const data = await queryGraphQl<{
    comicByIds: Array<Pick<KomiicComic, "id" | "title" | "imageUrl">>;
  }>(
    createGraphQlQuery(
      "comicByIds",
      {
        comicIds: uniqueIds,
      },
      `query comicByIds($comicIds: [ID]!) {
        comicByIds(comicIds: $comicIds) {
          id
          title
          imageUrl
        }
      }`,
    ),
    { skipAuth: true },
  );
  return Array.isArray(data.comicByIds) ? data.comicByIds : [];
}

async function fetchRecommendIds(comicId: string) {
  const data = await queryGraphQl<{ recommendComicById: string[] }>(
    createGraphQlQuery(
      "recommendComicById",
      {
        comicId,
      },
      `query recommendComicById($comicId: ID!) {
        recommendComicById(comicId: $comicId)
      }`,
    ),
    { skipAuth: true },
  );
  return Array.isArray(data.recommendComicById)
    ? data.recommendComicById
        .map((item: string) => String(item ?? "").trim())
        .filter(Boolean)
    : [];
}

async function fetchChaptersByComicId(comicId: string) {
  const data = await queryGraphQl<{ chaptersByComicId: KomiicChapter[] }>(
    createGraphQlQuery(
      "chapterByComicId",
      {
        comicId,
      },
      `query chapterByComicId($comicId: ID!) {
        chaptersByComicId(comicId: $comicId) {
          id
          serial
          type
          dateUpdated
        }
      }`,
    ),
    { skipAuth: true },
  );
  return Array.isArray(data.chaptersByComicId) ? data.chaptersByComicId : [];
}

async function fetchImagesByChapterId(chapterId: string) {
  const data = await queryGraphQl<{ imagesByChapterId: KomiicImage[] }>(
    createGraphQlQuery(
      "imagesByChapterId",
      {
        chapterId,
      },
      `query imagesByChapterId($chapterId: ID!) {
        imagesByChapterId(chapterId: $chapterId) {
          id
          kid
          height
          width
        }
      }`,
    ),
    { skipAuth: true },
  );
  return Array.isArray(data.imagesByChapterId) ? data.imagesByChapterId : [];
}

async function fetchComicByCategories(
  page: number,
  categoryId: string,
  orderBy: string,
  status: string,
) {
  const data = await queryGraphQl<{ comicByCategories: KomiicComic[] }>(
    createGraphQlQuery(
      "comicByCategories",
      {
        categoryId: categoryId && categoryId !== "0" ? [categoryId] : [],
        pagination: {
          limit: CATEGORY_PAGE_SIZE,
          offset: (page - 1) * CATEGORY_PAGE_SIZE,
          orderBy,
          asc: false,
          status,
        },
      },
      `query comicByCategories($categoryId: [ID!]!, $pagination: Pagination!) {
        comicByCategories(categoryId: $categoryId, pagination: $pagination) {
          id
          title
          status
          imageUrl
          authors { id name }
          categories { id name }
          dateUpdated
          monthViews
          views
          favoriteCount
          lastChapterUpdate
        }
      }`,
    ),
    { skipAuth: true },
  );
  return Array.isArray(data.comicByCategories) ? data.comicByCategories : [];
}

async function fetchHotComics(page: number, orderBy: string) {
  const data = await queryGraphQl<{ hotComics: KomiicComic[] }>(
    createGraphQlQuery(
      "hotComics",
      {
        pagination: {
          limit: SEARCH_PAGE_SIZE,
          offset: (page - 1) * SEARCH_PAGE_SIZE,
          orderBy,
          status: "",
          asc: true,
        },
      },
      `query hotComics($pagination: Pagination!) {
        hotComics(pagination: $pagination) {
          id
          title
          status
          imageUrl
          authors { id name }
          categories { id name }
          dateUpdated
          monthViews
          views
          favoriteCount
          lastChapterUpdate
        }
      }`,
    ),
    { skipAuth: true },
  );
  return Array.isArray(data.hotComics) ? data.hotComics : [];
}

async function fetchFolders() {
  await ensureAuthenticated();
  const data = await queryGraphQl<{ folders: KomiicFolder[] }>(
    createGraphQlQuery(
      "myFolder",
      {},
      `query myFolder {
        folders {
          id
          key
          name
          comicCount
          dateUpdated
        }
      }`,
    ),
  );
  return Array.isArray(data.folders) ? data.folders : [];
}

async function fetchComicFolderIds(comicId: string) {
  await ensureAuthenticated();
  const data = await queryGraphQl<{ comicInAccountFolders: string[] }>(
    createGraphQlQuery(
      "comicInAccountFolders",
      {
        comicId,
      },
      `query comicInAccountFolders($comicId: ID!) {
        comicInAccountFolders(comicId: $comicId)
      }`,
    ),
  );
  return Array.isArray(data.comicInAccountFolders)
    ? data.comicInAccountFolders
        .map((item: string) => String(item ?? "").trim())
        .filter(Boolean)
    : [];
}

async function addComicToFolder(comicId: string, folderId: string) {
  await ensureAuthenticated();
  await queryGraphQl<{ addComicToFolder: boolean }>(
    createGraphQlQuery(
      "addComicToFolder",
      {
        comicId,
        folderId,
      },
      `mutation addComicToFolder($comicId: ID!, $folderId: ID!) {
        addComicToFolder(comicId: $comicId, folderId: $folderId)
      }`,
    ),
  );
}

async function removeComicFromFolder(comicId: string, folderId: string) {
  await ensureAuthenticated();
  await queryGraphQl<{ removeComicToFolder: boolean }>(
    createGraphQlQuery(
      "removeComicToFolder",
      {
        comicId,
        folderId,
      },
      `mutation removeComicToFolder($comicId: ID!, $folderId: ID!) {
        removeComicToFolder(comicId: $comicId, folderId: $folderId)
      }`,
    ),
  );
}

async function createFolder(name: string) {
  await ensureAuthenticated();
  const data = await queryGraphQl<{
    createFolder: {
      id?: string;
      name?: string;
    };
  }>(
    createGraphQlQuery(
      "createFolder",
      {
        name,
      },
      `mutation createFolder($name: String!) {
        createFolder(name: $name) {
          id
          name
        }
      }`,
    ),
  );
  return toStringMap(data.createFolder);
}

async function fetchFolderComicIds(
  page: number,
  folderId: string,
  orderBy: string,
) {
  await ensureAuthenticated();
  const data = await queryGraphQl<{
    folderComicIds: {
      comicIds?: string[];
    };
  }>(
    createGraphQlQuery(
      "folderComicIds",
      {
        folderId,
        pagination: {
          limit: CATEGORY_PAGE_SIZE,
          offset: (page - 1) * CATEGORY_PAGE_SIZE,
          orderBy,
          status: "",
          asc: true,
        },
      },
      `query folderComicIds($folderId: ID!, $pagination: Pagination!) {
        folderComicIds(folderId: $folderId, pagination: $pagination) {
          comicIds
        }
      }`,
    ),
  );
  const ids = toStringMap(data.folderComicIds).comicIds;
  return Array.isArray(ids)
    ? ids.map((item: string) => String(item ?? "").trim()).filter(Boolean)
    : [];
}

async function fetchCommentsByComicId(comicId: string, page: number) {
  const data = await queryGraphQl<{ getMessagesByComicId: KomiicComment[] }>(
    createGraphQlQuery(
      "getMessagesByComicId",
      {
        comicId,
        pagination: {
          limit: 100,
          offset: (page - 1) * 100,
          orderBy: "DATE_UPDATED",
          asc: true,
        },
      },
      `query getMessagesByComicId($comicId: ID!, $pagination: Pagination!) {
        getMessagesByComicId(comicId: $comicId, pagination: $pagination) {
          id
          comicId
          account {
            id
            nickname
            profileImageUrl
          }
          message
          replyTo {
            id
          }
          dateUpdated
          dateCreated
        }
      }`,
    ),
    { skipAuth: true },
  );
  return Array.isArray(data.getMessagesByComicId)
    ? data.getMessagesByComicId
    : [];
}

async function fetchCommentReplies(commentId: string) {
  const data = await queryGraphQl<{ messageChan: KomiicComment[] }>(
    createGraphQlQuery(
      "messageChan",
      {
        messageId: commentId,
      },
      `query messageChan($messageId: ID!) {
        messageChan(messageId: $messageId) {
          id
          comicId
          account {
            id
            nickname
            profileImageUrl
          }
          message
          replyTo {
            id
          }
          dateUpdated
          dateCreated
        }
      }`,
    ),
    { skipAuth: true },
  );
  return Array.isArray(data.messageChan) ? data.messageChan : [];
}

async function fetchCommentCountByComicId(comicId: string) {
  const data = await queryGraphQl<{ messageCountByComicId: number }>(
    {
      operationName: "messageCountByComicId",
      variables: {
        comicId,
      },
      query: `query messageCountByComicId($comicId: ID!) {
        messageCountByComicId(comicId: $comicId)
      }`,
    },
    { skipAuth: true },
  );
  return toNumber(data.messageCountByComicId, 0);
}

function getFirstFolderId(folders: KomiicFolder[]) {
  return String(folders[0]?.id ?? "").trim();
}

async function resolveFavoriteFolderId(folderId: string) {
  const normalized = String(folderId ?? "").trim();
  if (normalized && normalized !== DEFAULT_FAVORITE_FOLDER_ID) {
    return normalized;
  }
  const folders = await fetchFolders();
  return getFirstFolderId(folders);
}

async function getInfo(): Promise<PluginInfo> {
  return buildPluginInfo();
}

async function getCapabilities(): Promise<CapabilitiesBundleContract> {
  return {
    source: PLUGIN_ID,
    scheme: {
      version: "1.0.0",
      type: "capabilities",
      actions: [
        { key: "search", title: "搜索", fnPath: "searchComic" },
        { key: "recent", title: "最近更新", fnPath: "getHomeRecent" },
        { key: "rank", title: "排行榜", fnPath: "getHomeRanking" },
        { key: "category", title: "分类", fnPath: "getHomeCategory" },
        {
          key: "favorite",
          title: "收藏",
          fnPath: "getCloudFavoriteSceneBundle",
        },
      ],
    },
    data: {},
  };
}

async function searchComic(
  payload: SearchPayload = {},
): Promise<SearchResultContract> {
  const extern = toStringMap(payload.extern);
  const page = Math.max(1, toNumber(payload.page ?? extern.page, 1));
  const keyword = String(payload.keyword ?? extern.keyword ?? "").trim();
  const searchMode = String(extern.mode ?? "").trim();

  let comics: KomiicComic[] = [];
  let total = 0;

  if (searchMode === "recent") {
    comics = await fetchRecentUpdate(page);
    total =
      page * SEARCH_PAGE_SIZE + (comics.length === SEARCH_PAGE_SIZE ? 1 : 0);
  } else if (searchMode === "category") {
    const categoryId = String(extern.categoryId ?? "0").trim() || "0";
    const orderBy =
      String(extern.orderBy ?? CATEGORY_SORT_OPTIONS[0].value).trim() ||
      CATEGORY_SORT_OPTIONS[0].value;
    const status = String(extern.status ?? "").trim();
    comics = await fetchComicByCategories(page, categoryId, orderBy, status);
    total =
      page * CATEGORY_PAGE_SIZE +
      (comics.length === CATEGORY_PAGE_SIZE ? 1 : 0);
  } else if (searchMode === "ranking") {
    const orderBy =
      String(extern.orderBy ?? RANKING_OPTIONS[0].value).trim() ||
      RANKING_OPTIONS[0].value;
    comics = await fetchHotComics(page, orderBy);
    total =
      page * SEARCH_PAGE_SIZE + (comics.length === SEARCH_PAGE_SIZE ? 1 : 0);
  } else {
    if (!keyword) {
      throw new Error("keyword 不能为空");
    }
    const searchResult = await searchComicsByKeyword(keyword);
    comics = (
      Array.isArray(searchResult.comics) ? searchResult.comics : []
    ) as KomiicComic[];
    total = comics.length;
  }

  const items = comics
    .map((item) => mapComicToGrid(item))
    .filter((item) => item.id);
  const pageSize =
    searchMode === "category" ? CATEGORY_PAGE_SIZE : SEARCH_PAGE_SIZE;
  const pages =
    searchMode || keyword
      ? Math.max(
          1,
          items.length < pageSize && page === 1
            ? 1
            : page + (items.length === pageSize ? 1 : 0),
        )
      : 1;
  const paging = createPagingInfo(page, pages, Math.max(total, items.length));
  paging.hasReachedMax = items.length < pageSize;
  paging.pages = paging.hasReachedMax ? page : Math.max(page + 1, paging.pages);

  return {
    source: PLUGIN_ID,
    extern: payload.extern ?? null,
    scheme: {
      version: "1.0.0",
      type: "searchResult",
      source: PLUGIN_ID,
      list: "comicGrid",
    },
    data: {
      paging,
      items,
    },
    paging,
    items,
  };
}

async function getHomeRecent(
  payload: SearchPayload = {},
): Promise<ComicPagedListContract> {
  const result = await searchComic({
    page: payload.page,
    extern: {
      ...(payload.extern ?? {}),
      mode: "recent",
    },
  });
  return {
    source: result.source,
    extern: result.extern,
    scheme: result.scheme,
    data: {
      items: result.data.items,
      hasReachedMax: result.data.paging.hasReachedMax,
    },
  };
}

async function getHomeRanking(
  payload: SearchPayload = {},
): Promise<ComicPagedListContract> {
  const result = await searchComic({
    page: payload.page,
    extern: {
      ...(payload.extern ?? {}),
      mode: "ranking",
      orderBy:
        String(
          toStringMap(payload.extern).orderBy ?? RANKING_OPTIONS[0].value,
        ).trim() || RANKING_OPTIONS[0].value,
    },
  });
  return {
    source: result.source,
    extern: result.extern,
    scheme: result.scheme,
    data: {
      items: result.data.items,
      hasReachedMax: result.data.paging.hasReachedMax,
    },
  };
}

async function getHomeCategory(
  payload: SearchPayload = {},
): Promise<ComicPagedListContract> {
  const result = await searchComic({
    page: payload.page,
    extern: {
      ...(payload.extern ?? {}),
      mode: "category",
      categoryId:
        String(toStringMap(payload.extern).categoryId ?? "0").trim() || "0",
      orderBy:
        String(
          toStringMap(payload.extern).orderBy ?? CATEGORY_SORT_OPTIONS[0].value,
        ).trim() || CATEGORY_SORT_OPTIONS[0].value,
      status: String(toStringMap(payload.extern).status ?? "").trim(),
    },
  });
  return {
    source: result.source,
    extern: result.extern,
    scheme: result.scheme,
    data: {
      items: result.data.items,
      hasReachedMax: result.data.paging.hasReachedMax,
    },
  };
}

async function getHomeCategoryFilterBundle(): Promise<FilterBundleContract> {
  return {
    source: PLUGIN_ID,
    scheme: {
      version: "1.0.0",
      type: "filter",
      fields: [
        {
          key: "categoryId",
          kind: "choice" as const,
          label: "主题",
          options: CATEGORY_OPTIONS.map((item) => ({
            label: item.label,
            value: item.value,
            result: {
              extern: {
                categoryId: item.value,
              },
            },
          })),
        },
        {
          key: "orderBy",
          kind: "choice" as const,
          label: "排序",
          options: CATEGORY_SORT_OPTIONS.map((item) => ({
            label: item.label,
            value: item.value,
            result: {
              extern: {
                orderBy: item.value,
              },
            },
          })),
        },
        {
          key: "status",
          kind: "choice" as const,
          label: "状态",
          options: CATEGORY_STATUS_OPTIONS.map((item) => ({
            label: item.label,
            value: item.value,
            result: {
              extern: {
                status: item.value,
              },
            },
          })),
        },
      ],
    },
    data: {
      values: {
        categoryId: "0",
        orderBy: "DATE_UPDATED",
        status: "",
      },
    },
  };
}

async function getHomeRankingFilterBundle(): Promise<FilterBundleContract> {
  return {
    source: PLUGIN_ID,
    scheme: {
      version: "1.0.0",
      type: "filter",
      fields: [
        {
          key: "orderBy",
          kind: "choice" as const,
          label: "榜单",
          options: RANKING_OPTIONS.map((item) => ({
            label: item.label,
            value: item.value,
            result: {
              extern: {
                orderBy: item.value,
              },
            },
          })),
        },
      ],
    },
    data: { values: { orderBy: "MONTH_VIEWS" } },
  };
}

async function getCloudFavoriteFilterBundle(
  payload: { extern?: Record<string, unknown> } = {},
): Promise<FilterBundleContract> {
  try {
    await ensureAuthenticated();
  } catch (e) {
    console.error("fetchFolders error", e);
    return {
      source: PLUGIN_ID,
      scheme: {
        version: "1.0.0",
        type: "filter",
        fields: [],
      },
      data: { values: {} },
    };
  }

  const extern = toStringMap(payload.extern);
  const folders = await fetchFolders();
  const selectedFolderId =
    String(
      toStringMap(payload)["folderId"] ?? extern["folderId"] ?? "",
    ).trim() ||
    getFirstFolderId(folders) ||
    DEFAULT_FAVORITE_FOLDER_ID;
  const folderOptions = folders.map((item: KomiicFolder) => ({
    label: String(item.name ?? "").trim() || "未命名收藏夹",
    value: String(item.id ?? "").trim(),
    result: {
      extern: {
        folderId: String(item.id ?? "").trim(),
        order: String(extern.order ?? "DATE_UPDATED"),
      },
    },
  }));

  return {
    source: PLUGIN_ID,
    scheme: {
      version: "1.0.0",
      type: "filter",
      title: "云端收藏筛选",
      fields: [
        {
          key: "folderId",
          kind: "choice",
          label: "收藏夹",
          options: folderOptions,
        },
        {
          key: "order",
          kind: "choice",
          label: "排序",
          options: [
            {
              label: "更新时间",
              value: "DATE_UPDATED",
              result: {
                extern: { order: "DATE_UPDATED" },
              },
            },
            {
              label: "观看数",
              value: "VIEWS",
              result: {
                extern: { order: "VIEWS" },
              },
            },
            {
              label: "收藏数",
              value: "FAVORITE_COUNT",
              result: {
                extern: { order: "FAVORITE_COUNT" },
              },
            },
          ],
        },
      ],
    },
    data: {
      values: {
        folderId: selectedFolderId,
        order: String(
          toStringMap(payload)["order"] ?? extern["order"] ?? "DATE_UPDATED",
        ),
        folders: folders.map((item: KomiicFolder) => ({
          id: String(item.id ?? "").trim(),
          name: String(item.name ?? "").trim() || "未命名收藏夹",
          comicCount: toNumber(item.comicCount, 0),
          updatedAt: formatDateTime(item.dateUpdated),
        })),
      },
    },
  };
}

async function getCloudFavoriteSceneBundle(): Promise<ComicListSceneBundleContract> {
  return {
    source: PLUGIN_ID,
    scheme: {
      version: "1.0.0",
      type: "comicListSceneBundle",
    },
    data: {
      scene: {
        title: "云端收藏",
        source: PLUGIN_ID,
        body: {
          type: "pluginPagedComicList",
          request: {
            fnPath: "getCloudFavoriteData",
            core: {},
            extern: {
              source: "cloudFavorite",
              folderId: DEFAULT_FAVORITE_FOLDER_ID,
              order: "DATE_UPDATED",
            },
          },
        },
        filter: {
          fnPath: "getCloudFavoriteFilterBundle",
          extern: {
            source: "cloudFavorite",
            folderId: DEFAULT_FAVORITE_FOLDER_ID,
            order: "DATE_UPDATED",
          },
        },
      },
    },
  };
}

async function getComicDetail(
  payload: ComicDetailPayload = {},
): Promise<ComicDetailContract> {
  const extern = toStringMap(payload.extern);
  const comicId = String(payload.comicId ?? extern.comicId ?? "").trim();
  if (!comicId) {
    throw new Error("comicId 不能为空");
  }

  const recommendEnabled = await loadRecommendEnabled();
  const recommendIdsPromise = recommendEnabled
    ? fetchRecommendIds(comicId)
    : Promise.resolve([] as string[]);
  const [recommendIds, chapters, favoriteFolderIds, totalComments] =
    await Promise.all([
      recommendIdsPromise,
      fetchChaptersByComicId(comicId),
      fetchComicFolderIds(comicId).catch(() => [] as string[]),
      fetchCommentCountByComicId(comicId).catch(() => 0),
    ]);
  const [comicList, recommendComics] = await Promise.all([
    fetchComicByIds([comicId]),
    recommendIds.length ? fetchComicBasicsByIds(recommendIds) : [],
  ]);

  const targetComic =
    comicList.find((item) => String(item.id ?? "").trim() === comicId) ??
    comicList[0];
  if (!targetComic) {
    throw new Error("未找到漫画详情");
  }

  console.log(targetComic);

  const recommend = recommendComics
    .filter((item) => String(item.id ?? "").trim() !== comicId)
    .map((item) => mapComicToRecommend(item));
  const authorNames = Array.isArray(targetComic.authors)
    ? targetComic.authors
        .map((item: { id?: string; name?: string }) =>
          String(item?.name ?? "").trim(),
        )
        .filter(Boolean)
    : [];
  const tags = Array.isArray(targetComic.categories)
    ? targetComic.categories
        .map((item: { id?: string; name?: string }) =>
          String(item?.name ?? "").trim(),
        )
        .filter(Boolean)
    : [];
  const mappedChapters = chapters
    .map((item: KomiicChapter, index: number) => {
      const chapterId = String(item.id ?? "").trim();
      if (!chapterId) return null;
      const serial = String(item.serial ?? "").trim();
      const type = String(item.type ?? "").trim();
      const chapterName =
        type === "book" ? `卷${serial}` : serial || `第${index + 1}话`;
      return {
        id: chapterId,
        requestId: chapterId,
        logicalKey: chapterId,
        storageChapterId: chapterId,
        name: chapterName,
        order: index + 1,
        extern: {
          serial,
          type,
          updatedAt: formatDateTime(item.dateUpdated),
        },
      };
    })
    .filter((item): item is NonNullable<typeof item> => item !== null);

  const title = String(targetComic.title ?? "").trim() || comicId;
  const coverUrl = String(targetComic.imageUrl ?? "").trim();
  const subtitle = authorNames.join(" / ");
  const statusText = String(targetComic.status ?? "").trim();
  const updateText = formatDateTime(targetComic.dateUpdated);

  const normal = {
    comicInfo: {
      id: comicId,
      title,
      titleMeta: [
        createActionItem(`作者：${subtitle || "未知"}`),
        createActionItem(`状态：${statusText || "未知"}`),
        createActionItem(`更新：${updateText || "未知"}`),
        createActionItem(`章节数：${mappedChapters.length}`),
        createActionItem(`观看：${toNumber(targetComic.views, 0)}`),
      ],
      creator: {
        id: "",
        name: "",
        avatar: createImage({
          id: "",
          url: "",
          name: "",
          path: "",
          extern: {},
        }),
        onTap: {},
        extern: {},
      },
      description: getRelativeUpdateText(targetComic.dateUpdated),
      cover: createImage({
        id: comicId,
        url: coverUrl || NOT_FOUND_IMAGE_URL,
        name: `${comicId}.jpg`,
        path: `comic/${comicId}/cover.jpg`,
        extern: {},
      }),
      metadata: [
        createMetadataActionList("author", "作者", authorNames, (item) =>
          createActionItem(item, openSearchAction(item)),
        ),
        createMetadataActionList("tags", "标签", tags, (item) =>
          createActionItem(item, openSearchAction(item)),
        ),
      ].filter((item) => Array.isArray(toStringMap(item).value)),
      extern: {
        comicId,
        updateTime: formatDateOnly(targetComic.dateUpdated),
      },
    },
    eps: mappedChapters,
    recommend,
    totalViews: toNumber(targetComic.views, 0),
    totalLikes: toNumber(targetComic.favoriteCount, 0),
    totalComments,
    isFavourite: favoriteFolderIds.length > 0,
    isLiked: false,
    allowComments: true,
    allowLike: false,
    allowCollected: true,
    allowDownload: true,
    extern: {},
  };

  return {
    source: PLUGIN_ID,
    comicId,
    extern: payload.extern ?? null,
    scheme: {
      version: "1.0.0",
      type: "comicDetail",
      source: PLUGIN_ID,
    },
    data: {
      normal,
      raw: {
        comicInfo: targetComic,
        series: chapters,
      },
    },
  };
}

async function getChapter(
  payload: ChapterPayload = {},
): Promise<ChapterContentContract> {
  const extern = toStringMap(payload.extern);
  const comicId = String(payload.comicId ?? extern.comicId ?? "").trim();
  if (!comicId) {
    throw new Error("comicId 不能为空");
  }

  const detail = await getComicDetail({
    comicId,
    extern: payload.extern,
  });
  const normal = toStringMap(toStringMap(detail.data).normal);
  const chapters = normalizeChapterRefs(
    Array.isArray(normal.eps) ? normal.eps : [],
  );
  if (!chapters.length) {
    throw new Error("未找到章节");
  }
  const target = pickTargetChapter(chapters, payload);
  if (!target) {
    throw new Error("chapterId 不能为空");
  }

  const images = await fetchImagesByChapterId(target.id);
  const pages = images
    .map((item: KomiicImage, index: number) => {
      const kid = String(item.kid ?? "").trim();
      if (!kid) return null;
      const url = `${API_BASE}/api/image/${kid}`;
      const name = extractImageName(url, index);
      return {
        id: String(item.id ?? `${target.id}-${index + 1}`),
        name,
        path: `comic/${comicId}/${target.id}/${name}`,
        url,
        extern: {
          kid,
          index: index + 1,
          headers: {
            "user-agent": DEFAULT_USER_AGENT,
            referer: `${API_BASE}/comic/${comicId}/chapter/${target.id}/images/all`,
          },
        },
      };
    })
    .filter((item): item is NonNullable<typeof item> => item !== null);

  const chapter: ChapterWithPages = {
    id: target.id,
    requestId: target.requestId,
    logicalKey: target.logicalKey,
    storageChapterId: target.storageChapterId,
    name: target.name || `章节 ${target.id}`,
    order: target.order,
    pages,
    extern: target.extern,
  };

  return {
    source: PLUGIN_ID,
    comicId,
    chapterId: target.id,
    extern: payload.extern ?? null,
    scheme: {
      version: "1.0.0" as const,
      type: "chapterContent" as const,
      source: PLUGIN_ID,
    },
    data: {
      comic: {
        id: comicId,
        source: PLUGIN_ID,
        title: target.name || `章节 ${target.id}`,
        extern: {},
      },
      chapter,
      chapters: chapters.map((item) => ({
        id: item.id,
        requestId: item.requestId,
        logicalKey: item.logicalKey,
        storageChapterId: item.storageChapterId,
        name: item.name || `章节 ${item.id}`,
        order: item.order,
        extern: item.extern,
      })),
    },
  };
}

async function getReadSnapshot(
  payload: ReadSnapshotPayload = {},
): Promise<ReadSnapshotContract> {
  const extern = toStringMap(payload.extern);
  const comicId = String(payload.comicId ?? extern.comicId ?? "").trim();
  if (!comicId) {
    throw new Error("comicId 不能为空");
  }

  const detail = await getComicDetail({
    comicId,
    extern: payload.extern,
  });
  const normal = toStringMap(toStringMap(detail.data).normal);
  const comicInfo = toStringMap(normal.comicInfo);
  const chapters = normalizeChapterRefs(
    Array.isArray(normal.eps) ? normal.eps : [],
  );
  if (!chapters.length) {
    throw new Error("未找到可阅读章节");
  }
  const target = pickTargetChapter(chapters, payload);
  if (!target) {
    throw new Error("未找到可阅读章节");
  }

  const chapterBundle = await getChapter({
    comicId,
    chapterId: target.id,
    extern: payload.extern,
  });
  const chapterData = chapterBundle.data.chapter;
  const pages = chapterData.pages.map((page: any) => ({
    id: String(page.id ?? ""),
    name: String(page.name ?? ""),
    path: String(page.path ?? ""),
    url: String(page.url ?? ""),
    extern: toStringMap(page.extern),
  }));

  return {
    source: PLUGIN_ID,
    extern: payload.extern ?? null,
    data: {
      comic: {
        id: String(comicInfo.id ?? comicId),
        source: PLUGIN_ID,
        title: String(comicInfo.title ?? ""),
        extern: toStringMap(comicInfo.extern),
      },
      chapter: {
        id: target.id,
        requestId: target.requestId,
        logicalKey: target.logicalKey,
        storageChapterId: target.storageChapterId,
        name: String(chapterData.name ?? target.name ?? ""),
        order: target.order,
        pages,
        extern: target.extern,
      },
      chapters: chapters.map((item) => ({
        id: item.id,
        requestId: item.requestId,
        logicalKey: item.logicalKey,
        storageChapterId: item.storageChapterId,
        name: item.name,
        order: item.order,
        extern: item.extern,
      })),
    },
  };
}

async function getCloudFavoriteData(
  payload: CloudFavoritePayload = {},
): Promise<ComicPagedListContract> {
  console.log("getCloudFavoriteData", payload);
  const extern = toStringMap(payload.extern);
  const page = Math.max(1, toNumber(payload.page ?? extern.page, 1));
  const folderId = await resolveFavoriteFolderId(
    String(payload.folderId ?? extern.folderId ?? DEFAULT_FAVORITE_FOLDER_ID),
  );
  const order =
    String(payload.order ?? extern.order ?? "DATE_UPDATED").trim() ||
    "DATE_UPDATED";
  if (!folderId) {
    return {
      source: PLUGIN_ID,
      extern: payload.extern ?? null,
      scheme: {
        version: "1.0.0",
        type: "cloudFavoriteFeed",
        card: "comic",
      },
      data: {
        hasReachedMax: true,
        items: [],
      },
    };
  }
  const ids = await fetchFolderComicIds(page, folderId, order);
  const comics = ids.length ? await fetchComicByIds(ids) : [];
  const idOrder = new Map(ids.map((id, index) => [id, index]));
  const items = comics
    .slice()
    .sort((a, b) => {
      const ai =
        idOrder.get(String(a.id ?? "").trim()) ?? Number.MAX_SAFE_INTEGER;
      const bi =
        idOrder.get(String(b.id ?? "").trim()) ?? Number.MAX_SAFE_INTEGER;
      return ai - bi;
    })
    .map((item) => mapComicToGrid(item));

  return {
    source: PLUGIN_ID,
    extern: payload.extern ?? null,
    scheme: {
      version: "1.0.0",
      type: "cloudFavoriteFeed",
      card: "comic",
    },
    data: {
      hasReachedMax: items.length < CATEGORY_PAGE_SIZE,
      items,
    },
  };
}

async function getCommentFeed(
  payload: CommentFeedPayload = {},
): Promise<CommentFeedContract> {
  const extern = toStringMap(payload.extern);
  const comicId = String(payload.comicId ?? extern.comicId ?? "").trim();
  if (!comicId) {
    throw new Error("comicId 不能为空");
  }
  const page = Math.max(1, toNumber(payload.page ?? extern.page, 1));
  const comments = await fetchCommentsByComicId(comicId, page);
  const items = comments
    .map((item) => mapComment(item))
    .filter((item) => item.id);
  return {
    source: PLUGIN_ID,
    extern: payload.extern ?? null,
    scheme: {
      version: "1.0.0",
      type: "commentFeed",
    },
    data: {
      topItems: [],
      items,
      paging: {
        hasReachedMax: comments.length < 100,
      },
      replyMode: "lazy",
      canComment: {
        comic: false,
        reply: false,
      },
    },
  };
}

async function loadCommentReplies(
  payload: CommentRepliesPayload = {},
): Promise<CommentRepliesContract> {
  const extern = toStringMap(payload.extern);
  const commentId = String(payload.commentId ?? extern.commentId ?? "").trim();
  if (!commentId) {
    throw new Error("commentId 不能为空");
  }
  const replies = await fetchCommentReplies(commentId);
  const items = replies
    .map((item) => mapComment(item))
    .filter((item) => item.id);
  return {
    source: PLUGIN_ID,
    extern: payload.extern ?? null,
    scheme: {
      version: "1.0.0",
      type: "commentReplies",
    },
    data: {
      commentId,
      items,
      paging: {
        hasReachedMax: true,
      },
    },
  };
}

async function toggleFavorite(
  payload: ToggleFavoritePayload = {},
): Promise<ToggleFavoriteResult> {
  const comicId = String(payload.comicId ?? "").trim();
  if (!comicId) {
    throw new Error("comicId 不能为空");
  }

  const currentFavorite = Boolean(payload.currentFavorite);
  if (!currentFavorite) {
    let folders = await fetchFolders();
    if (!folders.length) {
      const created = await createFolder("默认收藏夹");
      const createdId = String(created.id ?? "").trim();
      if (!createdId) {
        throw new Error("创建默认收藏夹失败");
      }
      folders = [{ id: createdId, name: "默认收藏夹" }];
    }
    const targetFolderId = String(folders[0]?.id ?? "").trim();
    if (!targetFolderId) {
      throw new Error("未找到可用收藏夹");
    }
    await addComicToFolder(comicId, targetFolderId);
    return {
      favorited: true,
      nextStep: "none",
    };
  }

  const folderIds = await fetchComicFolderIds(comicId);
  await Promise.all(
    folderIds.map((folderId) => removeComicFromFolder(comicId, folderId)),
  );
  return {
    favorited: false,
    nextStep: "none",
  };
}

async function listFavoriteFolders(
  payload: FavoriteFolderPayload = {},
): Promise<ListFavoriteFoldersResult> {
  const folders = await fetchFolders();
  const comicId = String(payload.comicId ?? "").trim();
  const selected = comicId
    ? await fetchComicFolderIds(comicId).catch(() => [] as string[])
    : [];
  return {
    items: folders.map((item: KomiicFolder) => ({
      id: String(item.id ?? "").trim(),
      name: String(item.name ?? "").trim() || "未命名收藏夹",
      selected: selected.includes(String(item.id ?? "").trim()),
    })),
  };
}

async function moveFavoriteToFolder(payload: FavoriteFolderPayload = {}) {
  const comicId = String(payload.comicId ?? "").trim();
  let folderId = String(payload.folderId ?? "").trim();
  const folderName = String(payload.folderName ?? "").trim();
  if (!comicId) {
    throw new Error("comicId 不能为空");
  }

  if (!folderId && folderName) {
    const created = await createFolder(folderName);
    folderId = String(created.id ?? "").trim();
  }
  if (!folderId) {
    throw new Error("folderId 或 folderName 不能为空");
  }

  await addComicToFolder(comicId, folderId);
  return {
    ok: true,
  };
}

async function fetchImageBytes({
  url = "",
  timeoutMs = 30000,
  taskGroupKey = "",
  extern = {},
}: FetchImagePayload = {}): Promise<Uint8Array<ArrayBufferLike>> {
  const targetUrl = String(url).trim();
  if (!targetUrl) {
    throw new Error("url 不能为空");
  }
  const externMap = toStringMap(extern);
  const externHeaders = toStringMap(externMap.headers);
  const referer = (() => {
    const providedReferer = String(
      externHeaders.referer ?? externHeaders.Referer ?? "",
    ).trim();
    if (providedReferer) {
      return providedReferer;
    }
    try {
      const parsed = new URL(targetUrl);
      if (parsed.pathname.startsWith("/api/image/")) {
        return `${API_BASE}/`;
      }
      return `${parsed.protocol}//${parsed.host}/`;
    } catch {
      return `${API_BASE}/`;
    }
  })();

  const requestUrl = (() => {
    try {
      const parsed = new URL(targetUrl);
      if (parsed.origin === API_BASE) {
        return `${parsed.pathname}${parsed.search}`;
      }
    } catch {
      // keep absolute url fallback
    }
    return targetUrl;
  })();

  const response = await http.get<ArrayBuffer>(requestUrl, {
    responseType: "arraybuffer",
    timeout: Math.max(0, Number(timeoutMs) || REQUEST_TIMEOUT_MS),
    headers: {
      ...Object.fromEntries(
        Object.entries(externHeaders).map(([key, value]) => [
          key,
          String(value ?? ""),
        ]),
      ),
      Referer: referer,
      Accept: "image/avif,image/webp,image/apng,image/*,*/*;q=0.8",
      "x-komiic-skip-auth": "1",
    },
  });
  const bytes = new Uint8Array(response.data);
  if (!bytes.byteLength) {
    throw new Error("图片数据为空");
  }
  return bytes;
}

async function getSettingsBundle(): Promise<SettingsBundleContract> {
  const [account, password, recommendEnabled] = await Promise.all([
    loadAuthAccount(),
    loadAuthPassword(),
    loadRecommendEnabled(),
  ]);
  return {
    source: PLUGIN_ID,
    scheme: {
      version: "1.0.0",
      type: "settings",
      sections: [
        {
          id: "account",
          title: "账号",
          fields: [
            {
              key: AUTH_ACCOUNT_CONFIG_KEY,
              kind: "text",
              label: "邮箱",
              fnPath: "saveSettings",
            },
            {
              key: AUTH_PASSWORD_CONFIG_KEY,
              kind: "password",
              label: "密码",
              fnPath: "saveSettings",
            },
          ],
        },
        {
          id: "features",
          title: "功能",
          fields: [
            {
              key: RECOMMEND_ENABLED_CONFIG_KEY,
              kind: "switch",
              label: "打开推荐功能",
              fnPath: "saveSettings",
            },
          ],
        },
      ],
    },
    data: {
      canShowUserInfo: false,
      values: {
        [AUTH_ACCOUNT_CONFIG_KEY]: account,
        [AUTH_PASSWORD_CONFIG_KEY]: password,
        [RECOMMEND_ENABLED_CONFIG_KEY]: recommendEnabled,
      },
    },
  };
}

async function saveSettings(payload: SaveSettingsPayload = {}) {
  const payloadMap = toStringMap(payload);
  const values = toStringMap(payloadMap.values);
  const keys = new Set<string>([
    ...Object.keys(payloadMap),
    ...Object.keys(values),
  ]);

  for (const key of keys) {
    if (key === "values" || key === "value") continue;
    const rawValue =
      values[key] ??
      payloadMap[key] ??
      (key === AUTH_ACCOUNT_CONFIG_KEY ||
      key === AUTH_PASSWORD_CONFIG_KEY ||
      key === RECOMMEND_ENABLED_CONFIG_KEY
        ? payloadMap.value
        : undefined);
    if (rawValue === undefined) continue;
    await saveConfigString(key, String(rawValue ?? ""));
  }

  const nextAccount = await loadAuthAccount();
  const nextPassword = await loadAuthPassword();
  if (nextAccount && nextPassword.trim()) {
    try {
      await loginWithPassword({
        account: nextAccount,
        password: nextPassword,
        persistCredentials: true,
        notifyResult: true,
      });
    } catch {
      await saveAuthToken("");
    }
  } else {
    await saveAuthToken("");
  }

  return {
    ok: true,
  };
}

async function init() {
  const [account, password] = await Promise.all([
    loadAuthAccount(),
    loadAuthPassword(),
  ]);
  if (account && password.trim()) {
    try {
      await loginWithPassword({
        account,
        password,
        persistCredentials: true,
      });
    } catch {
      // ignore eager login failure
    }
  }
  return {
    source: PLUGIN_ID,
    data: {
      ok: true,
      hasToken: Boolean(await loadAuthToken()),
    },
  };
}

export default {
  init,
  getInfo,
  getCapabilities,
  getHomeRecent,
  getHomeRanking,
  getHomeCategory,
  getHomeCategoryFilterBundle,
  getHomeRankingFilterBundle,
  getCloudFavoriteFilterBundle,
  getCloudFavoriteSceneBundle,
  getCloudFavoriteData,
  searchComic,
  getComicDetail,
  getChapter,
  getReadSnapshot,
  getCommentFeed,
  loadCommentReplies,
  toggleFavorite,
  listFavoriteFolders,
  moveFavoriteToFolder,
  fetchImageBytes,
  getSettingsBundle,
  saveSettings,
  loginWithPassword,
};
