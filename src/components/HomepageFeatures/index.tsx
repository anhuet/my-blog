import type {ReactNode} from 'react';
import clsx from 'clsx';
import Heading from '@theme/Heading';
import styles from './styles.module.css';

type FeatureItem = {
  title: string;
  description: ReactNode;
};

const FeatureList: FeatureItem[] = [
  {
    title: 'Support Me',
    description: (
      <>
        Give me a star at here{' '}
        <a href="https://github.com/anhuet/my-blog" target="_blank" rel="noopener noreferrer">
          GitHub
        </a>
      </>
    ),
  },
  {
    title: 'About Me',
    description: (
      <>A developer who loves learning and sharing.</>
    ),
  },
  {
    title: 'Contact Me',
    description: (
      <>
        GitHub:{' '}
        <a href="https://github.com/anhuet" target="_blank" rel="noopener noreferrer">
          anhuet
        </a>
      </>
    ),
  },
];

function Feature({title, description}: FeatureItem) {
  return (
    <div className={clsx('col col--4')}>
      <div className="text--center padding-horiz--md">
        <Heading as="h3">{title}</Heading>
        <p>{description}</p>
      </div>
    </div>
  );
}

export default function HomepageFeatures(): ReactNode {
  return (
    <section className={styles.features}>
      <div className="container">
        <div className="row">
          {FeatureList.map((props, idx) => (
            <Feature key={idx} {...props} />
          ))}
        </div>
      </div>
    </section>
  );
}
