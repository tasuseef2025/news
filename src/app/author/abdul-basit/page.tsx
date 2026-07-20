import type { Metadata } from "next";
import { StaticPage } from "@/components/static/static-page";
import { absoluteUrl } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Author - Abdul Basit",
  description: "Read about Abdul Basit, Founder and Editor of Novexa News.",
  alternates: { canonical: absoluteUrl("/author/abdul-basit") }
};

export default function AbdulBasitAuthorPage() {
  return (
    <StaticPage eyebrow="Author" title="Abdul Basit" description="Founder and Editor of Novexa News.">
      <p>Abdul Basit is the Founder and Editor of <strong>Novexa News</strong>, a modern digital news platform dedicated to delivering timely and reliable news from around the world. As a Full Stack MERN Developer and DevOps Engineer, he designed and developed the platform using modern web technologies and AI-powered automation to publish news efficiently while maintaining high standards of quality.</p>
      <p>With a strong background in React.js, Node.js, Express.js, MongoDB, cloud infrastructure, and SEO, Abdul focuses on creating fast, scalable, and user-friendly digital experiences. His vision for Novexa News is to make trustworthy information easily accessible, covering topics such as technology, business, finance, cryptocurrency, world news, sports, entertainment, health, and lifestyle.</p>
      <p>When he is not developing new features or optimizing the platform, Abdul enjoys exploring emerging technologies, artificial intelligence, and innovative ways to improve online publishing.</p>
    </StaticPage>
  );
}
