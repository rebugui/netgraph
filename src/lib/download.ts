import type { Project } from "../types";
export function fileName(project: Project, tabName: string, extension: string) {
  return `구성도_${project.meta.docTitle}_${tabName}_${new Date().toLocaleDateString("en-CA").replaceAll("-", "")}.${extension}`.replace(
    /[\\/:*?"<>|]/g,
    "_",
  );
}
export function download(data: Blob | string, name: string) {
  const url = typeof data === "string" ? data : URL.createObjectURL(data);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.append(a);
  a.click();
  a.remove();
  if (typeof data !== "string")
    setTimeout(() => URL.revokeObjectURL(url), 5000);
}
