import {z, defineCollection} from "astro:content";

const articlesCollection = defineCollection({
    schema: z.object({
        title: z.string(),
        description: z.string(),
        date: z.string(),
        logo: z.string(),
        path: z.string(),
    }),
});

const projectCollection = defineCollection({
    schema: z.object({
        title: z.string(),
        description: z.string(),
        date: z.string(),
        logo: z.string(),
        path: z.string(),
    }),
});

const portfolioCollection = defineCollection({
    schema: z.object({
        title: z.string(),
        description: z.string(),
        date: z.string(),
        logo: z.string(),
        path: z.string(),
    }),
});

export const collections = {
    'articles': articlesCollection,
    'projects': projectCollection,
    'portfolio': portfolioCollection,
};