// Discovers the PNG icons or the copied Icon Composer folder that Expo generated for iOS.
import { basename, extname, join } from "node:path";
import { type ExportedConfig, IOSConfig } from "expo/config-plugins";
import type { IconTarget } from "./targets";

export function findIosIconTargets(
  config: ExportedConfig,
  projectRoot: string
): IconTarget[] {
  const icons = config.ios?.icon;
  // Expo also falls back to the root icon when ios.icon is an empty string.
  const icon = (typeof icons === "string" && icons) || config.icon;
  const hasAppearanceIcons =
    typeof icons === "object" &&
    Boolean(icons.light || icons.dark || icons.tinted);
  const projectDirectory = join(
    projectRoot,
    "ios",
    IOSConfig.XcodeUtils.getProjectName(projectRoot)
  );
  if (!hasAppearanceIcons && icon && extname(icon) === ".icon") {
    // Expo copies the folder into the iOS project under the same name and removes AppIcon.appiconset.
    return [
      {
        copiedPath: join(projectDirectory, basename(icon)),
        kind: "icon-folder",
        sourcePath: join(projectRoot, icon),
      },
    ];
  }
  const directory = join(
    projectDirectory,
    "Images.xcassets",
    "AppIcon.appiconset"
  );
  const targets: IconTarget[] = [
    {
      kind: "png",
      path: join(directory, "App-Icon-1024x1024@1x.png"),
      surface: "square",
    },
  ];
  if (typeof icons === "object") {
    if (icons.dark) {
      targets.push({
        kind: "png",
        path: join(directory, "App-Icon-dark-1024x1024@1x.png"),
        surface: "square",
      });
    }
    if (icons.tinted) {
      targets.push({
        kind: "png",
        path: join(directory, "App-Icon-tinted-1024x1024@1x.png"),
        surface: "square-tinted",
      });
    }
  }
  return targets;
}
