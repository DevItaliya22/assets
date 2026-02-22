import { readdir } from "fs/promises";
import path from "path";
import { AssetGallery } from "./AssetGallery";

const ROOT_FOLDERS = ["Separate Atoms", "Templates"];
const IMAGE_EXTENSIONS = new Set([
  "png",
  "svg",
  "jpg",
  "jpeg",
  "webp",
  "gif",
  "avif",
  "bmp",
]);

type AssetItem = {
  name: string;
  extension: string;
  relativePath: string;
  publicUrl: string;
  rootFolder: string;
};

function toPublicUrl(rootFolder: string, relativePath: string): string {
  const full = `${rootFolder}/${relativePath}`.split(path.sep).join("/");
  return `/${full
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/")}`;
}

async function collectAssets(
  absoluteDir: string,
  rootFolder: string,
  relativeDir = "",
): Promise<AssetItem[]> {
  let entries;
  try {
    entries = await readdir(absoluteDir, { withFileTypes: true });
  } catch {
    return [];
  }

  const results: AssetItem[] = [];

  for (const entry of entries) {
    const nextRelative = relativeDir
      ? path.join(relativeDir, entry.name)
      : entry.name;
    const nextAbsolute = path.join(absoluteDir, entry.name);

    if (entry.isDirectory()) {
      results.push(
        ...(await collectAssets(nextAbsolute, rootFolder, nextRelative)),
      );
      continue;
    }

    const extension = path.extname(entry.name).slice(1).toLowerCase();
    if (!IMAGE_EXTENSIONS.has(extension)) {
      continue;
    }

    results.push({
      name: entry.name,
      extension,
      relativePath: nextRelative,
      publicUrl: toPublicUrl(rootFolder, nextRelative),
      rootFolder,
    });
  }

  return results;
}

export type MergedVariant = { extension: string; publicUrl: string };

export type MergedAsset = {
  rootFolder: string;
  baseName: string;
  relativePath: string;
  variants: MergedVariant[];
  previewUrl: string;
  previewExtension: string;
};

function mergeAssets(items: AssetItem[]): MergedAsset[] {
  const byKey = new Map<string, AssetItem[]>();
  for (const item of items) {
    const pathNoExt = item.relativePath
      .replace(/\.[^.]+$/, "")
      .split(path.sep)
      .join("/");
    const key = `${item.rootFolder}\n${pathNoExt}`;
    if (!byKey.has(key)) byKey.set(key, []);
    byKey.get(key)!.push(item);
  }
  const merged: MergedAsset[] = [];
  for (const [, group] of byKey) {
    const first = group[0]!;
    const pathNoExt = first.relativePath
      .replace(/\.[^.]+$/, "")
      .split(path.sep)
      .join("/");
    const baseName =
      path.basename(first.relativePath, path.extname(first.relativePath)) ||
      first.name;
    const variants: MergedVariant[] = group.map((i) => ({
      extension: i.extension,
      publicUrl: i.publicUrl,
    }));
    const preferOrder = [
      "svg",
      "png",
      "jpg",
      "jpeg",
      "webp",
      "gif",
      "avif",
      "bmp",
    ];
    let preview = group[0]!;
    for (const ext of preferOrder) {
      const found = group.find((i) => i.extension === ext);
      if (found) {
        preview = found;
        break;
      }
    }
    merged.push({
      rootFolder: first.rootFolder,
      baseName,
      relativePath: pathNoExt,
      variants,
      previewUrl: preview.publicUrl,
      previewExtension: preview.extension,
    });
  }
  merged.sort(
    (a, b) =>
      a.rootFolder.localeCompare(b.rootFolder) ||
      a.relativePath.localeCompare(b.relativePath),
  );
  return merged;
}

export default async function Home() {
  const publicDir = path.join(process.cwd(), "public");
  const allAssets = (
    await Promise.all(
      ROOT_FOLDERS.map(async (rootFolder) => {
        const folderPath = path.join(publicDir, rootFolder);
        return collectAssets(folderPath, rootFolder);
      }),
    )
  )
    .flat()
    .sort((a, b) => a.relativePath.localeCompare(b.relativePath));

  const mergedAssets = mergeAssets(allAssets);

  return (
    <main className="min-h-screen bg-[#f5f3ef] text-[#1c1917]">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
        {/* Credit: Open Peeps – not my creation */}
        <section className="mb-8 rounded-xl border border-[#e7e5e4] bg-white/80 px-4 py-4 shadow-sm sm:px-5 sm:py-5">
          <p className="text-sm text-[#57534e]">
            <strong className="text-[#44403c]">This is not my creation.</strong>{" "}
            All credit goes to{" "}
            <a
              href="https://www.openpeeps.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-[#0ea5e9] underline decoration-[#0ea5e9]/50 underline-offset-2 hover:decoration-[#0ea5e9]"
            >
              Open Peeps
            </a>{" "}
            (hand-drawn illustration library by Pablo Stanley). I have only
            built a UI layer on top of the assets they provide.
          </p>
          <p className="mt-3 text-sm text-[#57534e]">
            Please support them:{" "}
            <a
              href="https://pablostanley.gumroad.com/l/openpeeps?wanted=true&referrer=https%3A%2F%2Fwww.openpeeps.com%2F"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 font-medium text-[#0ea5e9] underline decoration-[#0ea5e9]/50 underline-offset-2 hover:decoration-[#0ea5e9]"
            >
              Support Open Peeps on Gumroad
            </a>{" "}
            — they deserve it for this beautiful creation.
          </p>
          <p className="mt-2 text-xs text-[#78716c]">
            I do not own these assets in any way. All rights and credit go to
            Open Peeps.
          </p>
        </section>

        <header className="mb-14">
          <p className="mb-3 text-[11px] font-medium uppercase tracking-[0.2em] text-[#78716c]">
            Design Asset Library
          </p>
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
            Preview every asset
          </h1>
          <p className="mt-2 max-w-md text-sm text-[#57534e]">
            From{" "}
            <code className="rounded bg-[#e7e5e4] px-1.5 py-0.5 text-xs">
              Separate Atoms
            </code>
            ,{" "}
            <code className="rounded bg-[#e7e5e4] px-1.5 py-0.5 text-xs">
              Templates
            </code>
            , and their coloured variants. Preview as SVG; download PNG or SVG.
          </p>
        </header>

        <AssetGallery assets={mergedAssets} sectionOrder={ROOT_FOLDERS} />
      </div>
    </main>
  );
}
