import type { Metadata } from "next";
import { StaticPage } from "@/components/static/static-page";
import { AuthorArticles } from "@/components/static/author-articles";
import { absoluteUrl } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Syeda Manal Tirmizi - Editor and Researcher",
  description: "Read about Syeda Manal Tirmizi, an editor, political science educator and international relations researcher at Novexa News.",
  alternates: { canonical: absoluteUrl("/author/syeda-manal-tirmizi") }
};

export const revalidate = 300;

export default function SyedaManalTirmiziAuthorPage() {
  const profileUrl = absoluteUrl("/author/syeda-manal-tirmizi");
  const personSchema = {
    "@context": "https://schema.org",
    "@type": "Person",
    name: "Syeda Manal Tirmizi",
    url: profileUrl,
    jobTitle: "Editor, Educator and Researcher",
    worksFor: { "@type": "NewsMediaOrganization", name: "Novexa News", url: absoluteUrl("/") },
    knowsAbout: ["Political science", "International relations", "Public affairs", "Education"]
  };
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(personSchema) }} />
      <StaticPage
        eyebrow="Author"
        title="Syeda Manal Tirmizi"
        description="Editor, educator and political science researcher at Novexa News."
      >
        <p>Ms. Syeda Manal Tirmizi is an educator and researcher who serves as an editor at <strong>Novexa News</strong>. She holds an M.Phil. in Political Science and lectures in BS Political Science and International Relations.</p>
        <p>As a Research Associate, she focuses on political dynamics, public affairs and international relations. Her academic and editorial work is grounded in careful research, factual analysis and clear communication.</p>
        <p>She is committed to academic excellence and to helping shape the next generation of informed leaders. At Novexa News, she contributes reporting and analysis on politics, international relations, education and related public-interest subjects.</p>
        <AuthorArticles names={["Syeda Manal Tirmizi", "Syada Manal Tirmizi", "Ms. Syeda Manal Tirmizi", "Ms Syeda Manal Tirmizi", "Manal Tirmizi", "manal"]} />
      </StaticPage>
    </>
  );
}
