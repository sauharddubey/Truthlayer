import { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "TruthLayer",
    short_name: "TruthLayer",
    description: "AI trust, compliance & media intelligence for video.",
    start_url: "/",
    display: "standalone",
    background_color: "#121215",
    theme_color: "#2383e2",
    icons: [
      {
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
      },
    ],
    share_target: {
      action: "/analyze",
      method: "get",
      enctype: "application/x-www-form-urlencoded",
      params: {
        title: "title",
        text: "text",
        url: "url",
      },
    },
  } as any;
}
