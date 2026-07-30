import { Typography } from "@aussieljk/frosted";
import { createFileRoute, notFound } from "@tanstack/react-router";
import { useRef } from "react";
import { DeploymentField, useDeploymentRewrite } from "@/docs/Deployment";
import { DocLink } from "@/docs/DocLink";
import { DOCS, docBySlug } from "@/docs/registry";
import { Chrome } from "@/site/Chrome";

const { Text } = Typography;

/**
 * A splat rather than `$slug`, because the docs nest — `setup/google` is one
 * page, not a folder with a page in it.
 */
export const Route = createFileRoute("/docs/$")({
  loader: ({ params }) => {
    const doc = docBySlug(params._splat ?? "");
    if (!doc) throw notFound();
    // Only what `head` needs. The component reads the compiled MDX straight
    // from the registry, so the body never travels through the loader.
    return { title: doc.title, description: doc.description };
  },
  head: ({ loaderData }) => ({
    meta: [
      { title: `${loaderData?.title ?? "Docs"} — AussieAuth` },
      { name: "description", content: loaderData?.description ?? "" },
    ],
  }),
  component: DocPage,
});

function DocPage() {
  const { _splat } = Route.useParams();
  const slug = _splat ?? "";
  const doc = docBySlug(slug);
  // Held on the article rather than the page, so the rewrite can't reach the
  // nav or the sidebar — and re-runs on navigation, because the ref points at
  // a new element once the next page's content is in it.
  const article = useRef<HTMLElement>(null);
  useDeploymentRewrite(article);
  if (!doc) return null;

  const index = DOCS.findIndex((d) => d.slug === slug);
  const previous = DOCS[index - 1];
  const next = DOCS[index + 1];

  return (
    <Chrome>
      <div className="flex gap-10">
        <Sidebar current={slug} />
        <div className="min-w-0 flex-1">
          <div className="max-w-3xl">
            <DeploymentField />
          </div>
          <article ref={article} className="prose max-w-3xl">
            <doc.Content />
          </article>

          <Text color="gray" className="mt-10 block">
            Read this page as markdown:{" "}
            <a href={`/docs/${slug || "index"}.md`} className="underline">
              /docs/{slug || "index"}.md
            </a>
          </Text>

          <nav className="mt-6 flex justify-between gap-4 border-t border-[var(--gray-a4)] pt-6">
            {previous ? (
              <DocLink slug={previous.slug} className="underline">
                ← {previous.title}
              </DocLink>
            ) : (
              <span />
            )}
            {next && (
              <DocLink slug={next.slug} className="underline">
                {next.title} →
              </DocLink>
            )}
          </nav>
        </div>
      </div>
    </Chrome>
  );
}

function Sidebar({ current }: { current: string }) {
  return (
    <aside className="hidden w-52 shrink-0 lg:block">
      <div className="sticky top-24 flex flex-col gap-1 text-[14px]">
        {DOCS.map((doc) => (
          <DocLink
            key={doc.slug}
            slug={doc.slug}
            className={
              doc.slug === current
                ? "text-[var(--gray-12)]"
                : "text-[var(--gray-11)] transition-colors hover:text-[var(--gray-12)]"
            }
          >
            {doc.title}
          </DocLink>
        ))}
      </div>
    </aside>
  );
}
