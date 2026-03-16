type AvatarSource = {
  username?: string | null;
  name?: string | null;
  lastName?: string | null;
  email?: string | null;
  avatarUrl?: string | null;
};

function getAvatarName({ username, name, lastName, email }: AvatarSource) {
  const fullName = [name, lastName].filter(Boolean).join(" ").trim();
  if (fullName) return fullName;
  if (username?.trim()) return username.trim();
  if (email?.trim()) return email.trim();
  return "Usuario";
}

export function getUserAvatarUrl({ username, name, lastName, email, avatarUrl }: AvatarSource) {
  const customAvatar = avatarUrl?.trim();
  if (customAvatar) return customAvatar;

  const params = new URLSearchParams({
    name: getAvatarName({ username, name, lastName, email }),
    size: "160",
    bold: "true",
    background: "E5E7EB",
    color: "111827",
    format: "svg",
  });
  return `https://ui-avatars.com/api/?${params.toString()}`;
}
