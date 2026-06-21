export default function manifest() {
  return {
    name: "Debrief - Field Visit Intelligence",
    short_name: "Debrief",
    description: "Capture field visits and turn messy observations into structured debriefs.",
    start_url: "/log",
    scope: "/",
    display: "standalone",
    background_color: "#f7f8fb",
    theme_color: "#0f2d2e",
    orientation: "portrait",
    icons: [
      {
        src: "/icons/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any maskable"
      }
    ]
  };
}
