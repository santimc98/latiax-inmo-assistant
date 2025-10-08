/* eslint-disable no-console */
import "dotenv/config";
import readline from "readline";
import chalk from "chalk";
import { NLUService } from "../nlu/nlu.service";
import { PropertiesRepository, Property } from "../data/properties.repository";
import { SearchService } from "../search/search.service";
import { listingCaption } from "../whatsapp/caption";

async function bootstrap(): Promise<void> {
  const csvPath = process.env.CANONICAL_CSV_PATH;
  if (!csvPath) {
    console.error(chalk.red("ERROR: CANONICAL_CSV_PATH no esta configurado. Actualiza tu .env."));
    process.exit(1);
  }

  const llmConfigured = Boolean(process.env.LLM_API_KEY && process.env.LLM_BASE_URL);
  if (!llmConfigured) {
    console.error(chalk.red("ERROR: LLM no configurado. Define LLM_BASE_URL y LLM_API_KEY en tu .env."));
    process.exit(1);
  }

  const repository = new PropertiesRepository(csvPath);
  try {
    repository.load();
  } catch (error) {
    console.error(chalk.red(error instanceof Error ? error.message : String(error)));
    process.exit(1);
  }

  const searchService = new SearchService(repository);
  const nluService = new NLUService();

  console.log(chalk.cyan(`Loaded ${repository.all().length} listings from ${csvPath}`));
  console.log(chalk.green("Escribe tu mensaje (q para salir):"));
  prompt();

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    terminal: true,
  });

  rl.on("close", () => {
    console.log(chalk.gray("\nFin de la simulacion."));
    process.exit(0);
  });

  for await (const line of rl) {
    const text = line.trim();
    if (!text) {
      prompt();
      continue;
    }
    if (text.toLowerCase() === "q") {
      rl.close();
      break;
    }

    try {
      const plan = await nluService.planFromUserText(text);
      console.log(chalk.gray("Plan NLU:"), plan);

      switch (plan.intent) {
        case "GET_BY_ID": {
          if (!plan.listing_id) {
            console.log(chalk.yellow("Falta la referencia del inmueble."));
            break;
          }
          const match = searchService.getById(plan.listing_id);
          if (!match) {
            console.log(chalk.yellow("No se encontro la referencia solicitada."));
            break;
          }
          showListing(match);
          break;
        }
        case "PHOTOS_MORE": {
          if (!plan.listing_id) {
            console.log(chalk.yellow("Falta la referencia para las fotos."));
            break;
          }
          const listing = searchService.getById(plan.listing_id);
          if (!listing) {
            console.log(chalk.yellow("No se encontro la referencia solicitada."));
            break;
          }
          showPhotos(listing, plan.result_count ?? 10);
          break;
        }
        case "SEARCH": {
          const count = Math.max(1, plan.result_count ?? 3);
          const matches = searchService.search(plan.filters, count);
          if (!matches.length) {
            console.log(chalk.yellow("Sin resultados con esos filtros."));
            break;
          }
          matches.forEach((item) => showListing(item));
          break;
        }
        default: {
          if (plan.clarification) {
            console.log(chalk.yellow("Faltan datos:"), plan.clarification.questions.join(" | "));
          } else {
            console.log(chalk.yellow(`Intent ${plan.intent} no implementado en el simulador.`));
          }
        }
      }
    } catch (error) {
      console.error(chalk.red(error instanceof Error ? error.message : String(error)));
    }

    prompt();
  }

  function showListing(property: Property): void {
    const imageLine = property.primary_image_url
      ? chalk.blue(`[imagen] ${property.primary_image_url}`)
      : chalk.gray("[sin imagen]");
    console.log(imageLine);
    console.log(listingCaption(property));
    const photoCount = Number(property.photo_count ?? 0);
    if (photoCount > 1) {
      console.log(chalk.gray(`(+${photoCount - 1} fotos adicionales)`));
    }
  }

  function showPhotos(property: Property, count: number): void {
    const limit = count && count > 0 ? count : 10;
    const urls = String(property.photos ?? "")
      .split("|")
      .map((url) => url.trim())
      .filter(Boolean)
      .slice(0, limit);
    if (!urls.length) {
      console.log(chalk.gray("Sin fotos adicionales."));
      return;
    }
    urls.forEach((url, index) => {
      console.log(chalk.blue(`[image ${index + 1}] ${url}`));
    });
  }

  function prompt(): void {
    process.stdout.write(chalk.green("> "));
  }
}

bootstrap().catch((error) => {
  console.error(chalk.red(error instanceof Error ? error.message : String(error)));
  process.exit(1);
});
