export function formatPath(from: string) {
  return from
    .replace(/^\/+|\/+$/g, '') // Remove leading/trailing slashes
    .replace(/[^a-zA-Z0-9]/g, '-')
    .replace(/-+/g, '-') // Collapse multiple dashes
    .replace(/^-+|-+$/g, '') // Remove leading/trailing dashes
    .toLowerCase(); // Ensure consistency across filesystems
}
