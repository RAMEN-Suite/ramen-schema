import { themes as prismThemes } from "prism-react-renderer";
import type { Config } from "@docusaurus/types";
import type * as Preset from "@docusaurus/preset-classic";

const config: Config = {
  title: "RAMEN Schema",
  tagline: "Reusable Abstraction Model for Editorial Needs",
  favicon: "images/favicon.png",

  future: {
    v4: true,
  },

  url: "https://ramen-schema.org",
  trailingSlash: false,
  baseUrl: "/",

  organizationName: "RAMEN-Suite",
  projectName: "RAMEN-Schema",

  onBrokenLinks: "warn",
  onBrokenMarkdownLinks: "warn",

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
      logo: {
        alt: "RAMEN Schema",
        src: "images/logo.svg",
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
          href: "https://github.com/RAMEN-Suite",
          position: "right",
          className: "header-github-link",
          "aria-label": "GitHub repository",
        },
      ],
    },

    footer: {
      style: "dark",
      links: [
        {
          title: "RAMEN Schema",
          items: [
            {
              label: "Specification",
              to: "/specification",
            },
            {
              label: "Concepts",
              to: "/concepts",
            },
            {
              label: "Examples",
              to: "/examples",
            },
          ],
        },
        {
          title: "Builds on RAMEN",
          items: [
            {
              label: "Existing Tools",
              to: "/tools",
            },
            {
              label: "RAMEN Suite",
              href: "https://github.com/RAMEN-Suite",
            },
          ],
        },
        {},
        {
          title: "Recipes and More",
          items: [
            {
              label: "Citation",
              to: "/citation",
            },
            {
              label: "Publications",
              to: "/publications",
            },
          ],
        },
      ],
      copyright: `© ${new Date().getFullYear()} Reusable Abstraction Model for Editorial Needs`,
    },

    prism: {
      theme: prismThemes.github,
      darkTheme: prismThemes.github,
    },
  } satisfies Preset.ThemeConfig,
};

export default config;
