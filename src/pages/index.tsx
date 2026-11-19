import type { ReactNode } from "react";
import Link from "@docusaurus/Link";
import Layout from "@theme/Layout";
import Heading from "@theme/Heading";
import Cards from "../components/Cards";
import styles from "./index.module.css";

export default function Home(): ReactNode {
  return (
    <Layout description="RAMEN is a shared model for digital scholarly editions. Define how sources, annotations, and entities connect, and use your project model across editorial tools.">
      <main>
        <header className={`hero-banner ${styles.hero}`}>
          <div className="container">
            <Heading as="h1" className={styles.title}>
              RAMEN Schema
            </Heading>
            <p className={styles.subtitle}>A shared model for digital scholarly editions</p>
            <p className={styles.description}>
              RAMEN connects content, collections, annotations, and entities in a model that projects adapt to their editorial
              needs.
            </p>
            <div className={styles.actions}>
              <Link className="button button--secondary" to="/concepts">
                What is RAMEN?
              </Link>
              <Link className="button button--secondary" to="/specification">
                Specification
              </Link>
              <Link className="button button--secondary" to="/tools">
                RAMEN Tools
              </Link>
            </div>
          </div>
        </header>
        <Cards />
      </main>
    </Layout>
  );
}
