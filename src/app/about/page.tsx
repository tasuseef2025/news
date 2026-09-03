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
      <p>{siteConfig.name} delivers timely, accessible and clearly presented news for readers who want fast updates without losing editorial responsibility. Our stories are written by our editorial team, supported by modern publishing technology and consistent review standards.</p>
      <h2>Founder And Editor</h2>
      <p>Abdul Basit is the Founder and Editor of <strong>Novexa News</strong>, a modern digital news platform dedicated to delivering timely and reliable news from around the world. As a Full Stack MERN Developer and DevOps Engineer, he designed and developed the platform using modern web technologies to publish news efficiently while maintaining high standards of quality.</p>
      <p>With a strong background in React.js, Node.js, Express.js, MongoDB, cloud infrastructure, and SEO, Abdul focuses on creating fast, scalable, and user-friendly digital experiences. His vision for Novexa News is to make trustworthy information easily accessible, covering topics such as technology, business, finance, cryptocurrency, world news, sports, entertainment, health, and lifestyle.</p>
      <p>When he is not developing new features or optimizing the platform, Abdul enjoys exploring emerging technologies, artificial intelligence, and innovative ways to improve online publishing.</p>
      <h2>Editorial Team</h2>
      <p><strong>Syeda Manal Tirmizi</strong> is an editor, educator and researcher at Novexa News. She holds an M.Phil. in Political Science and lectures in BS Political Science and International Relations.</p>
      <p>As a Research Associate, she studies political dynamics and international relations. Her work reflects a commitment to academic excellence, responsible analysis and helping shape the next generation of informed leaders.</p>
    </StaticPage>
  );
}
