import type { MetadataRoute } from "next";

/** Lets phones "Add to Home Screen" with the Notties name, icon and colours. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "The Notties: The Lab",
    short_name: "The Lab",
    description: "Raid crates, collect 7 parts, assemble your Nottie and lock your spot in the free mint.",
    start_url: "/",
    display: "standalone",
    background_color: "#090a07",
    theme_color: "#090a07",
    icons: [
      { src: "/icon.png", sizes: "192x192", type: "image/png" },
      { src: "/apple-icon.png", sizes: "180x180", type: "image/png" },
    ],
  };
}
