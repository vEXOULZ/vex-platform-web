import { describe, expect, it } from 'vitest'
import { bytes } from '../src'

describe('bytes', () => {
  it('uses binary units, one decimal under 10, whole numbers from 10', () => {
    expect([0, 512, 1023].map(bytes)).toEqual(['0 B', '512 B', '1023 B'])
    expect([1024, 1536, 10 * 1024, 1048576].map(bytes)).toEqual(['1 KB', '1.5 KB', '10 KB', '1 MB'])
    expect([1288490188, 4294967296, 19756849561].map(bytes)).toEqual(['1.2 GB', '4 GB', '18 GB'])
    expect(bytes(3 * 1024 ** 4)).toBe('3 TB')
    expect(bytes(2048 * 1024 ** 4)).toBe('2048 TB')
  })

  it('carries a rounded-up value to the next unit', () => {
    expect(bytes(1024 * 1024 - 1)).toBe('1 MB')
    expect(bytes(9.97 * 1024)).toBe('10 KB')
  })

  it('shows a dash for nothing and keeps the sign', () => {
    expect([null, undefined, NaN].map(bytes)).toEqual(['—', '—', '—'])
    expect(bytes(-1536)).toBe('-1.5 KB')
  })
})
