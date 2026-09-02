import type { Metadata } from "next";
import { StaticPage } from "@/components/static/static-page";
import { AuthorArticles } from "@/components/static/author-articles";
import { absoluteUrl } from "@/lib/utils";
import { staticPageMetadata } from "@/lib/metadata";

export const metadata: Metadata = staticPageMetadata({
  title: "Abdul Basit - Founder and Editor of Novexa News",
  description: "Read about Abdul Basit, Founder and Editor of Novexa News, including his work in MERN development, DevOps, SEO and modern digital publishing.",
  path: "/author/abdul-basit",
  ogImageTitle: "Abdul Basit",
  ogCategory: "Author"
});

export const revalidate = 300;

export default function AbdulBasitAuthorPage() {
  const profileUrl = absoluteUrl("/author/abdul-basit");
  const personSchema = {
    "@context": "https://schema.org",
    "@type": "Person",
    name: "Abdul Basit",
    url: profileUrl,
    jobTitle: "Founder and Editor",
    worksFor: { "@type": "NewsMediaOrganization", name: "Novexa News", url: absoluteUrl("/") },
    knowsAbout: ["Digital publishing", "Web development", "DevOps", "Search engine optimization"]
  };
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(personSchema) }} />
      <StaticPage eyebrow="Author" title="Abdul Basit" description="Founder and Editor of Novexa News.">
        <p>Abdul Basit is the Founder and Editor of <strong>Novexa News</strong>, a modern digital news platform dedicated to delivering timely and reliable news from around the world. As a Full Stack MERN Developer and DevOps Engineer, he designed and developed the platform using modern web technologies and AI-powered automation to publish news efficiently while maintaining high standards of quality.</p>
        <p>With a strong background in React.js, Node.js, Express.js, MongoDB, cloud infrastructure, and SEO, Abdul focuses on creating fast, scalable, and user-friendly digital experiences. His vision for Novexa News is to make trustworthy information easily accessible, covering topics such as technology, business, finance, cryptocurrency, world news, sports, entertainment, health, and lifestyle.</p>
        <p>When he is not developing new features or optimizing the platform, Abdul enjoys exploring emerging technologies, artificial intelligence, and innovative ways to improve online publishing.</p>
        <AuthorArticles names={["Abdul Basit"]} />
      </StaticPage>
    </>
  );
}
