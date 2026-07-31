import type { ReactElement, ReactNode } from "react";
import Heading from "@theme/Heading";
import Link from "@docusaurus/Link";
import styles from "./styles.module.css";

type CardItem = {
  title: string;
  image: string;
  alt: string;
  to: string;
};

const CardList: CardItem[] = [
  {
    title: "Modelling your Data",
    image: "/images/cards/card_nori.png",
    alt: "Modelling with Nori",
    to: "/concepts",
  },
  {
    title: "Capturing and Linking Content",
    image: "/images/cards/card_cami.png",
    alt: "Capturing with Miso and Tori",
    to: "/concepts",
  },
  {
    title: "Publishing Digital Editions",
    image: "/images/cards/card_ora.png",
    alt: "Publishing with Shoyu",
    to: "/concepts",
  },
];

function Card({ title, image, alt, to }: CardItem): ReactNode {
  return (
    <Link className={styles.card} to={to}>
      <div className={styles.imageWrap}>
        <img className={styles.image} src={image} alt={alt} loading="lazy" />
      </div>

      <Heading as="h3" className={styles.title}>
        {title}
      </Heading>
    </Link>
  );
}

export default function Cards(): ReactNode {
  return (
    <section className={styles.cards}>
      <div className="container">
        <div className={styles.grid}>
          {CardList.map(
            (card: CardItem): ReactElement => (
              <Card key={card.title} {...card} />
            ),
          )}
        </div>
      </div>
    </section>
  );
}
