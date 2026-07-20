import Script from "next/script";

export function GoogleSwgBasic() {
  return (
    <>
      <Script
        id="google-swg-basic"
        src="https://news.google.com/swg/js/v1/swg-basic.js"
        strategy="afterInteractive"
      />
      <Script id="google-swg-basic-init" strategy="afterInteractive">
        {`
          (self.SWG_BASIC = self.SWG_BASIC || []).push(function (basicSubscriptions) {
            basicSubscriptions.init({
              type: "NewsArticle",
              isPartOfType: ["Product"],
              isPartOfProductId: "CAow0oLMDA:openaccess",
              clientOptions: { theme: "light", lang: "en" }
            });
          });
        `}
      </Script>
    </>
  );
}
