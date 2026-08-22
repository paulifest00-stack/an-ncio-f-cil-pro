import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { Listing, ListingSection, ProductInput } from "./types";

const productInputSchema = z.object({
  photoDataUrl: z.string().min(10),
  basicName: z.string().min(1),
  brand: z.string().optional(),
  ean: z.string().optional(),
  category: z.string().optional(),
  cost: z.string().optional(),
  weight: z.string().optional(),
  dimensions: z.string().optional(),
  units: z.string().optional(),
  packaging: z.string().optional(),
  other: z.string().optional(),
});

export const generateListing = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => productInputSchema.parse(data))
  .handler(async ({ data }) => {
    const { buildListing } = await import("./listing.server");
    return buildListing(data as ProductInput);
  });

export const regenerateSection = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) =>
    z
      .object({
        section: z.enum([
          "sku",
          "nomeInterno",
          "tituloMercadoLivre",
          "descricao",
          "palavrasChave",
          "fichaTecnica",
          "imagens",
        ]),
        input: productInputSchema,
        listing: z.any(),
      })
      .parse(data),
  )
  .handler(async ({ data }) => {
    const { regenerate } = await import("./listing.server");
    return regenerate(
      data.section as ListingSection,
      data.input as ProductInput,
      data.listing as Listing,
    );
  });

export const generateAdImage = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) =>
    z.object({ prompt: z.string().min(5), photoDataUrl: z.string().min(10) }).parse(data),
  )
  .handler(async ({ data }) => {
    const { renderAdImage } = await import("./listing.server");
    return renderAdImage(data.prompt, data.photoDataUrl);
  });
