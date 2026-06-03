import type { PluginInfo } from "../types/type";
import { PLUGIN_ID } from "./common";

export function buildPluginInfo(): PluginInfo {
  const recentScene = {
    title: "最近更新",
    source: PLUGIN_ID,
    body: {
      type: "pluginPagedComicList" as const,
      request: {
        fnPath: "getHomeRecent",
        core: {},
        extern: {
          source: "recent",
          mode: "recent",
        },
      },
    },
  };
  const rankingScene = {
    title: "排行榜",
    source: PLUGIN_ID,
    body: {
      type: "pluginPagedComicList" as const,
      request: {
        fnPath: "getHomeRanking",
        core: {},
        extern: {
          source: "ranking",
          mode: "ranking",
          orderBy: "MONTH_VIEWS",
        },
      },
    },
    filter: {
      fnPath: "getHomeRankingFilterBundle",
      extern: {
        source: "ranking",
        mode: "ranking",
        orderBy: "MONTH_VIEWS",
      },
    },
  };
  const categoryScene = {
    title: "分类",
    source: PLUGIN_ID,
    body: {
      type: "pluginPagedComicList" as const,
      request: {
        fnPath: "getHomeCategory",
        core: {},
        extern: {
          source: "category",
          mode: "category",
          categoryId: "0",
          orderBy: "DATE_UPDATED",
          status: "",
        },
      },
    },
    filter: {
      fnPath: "getHomeCategoryFilterBundle",
      extern: {
        source: "category",
        mode: "category",
        categoryId: "0",
        orderBy: "DATE_UPDATED",
        status: "",
      },
    },
  };
  const cloudFavoriteScene = {
    title: "云端收藏",
    source: PLUGIN_ID,
    body: {
      type: "pluginPagedComicList" as const,
      request: {
        fnPath: "getCloudFavoriteData",
        core: {},
        extern: {
          source: "cloudFavorite",
          folderId: "__default__",
          order: "DATE_UPDATED",
        },
      },
    },
    filter: {
      fnPath: "getCloudFavoriteFilterBundle",
      extern: {
        source: "cloudFavorite",
        folderId: "__default__",
        order: "DATE_UPDATED",
      },
    },
  };

  return {
    name: "Komiic",
    uuid: PLUGIN_ID,
    iconUrl:
      "https://raw.githubusercontent.com/deretame/Breeze-plugin-komiic/main/assets/app_icon.webp",
    creator: {
      name: "",
      describe: "",
    },
    describe: "Komiic 漫画源插件",
    version: "0.0.4",
    home: "https://github.com/deretame/Breeze-plugin-komiic",
    updateUrl:
      "https://api.github.com/repos/deretame/Breeze-plugin-komiic/releases/latest",
    npmName: "breeze-plugin-komiic",
    function: [
      {
        id: "recent",
        title: "最近更新",
        action: {
          type: "openComicList" as const,
          payload: {
            scene: recentScene,
          },
        },
      },
      {
        id: "ranking",
        title: "排行榜",
        action: {
          type: "openComicList" as const,
          payload: {
            scene: rankingScene,
          },
        },
      },
      {
        id: "category",
        title: "分类",
        action: {
          type: "openComicList" as const,
          payload: {
            scene: categoryScene,
          },
        },
      },
      {
        id: "cloudFavorite",
        title: "云端收藏",
        action: {
          type: "openComicList" as const,
          payload: {
            scene: cloudFavoriteScene,
          },
        },
      },
    ],
  };
}

export function buildManifestInfo(): PluginInfo {
  return buildPluginInfo();
}
