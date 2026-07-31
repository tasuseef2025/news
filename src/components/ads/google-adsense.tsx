import Script from "next/script";

function adsenseClientId() {
  const explicitClient = process.env.NEXT_PUBLIC_GOOGLE_ADSENSE_CLIENT || process.env.GOOGLE_ADSENSE_CLIENT;
  if (explicitClient) return explicitClient.startsWith("ca-pub-") ? explicitClient : `ca-${explicitClient}`;

  const publisherId = process.env.GOOGLE_ADSENSE_PUBLISHER_ID;
  if (!publisherId) return "";
  return publisherId.startsWith("ca-pub-") ? publisherId : `ca-${publisherId}`;
}

export function GoogleAdsense() {
  const client = adsenseClientId();
  if (!client) return null;

  return (
    <Script
      id="google-adsense"
      async
      src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${client}`}
      crossOrigin="anonymous"
      strategy="afterInteractive"
    />
  );
}
