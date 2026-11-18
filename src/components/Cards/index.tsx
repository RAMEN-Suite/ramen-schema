import type { ReactNode } from "react";
import Heading from "@theme/Heading";
import Link from "@docusaurus/Link";
import styles from "./styles.module.css";

const tools = [
  {
    title: "Modelling your data",
    description: "Define node types and relationships with Nori.",
    image: "/images/cards/card_nori.svg",
    alt: "A pointer highlights the Annotation node and its connection to Text in Nori",
    to: "/tools/nori",
  },
  {
    title: "Capturing and linking content",
    description: "Annotate sources and link them to entities with Miso.",
    image: "/images/cards/card_miso.svg",
    alt: "A selected phrase in Miso is linked to the person Antje Brons",
    to: "/tools/miso",
  },
  {
    title: "Publishing digital editions",
    description: "Publish editions with data readers can explore in Shoyu.",
    image: "/images/cards/card_shoyu.svg",
    alt: "A published letter in Shoyu with a linked person record and a graph of related records",
    to: "/tools/shoyu",
  },
];

export default function Cards(): ReactNode {
  return (
    <section className={styles.cards} aria-label="RAMEN tools">
      <div className={`container ${styles.grid}`}>
        {tools.map(({ title, description, image, alt, to }) => (
          <Link className={styles.card} to={to} key={title}>
            <div className={styles.imageWrap}>
              <img className={styles.image} src={image} alt={alt} width={1200} height={800} loading="lazy" />
            </div>
            <div className={styles.copy}>
              <Heading as="h2" className={styles.title}>
                {title}
              </Heading>
              <p className={styles.description}>{description}</p>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
