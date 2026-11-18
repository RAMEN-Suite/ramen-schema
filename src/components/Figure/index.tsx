import type { ReactNode } from "react";
import styles from "./styles.module.css";

type FigureProps = {
  id: string;
  number: number | string;
  src: string;
  width?: number;
  alt: string;
  caption: ReactNode;
};

type FigRefProps = {
  id: string;
  children: ReactNode;
};

export function FigRef({ id, children }: FigRefProps): ReactNode {
  return <a href={`#${id}`}>{children}</a>;
}

export default function Figure(props: FigureProps): ReactNode {
  return (
    <figure id={props.id} className={styles.figure}>
      <img className={styles.image} src={props.src} alt={props.alt} style={{ maxWidth: props.width }} />
      <figcaption className={styles.caption}>
        Figure {props.number}. {props.caption}
      </figcaption>
    </figure>
  );
}
