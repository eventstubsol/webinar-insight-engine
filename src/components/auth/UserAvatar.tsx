
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export interface UserAvatarProps {
  name?: string;
  avatarUrl?: string;
}

export function UserAvatar({ name, avatarUrl }: UserAvatarProps) {
  // Get initials from name
  const initials = name
    ? name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .substring(0, 2)
    : "??";

  return (
    <Avatar>
      {avatarUrl ? (
        <AvatarImage src={avatarUrl} alt={name || "User avatar"} />
      ) : null}
      <AvatarFallback>{initials}</AvatarFallback>
    </Avatar>
  );
}
