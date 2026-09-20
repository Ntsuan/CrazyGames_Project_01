import { expect, test } from 'vitest';
import { format, check } from 'prettier';
test('TypeScript tooling formats and validates code', async () => {
  const result = await format('const count:number=1', { parser: 'typescript' });
  expect(await check(result, { parser: 'typescript' })).toBe(true);
  expect(result).toContain('count: number');
});
