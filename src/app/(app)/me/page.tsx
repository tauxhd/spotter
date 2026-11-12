"use client";
import ProfileView from "@/components/ProfileView";
import { useStore } from "@/lib/store";

export default function MyProfile() {
  const { me } = useStore();
  return <ProfileView userId={me.id} />;
}
