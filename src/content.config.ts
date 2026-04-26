import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';

const make = (dir: string) =>
  defineCollection({
    loader: glob({ pattern: '**/*.md', base: `./src/content/${dir}` }),
  });

export const collections = {
  algo: make('algo'),
  games: make('games'),
  life: make('life'),
  lit: make('lit'),
  misc: make('misc'),
};
