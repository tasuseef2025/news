import type { Metadata } from "next";
import { StaticPage } from "@/components/static/static-page";
import { siteConfig } from "@/lib/site";
import { absoluteUrl } from "@/lib/utils";

export const metadata: Metadata = {
  title: "About Us",
  description: "Learn about Novexa News, our mission, founder and commitment to reliable digital journalism.",
  alternates: { canonical: absoluteUrl("/about") }
};

export default function AboutPage() {
  return (
    <StaticPage title="About Novexa News" description="Novexa News is a modern digital news platform built to make reliable information accessible across technology, business, finance, world news, sports, entertainment, health and lifestyle.">
      <h2>Our Mission</h2>
      <p>{siteConfig.name} delivers timely, accessible and clearly presented news for readers who want fast updates without losing editorial responsibility. The platform combines modern publishing technology, automation and human review standards to support consistent coverage.</p>
      <h2>Founder And Editor</h2>
      <p>Abdul Basit is the Founder and Editor of <strong>Novexa News</strong>, a modern digital news platform dedicated to delivering timely and reliable news from around the world. As a Full Stack MERN Developer and DevOps Engineer, he designed and developed the platform using modern web technologies and AI-powered automation to publish news efficiently while maintaining high standards of quality.</p>
      <p>With a strong background in React.js, Node.js, Express.js, MongoDB, cloud infrastructure, and SEO, Abdul focuses on creating fast, scalable, and user-friendly digital experiences. His vision for Novexa News is to make trustworthy information easily accessible, covering topics such as technology, business, finance, cryptocurrency, world news, sports, entertainment, health, and lifestyle.</p>
      <p>When he is not developing new features or optimizing the platform, Abdul enjoys exploring emerging technologies, artificial intelligence, and innovative ways to improve online publishing.</p>
    </StaticPage>
  );
}
