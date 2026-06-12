import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { MemoryRepository } from "./memoryRepository.js";

export class JsonFileRepository extends MemoryRepository {
  constructor(filePath) {
    super();
    this.filePath = filePath;
  }

  static async open(filePath) {
    const repository = new JsonFileRepository(filePath);
    try {
      const raw = await readFile(filePath, "utf8");
      repository.state = JSON.parse(raw);
      repository.state.users ??= [];
      repository.state.battles ??= [];
      repository.state.entries ??= [];
      repository.state.verdicts ??= [];
      repository.state.settlements ??= [];
      repository.state.judgingRules ??= [];
      repository.state.reports ??= [];
    } catch (error) {
      if (error.code !== "ENOENT") {
        throw error;
      }
    }
    return repository;
  }

  async afterMutation() {
    await mkdir(dirname(this.filePath), { recursive: true });
    await writeFile(this.filePath, JSON.stringify(this.state, null, 2));
  }
}
