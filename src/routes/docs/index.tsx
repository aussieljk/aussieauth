import { Card, Link as UiLink, Typography, VStack } from "ljkui";
import { createFileRoute } from "@tanstack/react-router";
import { DocLink } from "@/docs/DocLink";
import { DOCS, docBySlug } from "@/docs/registry";
import { Chrome } from "@/site/Chrome";

const { Heading, Text } = Typography;

export const Route = createFileRoute("/docs/")({
  head: () => ({
    meta: [
      { title: "Documentation — AussieAuth" },
      {
        name: "description",
        content:
          "How to run AussieAuth: quickstart, Google and Apple setup, embedding it in another app, native clients, deployment and per-method notes.",
      },
    ],
  }),
  component: DocsIndex,
});

function DocsIndex() {
  // `docs/index.docs.mdx` is the overview; the rest are the pages it links on to.
  const overview = docBySlug("");
  const pages = DOCS.filter((d) => d.slug !== "");

  return (
    <Chrome>
      <article className="prose max-w-3xl">
        {overview ? <overview.Content /> : <Heading>Documentation</Heading>}
      </article>

      <Text color="gray" className="mt-8" render={<p />}>
        Also available as{" "}
        <UiLink href="/llms.txt">/llms.txt</UiLink> and{" "}
        <UiLink href="/llms-full.txt">/llms-full.txt</UiLink>, and each page as raw markdown at{" "}
        <code>/docs/&lt;slug&gt;.md</code>.
      </Text>

      {/* Every page linked from here, which is also how the prerenderer finds
          them — `crawlLinks` walks the HTML rather than guessing at routes. */}
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {pages.map((doc) => (
          <DocLink key={doc.slug} slug={doc.slug} className="block">
            <Card className="h-full">
              <VStack alignment="leading" spacing={4}>
                <Text weight="medium">{doc.title}</Text>
                <Text color="gray">{doc.description}</Text>
              </VStack>
            </Card>
          </DocLink>
        ))}
      </div>
    </Chrome>
  );
}
