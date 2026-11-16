import type { MetaFunction, LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import { Layout } from "~/components/Layout/Layout";
import { FluidIconShowcase } from "~/components/Showcase/FluidIconShowcase";
import { getUserFromSession } from "~/services/auth.server";

export const meta: MetaFunction = () => {
  return [{ title: "Icon Showcase & Fluid Motion - LokDarpan" }];
};

export async function loader({ request }: LoaderFunctionArgs) {
  const userSession = await getUserFromSession(request);
  return json({ user: userSession?.user || null });
}

export default function ShowcaseRoute() {
  const { user } = useLoaderData<typeof loader>();

  return (
    <Layout user={user}>
      <div className="py-6 px-4">
        <FluidIconShowcase />
      </div>
    </Layout>
  );
}

