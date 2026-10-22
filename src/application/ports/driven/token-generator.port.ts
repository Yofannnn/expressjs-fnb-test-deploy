export interface TokenGeneratorPort {
  generate(length?: number): string;
}
