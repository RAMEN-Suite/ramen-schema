import type { SidebarsConfig } from "@docusaurus/plugin-content-docs";

const sidebars: SidebarsConfig = {
  ramenSidebar: [
    {
      type: "category",
      label: "Concepts",
      items: [
        "concepts/overview",
        "concepts/why-ramen",
        "concepts/context",
        "concepts/content",
        "concepts/knowledge",
        "concepts/related-standards",
      ],
    },
    {
      type: "category",
      label: "Specification",
      items: [
        "specification/overview",
        "specification/reference-model",
        "specification/json-schemas",
        "specification/validation",
      ],
    },
    {
      type: "category",
      label: "Tools",
      link: {
        type: "generated-index",
        slug: "/tools",
        description: "Tools for modelling, capturing, linking, and publishing RAMEN data.",
      },
      items: ["tools/nori", "tools/miso", "tools/shoyu"],
    },
    "examples",
    "publications",
  ],
};

export default sidebars;
