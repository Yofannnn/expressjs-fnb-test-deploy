import { IdGeneratorPort } from "@/application/ports/driven/id-generator.port";

export class IdGeneratorAdapter implements IdGeneratorPort {
  generate(): string {
    return crypto.randomUUID();
  }
}
