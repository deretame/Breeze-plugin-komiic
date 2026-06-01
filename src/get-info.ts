import { PLUGIN_ID } from "./common";

export function buildPluginInfo() {
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
    version: "0.0.3",
    home: "https://github.com/deretame/Breeze-plugin-komiic",
    updateUrl:
      "https://api.github.com/repos/deretame/Breeze-plugin-komiic/releases/latest",
    npmName: "breeze-plugin-komiic",
    function: [],
  };
}

export function buildManifestInfo() {
  return buildPluginInfo();
}
