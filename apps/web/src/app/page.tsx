import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function HomePage() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <p className="text-sm uppercase tracking-widest text-neutral-400">Recommendly</p>
      <h1 className="mt-2 text-4xl font-semibold tracking-tight">
        Signed in as {user.email}
      </h1>
      <p className="mt-6 max-w-prose text-lg leading-relaxed text-neutral-600">
        You are authenticated. This is the protected app shell. Feed, discovery,
        and recommendations will be added in later checkpoints.
      </p>
      <form action="/auth/logout" method="post" className="mt-10">
        <button
          type="submit"
          className="rounded-md border border-neutral-300 bg-white px-5 py-2.5 text-sm font-medium shadow-sm transition hover:bg-neutral-100"
        >
          Sign out
        </button>
      </form>
    </main>
  );
}