import type { Metadata } from "next";
import { StaticPage } from "@/components/static/static-page";
import { siteConfig } from "@/lib/site";
import { staticPageMetadata } from "@/lib/metadata";

export const metadata: Metadata = staticPageMetadata({
  title: "About Novexa News and Our Editorial Mission",
  description: "Learn about Novexa News, our founder, editorial team, publishing mission and commitment to reliable digital journalism across Pakistan, world, business, technology, sports and lifestyle coverage.",
  path: "/about",
  ogImageTitle: "About Novexa News"
});

export default function AboutPage() {
  return (
    <StaticPage title="About Novexa News" description="Novexa News is a modern digital news platform built to make reliable information accessible across technology, business, finance, world news, sports, entertainment, health and lifestyle.">
      <h2>Our Mission</h2>
      <p>{siteConfig.name} delivers timely, accessible and clearly presented news for readers who want fast updates. Our coverage includes work by named editors and selected feed-based stories that pass automated checks before publication. We describe both processes in our editorial policy.</p>
      <h2>Founder And Editor</h2>
      <p><a href="/author/abdul-basit"><strong>Abdul Basit</strong></a> is the Founder and Editor of <strong>Novexa News</strong>, a modern digital news platform dedicated to delivering timely and reliable news from around the world. As a Full Stack MERN Developer and DevOps Engineer, he designed and developed the platform using modern web technologies to publish news efficiently while maintaining high standards of quality.</p>
      <p>With a strong background in React.js, Node.js, Express.js, MongoDB, cloud infrastructure, and SEO, Abdul focuses on creating fast, scalable, and user-friendly digital experiences. His vision for Novexa News is to make trustworthy information easily accessible, covering topics such as technology, business, finance, cryptocurrency, world news, sports, entertainment, health, and lifestyle.</p>
      <p>When he is not developing new features or optimizing the platform, Abdul enjoys exploring emerging technologies, artificial intelligence, and innovative ways to improve online publishing.</p>
      <h2>Editorial Team</h2>
      <p><a href="/author/syeda-manal-tirmizi"><strong>Syeda Manal Tirmizi</strong></a> is an editor, educator and researcher at Novexa News. She holds an M.Phil. in Political Science and lectures in BS Political Science and International Relations.</p>
      <p>As a Research Associate, she studies political dynamics and international relations. Her work reflects a commitment to academic excellence, responsible analysis and helping shape the next generation of informed leaders.</p>
      <p><a href="/author/novexa-news-desk"><strong>Novexa News Desk</strong></a> is the byline for collaborative coverage and qualifying feed-based stories that may be drafted and published automatically after automated checks. Human review is not guaranteed for every Desk story. Full detail is in our <a href="/editorial-policy">Editorial Policy</a>.</p>
    </StaticPage>
  );
}
