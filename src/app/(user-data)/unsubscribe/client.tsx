"use client";

import { useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";

export default function UnsubscribePageClient() {
  const searchParams = useSearchParams();
  const router = useRouter();

  useEffect(() => {
    const email = searchParams.get("email");
    const token = searchParams.get("token");

    if (!email || !token) {
      router.replace("/unsubscribe/error");
      return;
    }

    fetch(`/api/unsubscribe?email=${encodeURIComponent(email)}&token=${token}`)
      .then((res) => {
        if (res.ok) {
          router.replace("/unsubscribe/success");
        } else {
          router.replace("/unsubscribe/error");
        }
      })
      .catch(() => router.replace("/unsubscribe/error"));
  }, [searchParams, router]);

  return (
    <main className="min-h-screen flex items-center justify-center text-center">
      <p className="text-gray-600">Caricamento in corso, attendi...</p>
    </main>
  );
}
