import { describe, it, expect } from 'vitest'
import { getErrorMessage } from '@/lib/utils'

describe('getErrorMessage', () => {
  it('should extract message from Error instance', () => {
    const error = new Error('Test error message')
    expect(getErrorMessage(error)).toBe('Test error message')
  })

  it('should return string error directly', () => {
    expect(getErrorMessage('String error')).toBe('String error')
  })

  it('should extract message from object with message property', () => {
    const error = { message: 'Object error message' }
    expect(getErrorMessage(error)).toBe('Object error message')
  })

  it('should return default message for null', () => {
    expect(getErrorMessage(null)).toBe('Une erreur est survenue')
  })

  it('should return default message for undefined', () => {
    expect(getErrorMessage(undefined)).toBe('Une erreur est survenue')
  })

  it('should return default message for numbers', () => {
    expect(getErrorMessage(42)).toBe('Une erreur est survenue')
  })

  it('should return default message for empty objects', () => {
    expect(getErrorMessage({})).toBe('Une erreur est survenue')
  })

  it('should handle nested Error cause', () => {
    const error = new Error('Outer error')
    expect(getErrorMessage(error)).toBe('Outer error')
  })

  it('should convert numeric message to string', () => {
    const error = { message: 123 }
    expect(getErrorMessage(error)).toBe('123')
  })
})
