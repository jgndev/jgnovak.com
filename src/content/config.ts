import {defineCollection, z} from "astro:content";

// export const projectCollection = defineCollection({
const articles = defineCollection({
    schema: z.object({
        title: z.string(),
        description: z.string(),
        date: z.string(),
        logo: z.string(),
        path: z.string(),
        shortPath: z.string(),
    }),
});
export const collections = {articles};

