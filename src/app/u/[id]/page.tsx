"use client";
import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import ProfileView from "@/components/ProfileView";
import { useStore } from "@/lib/store";

// Someone else's profile. Your own id goes to /me.
export default function UserProfile() {
  const { id } = useParams<{ id: string }>();
  const { me } = useStore();
  const router = useRouter();
  useEffect(() => { if (id === me.id) router.replace("/me" + location.search); }, [id, me.id, router]);
  return <ProfileView userId={id} />;
}
