export class SurrogateKeyStore {
  apiCalls: { url: string; statusCode: number; surrogateKeys: string[] }[] = [];
  surrogateKeys: Set<string> = new Set();

  handleApiResponse(response: Response) {
    const surrogateKeyHeader = response.headers.get('surrogate-key');
    const url = response.url;
    const statusCode = response.status;
    const surrogateKeys = surrogateKeyHeader
      ? surrogateKeyHeader.split(' ').filter(Boolean)
      : [];
    this.apiCalls.push({ url, statusCode, surrogateKeys });
    surrogateKeys.forEach(key => this.surrogateKeys.add(key));
  }

  getSurrogateKeys(): string[] {
    return Array.from(this.surrogateKeys);
  }
}
