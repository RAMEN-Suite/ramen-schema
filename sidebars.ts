import type { SidebarsConfig } from "@docusaurus/plugin-content-docs";

const sidebars: SidebarsConfig = {
  ramenSidebar: [
    {
      type: "category",
      label: "Concepts",
      items: ["concepts/overview", "concepts/context", "concepts/content", "concepts/knowledge"],
    },
    {
      type: "category",
      label: "Specification",
      items: ["specification/overview"],
    },
    {
      type: "category",
      label: "Tools",
      link: {
        type: "generated-index",
        slug: "/tools",
      },
      items: ["tools/nori", "tools/miso", "tools/tori", "tools/shoyu"],
    },
    "examples",
    "publications",
  ],
};

export default sidebars;
