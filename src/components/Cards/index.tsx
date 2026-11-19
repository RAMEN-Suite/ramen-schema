import type { ReactNode } from 'react';
import Heading from '@theme/Heading';
import Link from '@docusaurus/Link';
import styles from './styles.module.css';

const tools = [
  {
    title: 'Model with Nori',
    description: 'Define the types, properties, relationships, and validation rules your project needs.',
    image: '/images/cards/card_nori.svg',
    alt: 'Text has an Annotation, used directly from RAMEN, which refers to a Person in Nori',
    to: '/tools/nori',
  },
  {
    title: 'Annotate with Miso',
    description: 'Capture content, annotate passages and image regions, and link them to entities.',
    image: '/images/cards/card_miso.svg',
    alt: 'A selected phrase in Miso is linked to the person Antje Brons',
    to: '/tools/miso',
  },
  {
    title: 'Publish with Shoyu',
    description: 'Publish an edition whose content, annotations, and connections readers can explore.',
    image: '/images/cards/card_shoyu.svg',
    alt: 'A published letter in Shoyu with a linked person record and a graph of related records',
    to: '/tools/shoyu',
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
