import { themes as prismThemes } from "prism-react-renderer";
import type { Config } from "@docusaurus/types";
import type * as Preset from "@docusaurus/preset-classic";

const config: Config = {
  title: "RAMEN Schema",
  tagline: "Reusable Abstraction Model for Editorial Needs",
  favicon: "images/schema-favicon.svg",
  staticDirectories: ["static", ".generated/static"],
  headTags: [
    {
      tagName: "link",
      attributes: { rel: "preload", href: "/fonts/RobotoFlex.ttf", as: "font", type: "font/ttf", crossorigin: "anonymous" },
    },
  ],

  future: {
    v4: true,
  },

  url: "https://ramen-schema.org",
  trailingSlash: false,
  baseUrl: "/",

  organizationName: "RAMEN-Suite",
  projectName: "RAMEN-Schema",

  onBrokenLinks: "throw",
  onBrokenAnchors: "throw",
  markdown: { hooks: { onBrokenMarkdownLinks: "throw" } },

  i18n: {
    defaultLocale: "en",
    locales: ["en"],
  },

  presets: [
    [
      "classic",
      {
        docs: {
          sidebarPath: "./sidebars.ts",
          routeBasePath: "/",
        },
        blog: false,
        theme: {
          customCss: ["./src/styles/main.css", "./src/styles/graph.css"],
        },
      } satisfies Preset.Options,
    ],
  ],

  themeConfig: {
    image: "images/social-card.png",

    metadata: [
      {
        name: "description",
        content:
          "RAMEN Schema documents the Reusable Abstraction Model for Editorial Needs, a reusable conceptual model for structuring heterogeneous data in digital scholarly editions.",
      },
      {
        name: "keywords",
        content:
          "RAMEN, RAMEN Schema, Digital Editions, Digital Scholarly Editing, Digital Humanities, Graph-Based Modelling, Editorial Data",
      },
    ],

    colorMode: {
      defaultMode: "light",
      disableSwitch: true,
      respectPrefersColorScheme: false,
    },

    navbar: {
      title: "RAMEN\nSCHEMA",
      logo: {
        alt: "",
        src: "images/logo-worn.svg",
      },
      items: [
        {
          to: "/specification",
          position: "right",
          label: "Specification",
        },
        {
          to: "/concepts",
          position: "right",
          label: "Concepts",
        },
        {
          to: "/tools",
          position: "right",
          label: "Tools",
        },
        {
          to: "/examples",
          position: "right",
          label: "Examples",
        },
        {
          to: "/publications",
          position: "right",
          label: "Publications",
        },
        {
          href: "https://www.npmjs.com/package/@ramen-suite/core",
          position: "right",
          className: "header-icon-link header-npm-link",
          "aria-label": "RAMEN Core on npm",
          title: "RAMEN Core on npm",
        },
        {
          href: "https://github.com/RAMEN-Suite",
          position: "right",
          className: "header-icon-link header-github-link",
          "aria-label": "GitHub repository",
        },
      ],
    },

    footer: {
      style: "dark",
      links: [
        {
          title: "Model",
          items: [
            { label: "RAMEN concepts", to: "/concepts" },
            { label: "Model specification", to: "/specification" },
            { label: "RAMEN Core on npm", href: "https://www.npmjs.com/package/@ramen-suite/core" },
          ],
        },
        {
          title: "RAMEN Suite",
          items: [
            { label: "Model with Nori", to: "/tools/nori" },
            { label: "Annotate with Miso", to: "/tools/miso" },
            { label: "Publish with Shoyu", to: "/tools/shoyu" },
          ],
        },
        {
          title: "Cite & Connect",
          items: [
            { label: "How to cite RAMEN", to: "/citation" },
            { label: "RAMEN Suite on GitHub", href: "https://github.com/RAMEN-Suite" },
          ],
        },
        {
          className: "footer__brand",
          items: [
            {
              html: '<img class="footer__brand-mark" src="/images/logo-worn-white.svg" alt="" width="128" height="99" />',
            },
          ],
        },
      ],
      copyright: `© ${new Date().getFullYear()} RAMEN Schema`,
    },

    prism: {
      theme: prismThemes.github,
      darkTheme: prismThemes.github,
    },
  } satisfies Preset.ThemeConfig,
};

export default config;
